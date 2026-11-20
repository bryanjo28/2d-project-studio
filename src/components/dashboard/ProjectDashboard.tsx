import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Clapperboard,
  FolderPlus,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { ProjectSummary, WorkspaceTab } from '../../types/studio';
import {
  formatDateTime,
  getJobStatusLabel,
  getJobTypeLabel,
  isJobActive,
} from '../../utils/format';

interface ProjectDashboardProps {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  backendOffline: boolean;
  onRetry: () => void;
  onOpenCreateModal: () => void;
  onOpenProject: (slug: string, initialTab?: WorkspaceTab) => void;
}

export function ProjectDashboard({
  projects,
  loading,
  error,
  backendOffline,
  onRetry,
  onOpenCreateModal,
  onOpenProject,
}: ProjectDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Header & Primary Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Dashboard Proyek Studio
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Kelola proyek animasi 2D lokal, pantau status kesiapan scene, dan buka workspace produksi.
            Untuk mencoba proses render langsung tanpa membuat kode scene baru, pilih template demo saat
            membuat proyek.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-[#141821] px-3.5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/[0.06] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            disabled={backendOffline}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#0B0D11] hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Proyek Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul atau slug proyek..."
            className="w-full rounded-lg border border-white/[0.08] bg-[#12161E] pl-9 pr-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="text-xs text-slate-400 tabular-nums">
          Menampilkan {filteredProjects.length} dari {projects.length} proyek
        </div>
      </div>

      {/* Non-offline API Error */}
      {error && !backendOffline && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 text-sm text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-lg bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.15]"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && projects.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="h-48 rounded-xl border border-white/[0.08] bg-[#12161E] p-5 animate-pulse"
            >
              <div className="h-5 w-2/3 rounded bg-white/[0.06]" />
              <div className="mt-2 h-3.5 w-1/3 rounded bg-white/[0.04]" />
              <div className="mt-8 h-3.5 w-full rounded bg-white/[0.04]" />
              <div className="mt-2 h-3.5 w-3/4 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-[#11151D] px-6 py-16 text-center">
          <Clapperboard className="h-10 w-10 text-slate-500 mb-3" />
          <h2 className="font-display text-lg font-medium text-white">
            {projects.length === 0
              ? 'Belum Ada Proyek Animasi'
              : 'Tidak Ada Proyek yang Cocok'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 max-w-md">
            {projects.length === 0
              ? 'Buat proyek baru dengan template kosong atau gunakan template demo untuk menguji render dari awal hingga hasil video.'
              : 'Ubah kata kunci pencarian untuk melihat proyek lainnya.'}
          </p>
          {projects.length === 0 && !backendOffline && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0B0D11] hover:bg-amber-400 transition-colors"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Buat Proyek Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const activeOrLast = project.active_job ?? project.last_job;
            const jobRunning = isJobActive(project.active_job?.status);
            const cfg = project.config;

            return (
              <div
                key={project.slug}
                className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#12161E] p-5 transition-colors hover:border-white/[0.18]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-semibold text-white truncate">
                        {project.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="truncate">{project.slug}</span>
                        {project.template && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans text-slate-400">
                              Template {project.template === 'demo' ? 'Demo' : 'Kosong'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {jobRunning && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 shrink-0">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Render</span>
                      </span>
                    )}
                  </div>

                  {/* Config & Status summary as clean tabular rows without pill clutter */}
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4 text-xs">
                    <div>
                      <dt className="text-slate-500">Format Video</dt>
                      <dd className="mt-0.5 font-mono text-slate-200 tabular-nums">
                        {cfg?.aspect_ratio ?? '16:9'} · {cfg?.resolution ?? '1080p'} ·{' '}
                        {cfg?.fps ?? 30} fps
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Style & Captions</dt>
                      <dd className="mt-0.5 text-slate-200 truncate">
                        {cfg?.style || 'Default'} · {cfg?.captions ? 'Captions aktif' : 'Tanpa captions'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Kesiapan Proyek</dt>
                      <dd className="mt-0.5 text-slate-200">
                        {project.has_scene === true
                          ? 'Scene siap'
                          : project.has_scene === false
                            ? 'Scene belum ada'
                            : project.status || 'Siap disunting'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Job Terakhir</dt>
                      <dd className="mt-0.5 text-slate-200 truncate">
                        {activeOrLast
                          ? `${getJobTypeLabel(activeOrLast.type)} (${getJobStatusLabel(activeOrLast.status)})`
                          : 'Belum ada job'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                  <span className="text-xs text-slate-500 tabular-nums">
                    {project.updated_at ? `Diubah ${formatDateTime(project.updated_at)}` : 'Proyek lokal'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onOpenProject(project.slug)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
                  >
                    <span>Buka Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
