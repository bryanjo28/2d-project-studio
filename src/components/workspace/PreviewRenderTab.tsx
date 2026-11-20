import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Grid2x2,
  Info,
  Loader2,
  Music,
  Play,
  Terminal,
  Volume2,
} from 'lucide-react';
import type { AssetItem, ProjectDetail, RenderJob } from '../../types/studio';
import {
  formatDateTime,
  getJobStatusLabel,
  getJobTypeLabel,
  isJobActive,
} from '../../utils/format';

interface PreviewRenderTabProps {
  project: ProjectDetail;
  assets: AssetItem[];
  trackedJob: RenderJob | null;
  jobHistory: RenderJob[];
  pollError: string | null;
  isLocked: boolean;
  onSelectJob: (job: RenderJob) => void;
  onStartContactSheet: () => Promise<void>;
  onStartPreview: (start: number, end: number, scale: number) => Promise<void>;
  onStartFullRender: () => Promise<void>;
  onStartMixAudio: () => Promise<void>;
  onGoToResults: () => void;
}

export function PreviewRenderTab({
  project,
  assets,
  trackedJob,
  jobHistory,
  pollError,
  isLocked,
  onSelectJob,
  onStartContactSheet,
  onStartPreview,
  onStartFullRender,
  onStartMixAudio,
  onGoToResults,
}: PreviewRenderTabProps) {
  const defaultEnd = project.story?.duration && project.story.duration > 0 ? Math.min(5, project.story.duration) : 5;
  const [previewStart, setPreviewStart] = useState<number>(0);
  const [previewEnd, setPreviewEnd] = useState<number>(defaultEnd);
  const [previewScale, setPreviewScale] = useState<number>(0.5);

  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (trackedJob && isJobActive(trackedJob.status)) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [trackedJob?.logs.length, trackedJob?.status]);

  const hasNarrationAsset =
    Boolean(project.has_narration) || assets.some((a) => a.category === 'narration');

  const hasSucceededFullRender =
    Boolean(project.has_full_render) ||
    jobHistory.some(
      (j) =>
        (j.type === 'render' || j.type === 'full_render' || j.type === 'full-render') &&
        j.status === 'succeeded'
    );

  const canMixAudio = !isLocked && hasSucceededFullRender && hasNarrationAsset;

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setActionError(null);
    setSubmittingAction(key);
    try {
      await fn();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal memulai proses render di backend.'
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const handlePreviewClick = () => {
    if (!Number.isFinite(previewStart) || !Number.isFinite(previewEnd) || previewStart < 0) {
      setActionError('Nilai start preview tidak boleh negatif.');
      return;
    }
    if (previewEnd <= previewStart) {
      setActionError('Nilai end preview harus lebih besar dari start.');
      return;
    }
    if (!Number.isFinite(previewScale) || previewScale <= 0 || previewScale > 2) {
      setActionError('Scale preview harus berada di antara 0.1 hingga 2.0.');
      return;
    }
    void runAction('preview', () => onStartPreview(previewStart, previewEnd, previewScale));
  };

  const activeJobStatus = trackedJob?.status;
  const activeJobRunning = isJobActive(activeJobStatus);

  return (
    <div className="space-y-6">
      {/* Scene availability & job history volatility notes */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#12161E] px-4 py-3 text-xs text-slate-300 leading-relaxed">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Render penuh menghasilkan <strong>video silent (tanpa audio)</strong>. Pencampuran
            audio narasi dilakukan terpisah setelah render penuh selesai dan file narasi tersedia.
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#12161E] px-4 py-3 text-xs text-slate-300 leading-relaxed">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
          <span>
            Riwayat job backend disimpan sementara di memori server dan{' '}
            <strong>akan tereset ketika server backend dimatikan</strong>.
          </span>
        </div>
      </div>

      {/* Missing scene warning if backend explicitly reports false */}
      {project.has_scene === false && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-medium">Scene Animasi Belum Tersedia</div>
            <p className="mt-0.5 text-xs text-amber-200/80">
              Proyek ini belum memiliki definisi scene. Jika Anda menjalankan render sekarang,
              backend akan mengembalikan pesan bahwa scene belum tersedia. Gunakan proyek dengan
              template demo untuk menguji pipeline render langsung.
            </p>
          </div>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <div>
            <div className="font-medium">Pesan dari Backend / Validasi</div>
            <p className="mt-0.5 text-xs text-red-200/90">{actionError}</p>
          </div>
        </div>
      )}

      {/* Action Panels */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left: Render Controls */}
        <div className="xl:col-span-5 space-y-4">
          {/* Contact Sheet */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">1. Contact Sheet</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hasilkan grid frame cepat untuk mengecek komposisi scene.
                </p>
              </div>
              <button
                type="button"
                disabled={isLocked || submittingAction !== null}
                onClick={() => runAction('contact_sheet', onStartContactSheet)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/[0.09] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.16] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
              >
                {submittingAction === 'contact_sheet' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Grid2x2 className="h-3.5 w-3.5 text-amber-400" />
                )}
                <span>Contact Sheet</span>
              </button>
            </div>
          </div>

          {/* Segment Preview */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 space-y-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">2. Preview Segmen</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Render potongan rentang detik tertentu dengan skala resolusi lebih ringan.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="preview-start" className="block text-xs text-slate-400 mb-1">
                  Start (dtk)
                </label>
                <input
                  id="preview-start"
                  type="number"
                  step="0.1"
                  min="0"
                  value={previewStart}
                  onChange={(e) => setPreviewStart(Number(e.target.value))}
                  disabled={isLocked || submittingAction !== null}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D11] px-2.5 py-2 font-mono text-xs text-white tabular-nums focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="preview-end" className="block text-xs text-slate-400 mb-1">
                  End (dtk)
                </label>
                <input
                  id="preview-end"
                  type="number"
                  step="0.1"
                  min="0"
                  value={previewEnd}
                  onChange={(e) => setPreviewEnd(Number(e.target.value))}
                  disabled={isLocked || submittingAction !== null}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D11] px-2.5 py-2 font-mono text-xs text-white tabular-nums focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="preview-scale" className="block text-xs text-slate-400 mb-1">
                  Scale
                </label>
                <select
                  id="preview-scale"
                  value={previewScale}
                  onChange={(e) => setPreviewScale(Number(e.target.value))}
                  disabled={isLocked || submittingAction !== null}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D11] px-2.5 py-2 font-mono text-xs text-white tabular-nums focus:border-amber-400 focus:outline-none disabled:opacity-50"
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isLocked || submittingAction !== null}
              onClick={handlePreviewClick}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.16] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {submittingAction === 'preview' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span>Jalankan Preview</span>
            </button>
          </div>

          {/* Full Render */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 space-y-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">
                3. Render Penuh (Video Silent)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Merender keseluruhan durasi proyek sesuai pengaturan video tanpa trek audio.
              </p>
            </div>
            <button
              type="button"
              disabled={isLocked || submittingAction !== null}
              onClick={() => runAction('render', onStartFullRender)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-[#0B0D11] hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {submittingAction === 'render' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Film className="h-4 w-4" />
              )}
              <span>Mulai Render Penuh</span>
            </button>
          </div>

          {/* Mix Audio */}
          <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 space-y-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">
                4. Campur Audio Narasi
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Menggabungkan hasil video silent dari render penuh dengan aset audio narasi proyek.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <div className={hasSucceededFullRender ? 'text-emerald-400' : 'text-slate-400'}>
                {hasSucceededFullRender
                  ? '✓ Render penuh sudah selesai tersedia'
                  : '• Memerlukan render penuh yang berstatus succeeded'}
              </div>
              <div className={hasNarrationAsset ? 'text-emerald-400' : 'text-slate-400'}>
                {hasNarrationAsset
                  ? '✓ Aset narasi tersedia pada proyek'
                  : '• Memerlukan aset kategori Narasi (unggah di tab Aset)'}
              </div>
            </div>

            <button
              type="button"
              disabled={!canMixAudio || submittingAction !== null}
              onClick={() => runAction('mix_audio', onStartMixAudio)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.16] disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {submittingAction === 'mix_audio' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasNarrationAsset ? (
                <Volume2 className="h-4 w-4 text-amber-400" />
              ) : (
                <Music className="h-4 w-4 text-slate-400" />
              )}
              <span>Campur Audio</span>
            </button>
          </div>
        </div>

        {/* Right: Real Job Status & Actual Backend Logs */}
        <div className="xl:col-span-7 flex flex-col rounded-xl border border-white/[0.08] bg-[#12161E] overflow-hidden min-h-[480px]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Terminal className="h-4 w-4 text-amber-400" />
              <h3 className="font-display text-sm font-semibold text-white">
                Status Job & Log Aktual Backend
              </h3>
            </div>

            {trackedJob && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">{getJobTypeLabel(trackedJob.type)}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 font-sans font-medium ${
                    trackedJob.status === 'succeeded'
                      ? 'text-emerald-400'
                      : trackedJob.status === 'failed'
                        ? 'text-red-400'
                        : 'text-amber-400'
                  }`}
                >
                  {activeJobRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {trackedJob.status === 'succeeded' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {trackedJob.status === 'failed' && <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{getJobStatusLabel(trackedJob.status)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Indeterminate activity bar ONLY while queued/running — NO fake percentages */}
          {activeJobRunning && (
            <div className="border-b border-white/[0.06] bg-amber-500/[0.06] px-5 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                <span>
                  Memantau status job setiap 1 detik... Penyuntingan proyek dinonaktifkan hingga job
                  selesai.
                </span>
              </span>
              <span className="font-mono text-[11px] text-amber-300/80 shrink-0">
                ID: {trackedJob?.id}
              </span>
            </div>
          )}

          {pollError && (
            <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-2.5 text-xs text-red-200">
              {pollError}
            </div>
          )}

          {/* Job History Selector (in-memory session list) */}
          {jobHistory.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.06] bg-[#0F1219] px-5 py-2.5">
              <span className="text-[11px] text-slate-500 shrink-0">Job Sesi Ini:</span>
              {jobHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectJob(item)}
                  className={`rounded-md px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
                    trackedJob?.id === item.id
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                  }`}
                >
                  {getJobTypeLabel(item.type)} ({item.status})
                </button>
              ))}
            </div>
          )}

          {/* Terminal Log Output */}
          <div className="flex-1 bg-[#0B0D11] p-4 font-mono text-xs leading-relaxed overflow-y-auto max-h-[460px]">
            {!trackedJob ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center font-sans text-slate-500 px-6">
                <Film className="h-8 w-8 mb-2.5 text-slate-600" />
                <p className="text-sm text-slate-400">Belum ada job yang dijalankan pada sesi ini.</p>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  Pilih Contact Sheet, Preview Segmen, atau Render Penuh di panel kiri untuk
                  memantau log eksekusi langsung dari backend.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/[0.06] pb-2 text-[11px] text-slate-500">
                  <span>Job ID: {trackedJob.id}</span>
                  <span>Status: {trackedJob.status}</span>
                  {trackedJob.created_at && (
                    <span>Dibuat: {formatDateTime(trackedJob.created_at)}</span>
                  )}
                  {trackedJob.finished_at && (
                    <span>Selesai: {formatDateTime(trackedJob.finished_at)}</span>
                  )}
                </div>

                {trackedJob.logs.length === 0 ? (
                  <div className="text-slate-500">
                    {activeJobRunning
                      ? 'Menunggu baris log dari proses render backend...'
                      : 'Tidak ada output log yang dikembalikan oleh job ini.'}
                  </div>
                ) : (
                  trackedJob.logs.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap break-words text-slate-200">
                      <span className="mr-3 select-none text-slate-600 tabular-nums">
                        {String(i + 1).padStart(3, '0')}
                      </span>
                      <span>{line}</span>
                    </div>
                  ))
                )}

                {trackedJob.error && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-300">
                    Error: {trackedJob.error}
                  </div>
                )}

                {trackedJob.message && !trackedJob.error && (
                  <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-slate-300">
                    {trackedJob.message}
                  </div>
                )}

                <div ref={logEndRef} />
              </div>
            )}
          </div>

          {/* Footer shortcut to Results when artifacts are ready */}
          {trackedJob && trackedJob.status === 'succeeded' && trackedJob.artifacts.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-[#141821] px-5 py-3">
              <span className="text-xs text-emerald-300">
                Job selesai dengan {trackedJob.artifacts.length} file hasil (artifact).
              </span>
              <button
                type="button"
                onClick={onGoToResults}
                className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-[#0B0D11] hover:bg-amber-400 transition-colors whitespace-nowrap"
              >
                Buka Tab Hasil
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
