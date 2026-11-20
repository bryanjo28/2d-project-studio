import { useEffect, useRef } from 'react';
import { studioClient } from '../api/studio-client';
import type { RenderJob } from '../types/studio';
import { isJobActive } from '../utils/format';

interface UseJobPollingOptions {
  job: RenderJob | null;
  onJobUpdate: (updatedJob: RenderJob) => void;
  onJobFinish?: (finishedJob: RenderJob) => void;
  onPollError?: (error: unknown) => void;
}

/**
 * Melakukan polling status job setiap 1 detik selama status masih queued/running.
 * Berhenti otomatis saat job selesai (succeeded/failed) atau komponen ditutup.
 */
export function useJobPolling({
  job,
  onJobUpdate,
  onJobFinish,
  onPollError,
}: UseJobPollingOptions): void {
  const onUpdateRef = useRef(onJobUpdate);
  const onFinishRef = useRef(onJobFinish);
  const onErrorRef = useRef(onPollError);

  onUpdateRef.current = onJobUpdate;
  onFinishRef.current = onJobFinish;
  onErrorRef.current = onPollError;

  const jobId = job?.id ?? null;
  const active = isJobActive(job?.status);

  useEffect(() => {
    if (!jobId || !active) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const pollOnce = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const latest = await studioClient.getJob(jobId);
        if (cancelled) return;
        onUpdateRef.current(latest);
        if (!isJobActive(latest.status)) {
          onFinishRef.current?.(latest);
        }
      } catch (err) {
        if (!cancelled) {
          onErrorRef.current?.(err);
        }
      } finally {
        inFlight = false;
      }
    };

    const intervalId = window.setInterval(pollOnce, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [jobId, active]);
}
