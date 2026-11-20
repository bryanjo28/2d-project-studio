import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Film,
  FolderOpen,
  Lock,
  PlayCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { studioClient } from '../../api/studio-client';
import type {
  AssetCategory,
  AssetItem,
  ProjectDetail,
  RenderJob,
  StoryData,
  StyleOption,
  VideoConfig,
  WorkspaceTab,
} from '../../types/studio';
import { AssetsTab } from './AssetsTab';
import { PreviewRenderTab } from './PreviewRenderTab';
import { ResultsTab } from './ResultsTab';
import { StoryTab } from './StoryTab';
import { VideoSettingsTab } from './VideoSettingsTab';

interface ProjectWorkspaceProps {
  slug: string;
  project: ProjectDetail | null;
  loading: boolean;
  error: string | null;
  activeTab: WorkspaceTab;
  styles: StyleOption[];
  stylesLoading: boolean;
  stylesError: string | null;
  trackedJob: RenderJob | null;
  jobHistory: RenderJob[];
  pollError: string | null;
  isLocked: boolean;
  onChangeTab: (tab: WorkspaceTab) => void;
  onBackToDashboard: () => void;
  onReloadProject: (slug: string) => Promise<void>;
  onReloadStyles: () => void;
  onProjectUpdated: (updater: (prev: ProjectDetail | null) => ProjectDetail | null) => void;
  onRegisterJob: (job: RenderJob) => void;
  onSelectJob: (job: RenderJob) => void;
}

const TABS: { id: WorkspaceTab; label: string; icon: typeof FolderOpen }[] = [
  { id: 'assets', label: 'Aset', icon: FolderOpen },
  { id: 'story', label: 'Cerita', icon: BookOpen },
  { id: 'config', label: 'Pengaturan Video', icon: Sliders },
  { id: 'render', label: 'Preview & Render', icon: PlayCircle },
  { id: 'results', label: 'Hasil', icon: Film },
];

