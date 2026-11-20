export type ProjectTemplate = 'empty' | 'demo';

export type AssetCategory = 'character' | 'background' | 'prop' | 'narration' | 'script';

export type AspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p' | '1440p' | '2160p';
export type VideoFps = 24 | 30;

export interface VideoConfig {
  aspect_ratio: AspectRatio;
  resolution: VideoResolution;
  fps: VideoFps;
  captions: boolean;
  style: string;
  [key: string]: unknown;
}

export interface StyleOption {
  id: string;
  name: string;
  description?: string;
}

export interface AssetItem {
  id?: string;
  name: string;
  path: string;
  category: AssetCategory;
  size: number;
  url: string;
  mime_type?: string;
  created_at?: string;
}

export interface ShotItem {
  id: string;
  start: number;
  end: number;
  line: string;
  scene_description: string;
  [key: string]: unknown;
}

export interface StoryData {
  storyline: string;
  duration: number;
  shots: ShotItem[];
  [key: string]: unknown;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type JobType = 'contact_sheet' | 'preview' | 'render' | 'mix_audio';

export interface ArtifactItem {
  name: string;
  kind: 'contact_sheet' | 'video' | 'image' | 'audio' | string;
  url: string;
  path?: string;
  size?: number;
  mime_type?: string;
  created_at?: string;
}

export interface RenderJob {
  id: string;
  project_slug: string;
  type: JobType | string;
  status: JobStatus;
  logs: string[];
  error?: string | null;
  message?: string | null;
  artifacts: ArtifactItem[];
  created_at?: string;
  started_at?: string;
  finished_at?: string;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  template?: ProjectTemplate | string;
  status?: string;
  has_scene?: boolean;
  has_story?: boolean;
  has_narration?: boolean;
  has_full_render?: boolean;
  config?: Partial<VideoConfig>;
  active_job?: RenderJob | null;
  last_job?: RenderJob | null;
  updated_at?: string;
  created_at?: string;
}

export interface ProjectDetail extends ProjectSummary {
  config: VideoConfig;
  story?: StoryData | null;
  assets?: AssetItem[];
  jobs?: RenderJob[];
  artifacts?: ArtifactItem[];
}

export interface CreateProjectPayload {
  slug: string;
  title: string;
  template: ProjectTemplate;
}

export interface PreviewJobPayload {
  start: number;
  end: number;
  scale: number;
}

export type WorkspaceTab = 'assets' | 'story' | 'config' | 'render' | 'results';
