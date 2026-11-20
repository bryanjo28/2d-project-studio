import type { AssetCategory, JobStatus, JobType, ShotItem, StoryData } from '../types/studio';

export const SLUG_PATTERN = /^[a-z0-9_-]+$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function suggestSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

export function formatBytes(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(2)} MB`;
  }
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0.0 dtk';
  return `${seconds.toFixed(2).replace(/\.00$/, '')} dtk`;
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  character: 'Karakter',
  background: 'Latar',
  prop: 'Properti',
  narration: 'Narasi (Audio)',
  script: 'Naskah',
};

export const ASSET_CATEGORY_ACCEPT: Record<AssetCategory, string> = {
  character: 'image/*,.png,.jpg,.jpeg,.webp,.svg',
  background: 'image/*,.png,.jpg,.jpeg,.webp,.svg',
  prop: 'image/*,.png,.jpg,.jpeg,.webp,.svg',
  narration: 'audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac',
  script: '.txt,.md,.json,.fdx,.pdf,.docx',
};

export function getJobTypeLabel(type: JobType | string): string {
  switch (type) {
    case 'contact_sheet':
    case 'contact-sheet':
      return 'Contact Sheet';
    case 'preview':
      return 'Preview Segmen';
    case 'render':
    case 'full_render':
    case 'full-render':
      return 'Render Penuh (Silent)';
    case 'mix_audio':
    case 'mix-audio':
      return 'Campur Audio';
    default:
      return type;
  }
}

export function getJobStatusLabel(status: JobStatus | string): string {
  switch (status) {
    case 'queued':
      return 'Antrean (Queued)';
    case 'running':
      return 'Berjalan (Running)';
    case 'succeeded':
      return 'Berhasil (Succeeded)';
    case 'failed':
      return 'Gagal (Failed)';
    default:
      return status;
  }
}

export function isJobActive(status?: JobStatus | string | null): boolean {
  return status === 'queued' || status === 'running';
}

export interface StoryValidationResult {
  valid: boolean;
  errors: string[];
  shotErrors: Record<number, string[]>;
  computedDuration: number;
}

export function validateStory(story: StoryData): StoryValidationResult {
  const errors: string[] = [];
  const shotErrors: Record<number, string[]> = {};
  const shots: ShotItem[] = Array.isArray(story.shots) ? story.shots : [];
  const seenIds = new Set<string>();

  const addShotError = (index: number, msg: string) => {
    if (!shotErrors[index]) shotErrors[index] = [];
    shotErrors[index].push(msg);
  };

  if (shots.length === 0) {
    if (story.duration !== 0) {
      errors.push('Jika belum ada shot, duration harus bernilai 0.');
    }
    return {
      valid: errors.length === 0,
      errors,
      shotErrors,
      computedDuration: 0,
    };
  }

  shots.forEach((shot, index) => {
    const trimmedId = (shot.id ?? '').trim();
    if (!trimmedId) {
      addShotError(index, 'ID shot wajib diisi.');
    } else if (seenIds.has(trimmedId)) {
      addShotError(index, `ID shot "${trimmedId}" duplikat. Setiap shot harus memiliki ID unik.`);
    } else {
      seenIds.add(trimmedId);
    }

    if (!Number.isFinite(shot.start) || !Number.isFinite(shot.end)) {
      addShotError(index, 'Nilai start dan end harus berupa angka valid.');
      return;
    }

    if (shot.start < 0) {
      addShotError(index, 'Waktu start tidak boleh negatif.');
    }

    if (shot.end <= shot.start) {
      addShotError(index, 'Durasi harus positif (end harus lebih besar dari start).');
    }

    if (index === 0) {
      if (Math.abs(shot.start - 0) > 1e-6) {
        addShotError(index, 'Shot pertama harus dimulai tepat pada detik 0.');
      }
    } else {
      const prev = shots[index - 1];
      if (Number.isFinite(prev.end) && Math.abs(shot.start - prev.end) > 1e-6) {
        addShotError(
          index,
          `Shot harus berurutan tanpa celah (start harus sama dengan end shot sebelumnya: ${prev.end}).`
        );
      }
    }
  });

  const lastShot = shots[shots.length - 1];
  const expectedDuration = Number.isFinite(lastShot?.end) ? lastShot.end : 0;

  if (!Number.isFinite(story.duration) || Math.abs(story.duration - expectedDuration) > 1e-6) {
    errors.push(
      `Total duration cerita (${story.duration}) harus sama dengan waktu end shot terakhir (${expectedDuration}).`
    );
  }

  const hasShotErrors = Object.keys(shotErrors).length > 0;
  if (hasShotErrors) {
    errors.unshift('Terdapat kesalahan validasi pada tabel shot. Periksa baris yang ditandai.');
  }

  return {
    valid: errors.length === 0 && !hasShotErrors,
    errors,
    shotErrors,
    computedDuration: expectedDuration,
  };
}