export function ProjectWorkspace({
  slug,
  project,
  loading,
  error,
  activeTab,
  styles,
  stylesLoading,
  stylesError,
  trackedJob,
  jobHistory,
  pollError,
  isLocked,
  onChangeTab,
  onBackToDashboard,
  onReloadProject,
  onReloadStyles,
  onProjectUpdated,
  onRegisterJob,
  onSelectJob,
}: ProjectWorkspaceProps) {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  const [storyData, setStoryData] = useState<StoryData | null>(null);

  const syncSubResources = useCallback(async () => {
    setAssetsLoading(true);
    setAssetsError(null);
    try {
      const [fetchedAssets, fetchedStory] = await Promise.allSettled([
        studioClient.listAssets(slug),
        studioClient.getStory(slug),
      ]);

      if (fetchedAssets.status === 'fulfilled') {
        setAssets(fetchedAssets.value);
      } else if (project?.assets) {
        setAssets(project.assets);
      } else {
        setAssetsError(
          fetchedAssets.reason instanceof Error
            ? fetchedAssets.reason.message
            : 'Gagal memuat daftar aset.'
        );
      }

      if (fetchedStory.status === 'fulfilled') {
        setStoryData(fetchedStory.value);
      } else if (project?.story) {
        setStoryData(project.story);
      }
    } finally {
      setAssetsLoading(false);
    }
  }, [project?.assets, project?.story, slug]);

  useEffect(() => {
    if (project?.assets) setAssets(project.assets);
    if (project?.story) setStoryData(project.story);
  }, [project?.assets, project?.story]);

  useEffect(() => {
    void syncSubResources();
  }, [slug]);

  const handleUploadAsset = async (category: AssetCategory, file: File) => {
    const uploaded = await studioClient.uploadAsset(slug, category, file);
    setAssets((prev) => [uploaded, ...prev]);
    await onReloadProject(slug);
  };

  const handleSaveStory = async (nextStory: StoryData) => {
    const saved = await studioClient.updateStory(slug, nextStory);
    setStoryData(saved);
    onProjectUpdated((prev) => (prev ? { ...prev, story: saved, has_story: true } : prev));
  };

  const handleSaveConfig = async (nextConfig: VideoConfig) => {
    const saved = await studioClient.updateConfig(slug, nextConfig);
    onProjectUpdated((prev) => (prev ? { ...prev, config: saved } : prev));
  };

  if (loading && !project) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-1/2 rounded-lg bg-white/[0.05] animate-pulse" />
        <div className="h-10 w-full rounded-lg bg-white/[0.04] animate-pulse" />
        <div className="h-80 w-full rounded-xl bg-white/[0.03] animate-pulse" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Dashboard Proyek</span>
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => onReloadProject(slug)}
            className="shrink-0 rounded-lg bg-white/[0.1] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.16]"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard Proyek</span>
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-mono text-slate-300 truncate">{project.slug}</span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight text-white truncate">
            {project.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono tabular-nums">
              {project.config.aspect_ratio} · {project.config.resolution} · {project.config.fps} fps
            </span>
            <span aria-hidden="true">·</span>
            <span>Style: {project.config.style || 'Default'}</span>
            <span aria-hidden="true">·</span>
            <span>{project.config.captions ? 'Captions aktif' : 'Tanpa captions'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void onReloadProject(slug);
            void syncSubResources();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-white/[0.1] bg-[#12161E] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Proyek</span>
        </button>
      </div>

      {/* Project Edit Lock Banner while Job runs */}
      {isLocked && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <div className="flex items-center gap-2.5">
            <Lock className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Job sedang berjalan untuk proyek ini. Pengunggahan aset, penyuntingan cerita,
              pengaturan video, dan pemicu render baru dinonaktifkan sementara hingga job selesai.
            </span>
          </div>
          {activeTab !== 'render' && (
            <button
              type="button"
              onClick={() => onChangeTab('render')}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-[#0B0D11] hover:bg-amber-400 whitespace-nowrap"
            >
              Pantau Job
            </button>
          )}
        </div>
      )}

      {/* Workspace Tabs */}
      <nav
        aria-label="Tab Workspace Proyek"
        className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.08] pb-px"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'border-amber-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'assets' && (
          <AssetsTab
            slug={slug}
            assets={assets}
            loading={assetsLoading}
            error={assetsError}
            isLocked={isLocked}
            onRefresh={syncSubResources}
            onUpload={handleUploadAsset}
          />
        )}

        {activeTab === 'story' && (
          <StoryTab
            story={storyData ?? project.story}
            isLocked={isLocked}
            onSave={handleSaveStory}
          />
        )}

        {activeTab === 'config' && (
          <VideoSettingsTab
            config={project.config}
            styles={styles}
            stylesLoading={stylesLoading}
            stylesError={stylesError}
            isLocked={isLocked}
            onReloadStyles={onReloadStyles}
            onSave={handleSaveConfig}
          />
        )}

        {activeTab === 'render' && (
          <PreviewRenderTab
            project={project}
            assets={assets}
            trackedJob={trackedJob}
            jobHistory={jobHistory}
            pollError={pollError}
            isLocked={isLocked}
            onSelectJob={onSelectJob}
            onStartContactSheet={async () => {
              const job = await studioClient.startContactSheetJob(slug);
              onRegisterJob(job);
            }}
            onStartPreview={async (start, end, scale) => {
              const job = await studioClient.startPreviewJob(slug, { start, end, scale });
              onRegisterJob(job);
            }}
            onStartFullRender={async () => {
              const job = await studioClient.startFullRenderJob(slug);
              onRegisterJob(job);
            }}
            onStartMixAudio={async () => {
              const job = await studioClient.startMixAudioJob(slug);
              onRegisterJob(job);
            }}
            onGoToResults={() => onChangeTab('results')}
          />
        )}

        {activeTab === 'results' && (
          <ResultsTab
            project={project}
            trackedJob={trackedJob}
            jobHistory={jobHistory}
            onRefresh={() => onReloadProject(slug)}
            refreshing={loading}
          />
        )}
      </div>
    </div>
  );
}
