import { useState } from 'react';
import { Film, Menu } from 'lucide-react';
import { CreateProjectModal } from './components/dashboard/CreateProjectModal';
import { ProjectDashboard } from './components/dashboard/ProjectDashboard';
import { OfflineBanner } from './components/layout/OfflineBanner';
import { Sidebar } from './components/layout/Sidebar';
import { ProjectWorkspace } from './components/workspace/ProjectWorkspace';
import { useStudioState } from './hooks/useStudioState';

export default function App() {
  const studio = useStudioState();
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#E6E9EF] flex flex-col lg:flex-row">
      <Sidebar
        projects={studio.projects}
        selectedSlug={studio.selectedSlug}
        backendOffline={studio.backendOffline}
        isLoading={studio.projectsLoading}
        isOpenMobile={sidebarOpenMobile}
        onCloseMobile={() => setSidebarOpenMobile(false)}
        onSelectDashboard={studio.backToDashboard}
        onSelectProject={(slug) => studio.openProject(slug)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onRetryConnection={studio.retryConnection}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact responsive header for tablet/mobile drawer trigger */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/[0.08] bg-[#101319]/95 px-4 py-3 backdrop-blur-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpenMobile(true)}
              className="rounded-lg border border-white/[0.1] p-2 text-slate-300 hover:bg-white/[0.06] hover:text-white"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500 text-[#0B0D11]">
                <Film className="h-3.5 w-3.5" />
              </span>
              <span className="font-display text-sm font-semibold text-white truncate">
                Layar2D Studio
              </span>
            </div>
          </div>

          {!studio.backendOffline && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-[#0B0D11] hover:bg-amber-400 whitespace-nowrap shrink-0"
            >
              Proyek Baru
            </button>
          )}
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
          {studio.backendOffline && (
            <OfflineBanner
              onRetry={studio.retryConnection}
              isRetrying={studio.projectsLoading || studio.detailLoading}
            />
          )}

          {studio.selectedSlug === null ? (
            <ProjectDashboard
              projects={studio.projects}
              loading={studio.projectsLoading}
              error={studio.projectsError}
              backendOffline={studio.backendOffline}
              onRetry={studio.retryConnection}
              onOpenCreateModal={() => setCreateModalOpen(true)}
              onOpenProject={studio.openProject}
            />
          ) : (
            <ProjectWorkspace
              slug={studio.selectedSlug}
              project={studio.projectDetail}
              loading={studio.detailLoading}
              error={studio.detailError}
              activeTab={studio.activeTab}
              styles={studio.styles}
              stylesLoading={studio.stylesLoading}
              stylesError={studio.stylesError}
              trackedJob={studio.trackedJob}
              jobHistory={studio.jobHistory}
              pollError={studio.pollError}
              isLocked={studio.isProjectLocked}
              onChangeTab={studio.setActiveTab}
              onBackToDashboard={studio.backToDashboard}
              onReloadProject={studio.loadProjectDetail}
              onReloadStyles={studio.loadStyles}
              onProjectUpdated={studio.setProjectDetail}
              onRegisterJob={studio.registerStartedJob}
              onSelectJob={studio.setTrackedJob}
            />
          )}
        </main>
      </div>

      <CreateProjectModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={async (payload) => {
          await studio.createNewProject(payload);
        }}
      />
    </div>
  );
}
