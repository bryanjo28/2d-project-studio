import { Film, FolderKanban, Loader2, Plus, RefreshCw, ServerOff, X } from 'lucide-react';
import { getStudioApiBaseUrl } from '../../api/studio-client';
import type { ProjectSummary } from '../../types/studio';
import { isJobActive } from '../../utils/format';

interface SidebarProps {
  projects: ProjectSummary[];
  selectedSlug: string | null;
  backendOffline: boolean;
  isLoading: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSelectDashboard: () => void;
  onSelectProject: (slug: string) => void;
  onOpenCreateModal: () => void;
  onRetryConnection: () => void;
}

export function Sidebar({
  projects,
  selectedSlug,
  backendOffline,
  isLoading,
  isOpenMobile,
  onCloseMobile,
  onSelectDashboard,
  onSelectProject,
  onOpenCreateModal,
  onRetryConnection,
}: SidebarProps) {
  const apiUrl = getStudioApiBaseUrl();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#101319] border-r border-white/[0.08] text-[#E6E9EF]">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => {
            onSelectDashboard();
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-[#0B0D11]">
            <Film className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-white whitespace-nowrap">
            Layar2D Studio
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden rounded-md p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
          aria-label="Tutup navigasi"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Primary Nav */}
      <div className="px-3 pt-4 pb-2 space-y-1">
        <button
          type="button"
          onClick={() => {
            onSelectDashboard();
            onCloseMobile();
          }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            selectedSlug === null
              ? 'bg-white/[0.08] text-white'
              : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
          }`}
        >
          <FolderKanban className="h-4 w-4 shrink-0" />
          <span>Dashboard Proyek</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenCreateModal();
            onCloseMobile();
          }}
          disabled={backendOffline}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Buat Proyek Baru</span>
        </button>
      </div>

      {/* Project List */}
      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-medium text-slate-400">Daftar Proyek ({projects.length})</span>
          <button
            type="button"
            onClick={onRetryConnection}
            className="rounded p-1 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
            title="Muat ulang daftar proyek"
            aria-label="Muat ulang daftar proyek"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoading && projects.length === 0 ? (
          <div className="space-y-1.5 px-2 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="px-3 py-4 text-xs text-slate-500 leading-relaxed">
            {backendOffline
              ? 'Daftar proyek belum tersedia saat backend offline.'
              : 'Belum ada proyek di workspace lokal.'}
          </div>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => {
              const isSelected = selectedSlug === project.slug;
              const jobRunning = isJobActive(project.active_job?.status);
              return (
                <li key={project.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProject(project.slug);
                      onCloseMobile();
                    }}
                    className={`group flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-500/12 text-white ring-1 ring-inset ring-amber-500/30'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="truncate text-sm font-medium">{project.title}</span>
                      {jobRunning && (
                        <Loader2
                          className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400"
                          aria-label="Job sedang berjalan"
                        />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 font-mono truncate">
                      <span className="truncate">{project.slug}</span>
                      {project.config?.resolution && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{project.config.resolution}</span>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer Connection Info */}
      <div className="border-t border-white/[0.08] px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">API Lokal</span>
          {backendOffline ? (
            <span className="inline-flex items-center gap-1 text-red-400 font-medium">
              <ServerOff className="h-3.5 w-3.5" />
              Offline
            </span>
          ) : (
            <span className="text-emerald-400 font-medium">Terhubung</span>
          )}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-slate-500" title={apiUrl}>
          {apiUrl}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Tablet / Mobile slide-over drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
