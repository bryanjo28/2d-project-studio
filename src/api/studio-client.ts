import type {
  ArtifactItem,
  AssetCategory,
  AssetItem,
  CreateProjectPayload,
  JobStatus,
  JobType,
  PreviewJobPayload,
  ProjectDetail,
  ProjectSummary,
  RenderJob,
  ShotItem,
  StoryData,
  StyleOption,
  VideoConfig,
} from '../types/studio';

/**
 * Kontrak klien API untuk backend studio animasi 2D lokal.
 * URL dasar diambil dari VITE_STUDIO_API_URL (default: http://127.0.0.1:8000).
 *
 * Catatan integrasi:
 * Seluruh pemetaan endpoint REST dipusatkan di modul ini agar mudah disesuaikan
 * atau diganti langsung dengan studio-client.ts / openapi.json dari repositori lokal Anda.
 */
export const DEFAULT_STUDIO_API_URL = 'http://127.0.0.1:8000';

export function getStudioApiBaseUrl(): string {
  const raw = import.meta.env.VITE_STUDIO_API_URL as string | undefined;
  const trimmed = (raw || DEFAULT_STUDIO_API_URL).trim();
  return trimmed.replace(/\/+$/, '');
}

export function resolveBackendUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl) || /^blob:/i.test(pathOrUrl) || /^data:/i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const base = getStudioApiBaseUrl();
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${normalizedPath}`;
}

export class StudioApiError extends Error {
  status: number;
  detail: string;
  isOffline: boolean;

  constructor(message: string, status = 0, detail = '', isOffline = false) {
    super(message);
    this.name = 'StudioApiError';
    this.status = status;
    this.detail = detail || message;
    this.isOffline = isOffline;
  }
}

export function isOfflineError(err: unknown): boolean {
  if (err instanceof StudioApiError) return err.isOffline;
  if (err instanceof TypeError) return true;
  return false;
}

async function parseErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      if (typeof payload?.detail === 'string') return payload.detail;
      if (Array.isArray(payload?.detail)) {
        return payload.detail
          .map((item: { msg?: string; loc?: unknown[] }) => item.msg || JSON.stringify(item))
          .join('; ');
      }
      if (typeof payload?.message === 'string') return payload.message;
      if (typeof payload?.error === 'string') return payload.error;
      return JSON.stringify(payload);
    }
    const text = await response.text();
    return text || `HTTP ${response.status} ${response.statusText}`;
  } catch {
    return `HTTP ${response.status} ${response.statusText}`;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveBackendUrl(path);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers || {}),
      },
    });
  } catch {
    throw new StudioApiError(
      `Tidak dapat terhubung ke backend studio di ${getStudioApiBaseUrl()}.`,
      0,
      'Pastikan server API lokal berjalan.',
      true
    );
  }

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new StudioApiError(detail, response.status, detail, false);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizeJob(raw: any, fallbackSlug = ''): RenderJob {
  const rawLogs = raw?.logs ?? raw?.log ?? [];
  const logs = Array.isArray(rawLogs)
    ? rawLogs.map((l) => String(l))
    : typeof rawLogs === 'string'
      ? rawLogs.split(/\r?\n/).filter((line) => line.length > 0)
      : [];

  const rawArtifacts = Array.isArray(raw?.artifacts) ? raw.artifacts : [];
  const artifacts: ArtifactItem[] = rawArtifacts.map((art: any) => ({
    name: art?.name || art?.filename || art?.path?.split('/').pop() || 'artifact',
    kind: art?.kind || art?.type || inferArtifactKind(art?.url || art?.path || art?.name || ''),
    url: art?.url || art?.path || '',
    path: art?.path,
    size: typeof art?.size === 'number' ? art.size : undefined,
    mime_type: art?.mime_type || art?.content_type,
    created_at: art?.created_at,
  }));

  return {
    id: String(raw?.id ?? raw?.job_id ?? ''),
    project_slug: String(raw?.project_slug ?? raw?.slug ?? fallbackSlug),
    type: (raw?.type ?? raw?.kind ?? raw?.job_type ?? 'render') as JobType,
    status: (raw?.status ?? 'queued') as JobStatus,
    logs,
    error: raw?.error ?? null,
    message: raw?.message ?? null,
    artifacts,
    created_at: raw?.created_at,
    started_at: raw?.started_at,
    finished_at: raw?.finished_at,
  };
}

function inferArtifactKind(nameOrUrl: string): string {
  const lower = nameOrUrl.toLowerCase();
  if (lower.includes('contact') && /\.(png|jpe?g|webp)$/i.test(lower)) return 'contact_sheet';
  if (/\.(mp4|webm|mov|mkv)$/i.test(lower)) return 'video';
  if (/\.(png|jpe?g|webp|gif)$/i.test(lower)) return 'contact_sheet';
  if (/\.(mp3|wav|ogg|m4a)$/i.test(lower)) return 'audio';
  return 'file';
}

function normalizeAsset(raw: any): AssetItem {
  const pathVal = raw?.path || raw?.file_path || raw?.url || raw?.name || '';
  const nameVal = raw?.name || raw?.filename || pathVal.split('/').pop() || 'aset';
  return {
    id: raw?.id ? String(raw.id) : undefined,
    name: nameVal,
    path: pathVal,
    category: (raw?.category ?? raw?.type ?? 'prop') as AssetCategory,
    size: typeof raw?.size === 'number' ? raw.size : Number(raw?.size_bytes ?? 0),
    url: raw?.url || pathVal,
    mime_type: raw?.mime_type || raw?.content_type,
    created_at: raw?.created_at,
  };
}

function normalizeStory(raw: any): StoryData {
  if (!raw || typeof raw !== 'object') {
    return { storyline: '', duration: 0, shots: [] };
  }
  const shots: ShotItem[] = Array.isArray(raw.shots)
    ? raw.shots.map((s: any, idx: number) => ({
        ...s,
        id: String(s?.id ?? `shot-${idx + 1}`),
        start: Number(s?.start ?? 0),
        end: Number(s?.end ?? 0),
        line: String(s?.line ?? s?.narration ?? ''),
        scene_description: String(s?.scene_description ?? s?.description ?? ''),
      }))
    : [];

  return {
    ...raw,
    storyline: String(raw?.storyline ?? raw?.synopsis ?? ''),
    duration: Number(raw?.duration ?? (shots.length > 0 ? shots[shots.length - 1].end : 0)),
    shots,
  };
}

function normalizeConfig(raw: any): VideoConfig {
  const cfg = raw?.config && typeof raw.config === 'object' ? raw.config : raw || {};
  return {
    ...cfg,
    aspect_ratio: cfg?.aspect_ratio === '9:16' ? '9:16' : '16:9',
    resolution: (['720p', '1080p', '1440p', '2160p'].includes(cfg?.resolution)
      ? cfg.resolution
      : '1080p') as VideoConfig['resolution'],
    fps: cfg?.fps === 24 ? 24 : 30,
    captions: Boolean(cfg?.captions),
    style: String(cfg?.style ?? ''),
  };
}

function normalizeProjectSummary(raw: any): ProjectSummary {
  const slug = String(raw?.slug ?? raw?.id ?? '');
  return {
    slug,
    title: String(raw?.title ?? raw?.name ?? slug),
    template: raw?.template,
    status: raw?.status,
    has_scene: typeof raw?.has_scene === 'boolean' ? raw.has_scene : undefined,
    has_story: typeof raw?.has_story === 'boolean' ? raw.has_story : undefined,
    has_narration: typeof raw?.has_narration === 'boolean' ? raw.has_narration : undefined,
    has_full_render: typeof raw?.has_full_render === 'boolean' ? raw.has_full_render : undefined,
    config: raw?.config ? normalizeConfig(raw.config) : undefined,
    active_job: raw?.active_job ? normalizeJob(raw.active_job, slug) : null,
    last_job: raw?.last_job ? normalizeJob(raw.last_job, slug) : null,
    updated_at: raw?.updated_at,
    created_at: raw?.created_at,
  };
}

function normalizeProjectDetail(raw: any): ProjectDetail {
  const summary = normalizeProjectSummary(raw);
  const assets = Array.isArray(raw?.assets) ? raw.assets.map(normalizeAsset) : undefined;
  const jobs = Array.isArray(raw?.jobs) ? raw.jobs.map((j: any) => normalizeJob(j, summary.slug)) : undefined;
  const artifacts = Array.isArray(raw?.artifacts)
    ? raw.artifacts.map((art: any) => ({
        name: art?.name || art?.filename || art?.path?.split('/').pop() || 'artifact',
        kind: art?.kind || art?.type || inferArtifactKind(art?.url || art?.path || art?.name || ''),
        url: art?.url || art?.path || '',
        path: art?.path,
        size: typeof art?.size === 'number' ? art.size : undefined,
        mime_type: art?.mime_type || art?.content_type,
        created_at: art?.created_at,
      }))
    : undefined;

  return {
    ...summary,
    config: normalizeConfig(raw?.config),
    story: raw?.story ? normalizeStory(raw.story) : undefined,
    assets,
    jobs,
    artifacts,
  };
}

export class StudioClient {
  async listProjects(): Promise<ProjectSummary[]> {
    const data = await requestJson<any>('/api/projects');
    const items = Array.isArray(data) ? data : data?.projects ?? data?.items ?? [];
    return items.map(normalizeProjectSummary);
  }

  async createProject(payload: CreateProjectPayload): Promise<ProjectDetail> {
    const data = await requestJson<any>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeProjectDetail(data?.project ?? data);
  }

  async getProject(slug: string): Promise<ProjectDetail> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}`);
    return normalizeProjectDetail(data?.project ?? data);
  }

  async listAssets(slug: string): Promise<AssetItem[]> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/assets`);
    const items = Array.isArray(data) ? data : data?.assets ?? data?.items ?? [];
    return items.map(normalizeAsset);
  }

  async uploadAsset(slug: string, category: AssetCategory, file: File): Promise<AssetItem> {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('file', file);

    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/assets`, {
      method: 'POST',
      body: formData,
    });
    return normalizeAsset(data?.asset ?? data);
  }

  async getStory(slug: string): Promise<StoryData> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/story`);
    return normalizeStory(data?.story ?? data);
  }

  async updateStory(slug: string, story: StoryData): Promise<StoryData> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/story`, {
      method: 'PUT',
      body: JSON.stringify(story),
    });
    return normalizeStory(data?.story ?? data);
  }

  async listStyles(): Promise<StyleOption[]> {
    const data = await requestJson<any>('/api/styles');
    const rawList = Array.isArray(data) ? data : data?.styles ?? data?.items ?? [];
    return rawList.map((item: any) => {
      if (typeof item === 'string') {
        return { id: item, name: item };
      }
      const id = String(item?.id ?? item?.slug ?? item?.value ?? item?.name ?? '');
      return {
        id,
        name: String(item?.name ?? item?.label ?? id),
        description: item?.description ? String(item.description) : undefined,
      };
    });
  }

  async updateConfig(slug: string, config: VideoConfig): Promise<VideoConfig> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return normalizeConfig(data?.config ?? data);
  }

  async startContactSheetJob(slug: string): Promise<RenderJob> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/contact-sheet`, {
      method: 'POST',
    });
    return normalizeJob(data?.job ?? data, slug);
  }

  async startPreviewJob(slug: string, payload: PreviewJobPayload): Promise<RenderJob> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeJob(data?.job ?? data, slug);
  }

  async startFullRenderJob(slug: string): Promise<RenderJob> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/render`, {
      method: 'POST',
    });
    return normalizeJob(data?.job ?? data, slug);
  }

  async startMixAudioJob(slug: string): Promise<RenderJob> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/mix-audio`, {
      method: 'POST',
    });
    return normalizeJob(data?.job ?? data, slug);
  }

  async getJob(jobId: string): Promise<RenderJob> {
    const data = await requestJson<any>(`/api/jobs/${encodeURIComponent(jobId)}`);
    return normalizeJob(data?.job ?? data);
  }

  async listProjectJobs(slug: string): Promise<RenderJob[]> {
    const data = await requestJson<any>(`/api/projects/${encodeURIComponent(slug)}/jobs`);
    const items = Array.isArray(data) ? data : data?.jobs ?? data?.items ?? [];
    return items.map((j: any) => normalizeJob(j, slug));
  }
}

export const studioClient = new StudioClient();
