import { useCallback, useEffect, useState } from 'react';
import { isOfflineError, studioClient } from '../api/studio-client';
import type {
  CreateProjectPayload,
  ProjectDetail,
  ProjectSummary,
  RenderJob,
  StyleOption,
  WorkspaceTab,
} from '../types/studio';
import { isJobActive } from '../utils/format';
import { useJobPolling } from './useJobPolling';

export function useStudioState() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [backendOffline, setBackendOffline] = useState<boolean>(false);

  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [stylesLoading, setStylesLoading] = useState<boolean>(false);
  const [stylesError, setStylesError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('assets');

  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [trackedJob, setTrackedJob] = useState<RenderJob | null>(null);
  const [jobHistory, setJobHistory] = useState<RenderJob[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const list = await studioClient.listProjects();
      setProjects(list);
      setBackendOffline(false);
    } catch (err) {
      if (isOfflineError(err)) {
        setBackendOffline(true);
        setProjectsError('Backend studio tidak merespons.');
      } else {
        setProjectsError(err instanceof Error ? err.message : 'Gagal memuat daftar proyek.');
      }
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadStyles = useCallback(async () => {
    setStylesLoading(true);
    setStylesError(null);
    try {
      const list = await studioClient.listStyles();
      setStyles(list);
      setBackendOffline(false);
    } catch (err) {
      if (isOfflineError(err)) {
        setBackendOffline(true);
        setStylesError('Backend offline, pilihan style tidak dapat dimuat.');
      } else {
        setStylesError(err instanceof Error ? err.message : 'Gagal memuat daftar style.');
      }
    } finally {
      setStylesLoading(false);
    }
  }, []);

  const loadProjectDetail = useCallback(async (slug: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await studioClient.getProject(slug);
      setProjectDetail(detail);
      setBackendOffline(false);

      // Sinkronkan riwayat job & active job dari detail proyek atau endpoint jobs
      let jobs = detail.jobs ?? [];
      if (jobs.length === 0) {
        try {
          jobs = await studioClient.listProjectJobs(slug);
        } catch {
          // Endpoint /jobs opsional jika tidak tersedia di backend tertentu
        }
      }

      const activeOrLast = detail.active_job ?? detail.last_job ?? jobs[0] ?? null;
      setJobHistory(jobs.length > 0 ? jobs : activeOrLast ? [activeOrLast] : []);
      setTrackedJob((prev) => {
        if (detail.active_job) return detail.active_job;
        if (prev && prev.project_slug === slug && isJobActive(prev.status)) return prev;
        return activeOrLast;
      });
    } catch (err) {
      if (isOfflineError(err)) {
        setBackendOffline(true);
        setDetailError('Backend studio sedang offline.');
      } else {
        setDetailError(err instanceof Error ? err.message : 'Gagal memuat detail proyek.');
      }
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    void loadStyles();
  }, [loadProjects, loadStyles]);

  const openProject = useCallback(
    (slug: string, initialTab: WorkspaceTab = 'assets') => {
      setSelectedSlug(slug);
      setActiveTab(initialTab);
      setTrackedJob(null);
      setPollError(null);
      void loadProjectDetail(slug);
    },
    [loadProjectDetail]
  );

  const backToDashboard = useCallback(() => {
    setSelectedSlug(null);
    setProjectDetail(null);
    setTrackedJob(null);
    setPollError(null);
    void loadProjects();
  }, [loadProjects]);

  const createNewProject = useCallback(
    async (payload: CreateProjectPayload): Promise<ProjectDetail> => {
      const created = await studioClient.createProject(payload);
      await loadProjects();
      setSelectedSlug(created.slug);
      setActiveTab(payload.template === 'demo' ? 'render' : 'assets');
      setProjectDetail(created);
      setTrackedJob(created.active_job ?? created.last_job ?? null);
      setJobHistory(created.jobs ?? []);
      return created;
    },
    [loadProjects]
  );

  const registerStartedJob = useCallback((job: RenderJob) => {
    setPollError(null);
    setTrackedJob(job);
    setJobHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== job.id);
      return [job, ...filtered];
    });
    setProjects((prev) =>
      prev.map((p) => (p.slug === job.project_slug ? { ...p, active_job: job } : p))
    );
  }, []);

  const handleJobUpdate = useCallback((updatedJob: RenderJob) => {
    setPollError(null);
    setTrackedJob(updatedJob);
    setJobHistory((prev) => {
      const exists = prev.some((item) => item.id === updatedJob.id);
      if (!exists) return [updatedJob, ...prev];
      return prev.map((item) => (item.id === updatedJob.id ? updatedJob : item));
    });
  }, []);

  const handleJobFinish = useCallback(
    (finishedJob: RenderJob) => {
      void loadProjects();
      if (selectedSlug && finishedJob.project_slug === selectedSlug) {
        void loadProjectDetail(selectedSlug);
      }
    },
    [loadProjectDetail, loadProjects, selectedSlug]
  );

  const handlePollError = useCallback((err: unknown) => {
    if (isOfflineError(err)) {
      setBackendOffline(true);
      setPollError('Koneksi ke backend terputus saat memantau status job.');
    } else {
      setPollError(err instanceof Error ? err.message : 'Gagal memperbarui status job.');
    }
  }, []);

  useJobPolling({
    job: trackedJob,
    onJobUpdate: handleJobUpdate,
    onJobFinish: handleJobFinish,
    onPollError: handlePollError,
  });

  const retryConnection = useCallback(async () => {
    await Promise.all([loadProjects(), loadStyles()]);
    if (selectedSlug) {
      await loadProjectDetail(selectedSlug);
    }
  }, [loadProjectDetail, loadProjects, loadStyles, selectedSlug]);

  const isProjectLocked = Boolean(
    trackedJob &&
      selectedSlug &&
      trackedJob.project_slug === selectedSlug &&
      isJobActive(trackedJob.status)
  );

  return {
    projects,
    projectsLoading,
    projectsError,
    backendOffline,
    setBackendOffline,
    styles,
    stylesLoading,
    stylesError,
    selectedSlug,
    activeTab,
    setActiveTab,
    projectDetail,
    setProjectDetail,
    detailLoading,
    detailError,
    trackedJob,
    setTrackedJob,
    jobHistory,
    pollError,
    isProjectLocked,
    loadProjects,
    loadStyles,
    loadProjectDetail,
    openProject,
    backToDashboard,
    createNewProject,
    registerStartedJob,
    retryConnection,
  };
}
