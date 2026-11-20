import { useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  Film,
  Grid2x2,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { resolveBackendUrl } from '../../api/studio-client';
import type { ArtifactItem, ProjectDetail, RenderJob } from '../../types/studio';
import { formatBytes, formatDateTime } from '../../utils/format';

interface ResultsTabProps {
  project: ProjectDetail;
  trackedJob: RenderJob | null;
  jobHistory: RenderJob[];
  onRefresh: () => void;
  refreshing: boolean;
}

interface EnrichedArtifact extends ArtifactItem {
  sourceLabel: string;
}

function isVideoArtifact(art: ArtifactItem): boolean {
  if (art.kind === 'video') return true;
  if (art.mime_type?.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|mkv)$/i.test(art.url || art.name);
}

function isImageArtifact(art: ArtifactItem): boolean {
  if (art.kind === 'contact_sheet' || art.kind === 'image') return true;
  if (art.mime_type?.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(art.url || art.name);
}

export function ResultsTab({
  project,
  trackedJob,
  jobHistory,
  onRefresh,
  refreshing,
}: ResultsTabProps) {
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const artifacts = useMemo<EnrichedArtifact[]>(() => {
    const map = new Map<string, EnrichedArtifact>();

    const addItems = (items: ArtifactItem[] | undefined, sourceLabel: string) => {
      if (!items) return;
      for (const item of items) {
        if (!item.url) continue;
        const resolved = resolveBackendUrl(item.url);
        if (!map.has(resolved)) {
          map.set(resolved, {
            ...item,
            url: resolved,
            sourceLabel,
          });
        }
      }
    };

    if (trackedJob?.artifacts?.length) {
      addItems(trackedJob.artifacts, `Job ${trackedJob.id}`);
    }
    for (const job of jobHistory) {
      addItems(job.artifacts, `Job ${job.id}`);
    }
    addItems(project.artifacts, 'Proyek');

    return Array.from(map.values());
  }, [jobHistory, project.artifacts, trackedJob]);

  const videoArtifacts = artifacts.filter(isVideoArtifact);
  const imageArtifacts = artifacts.filter(isImageArtifact);
  const otherArtifacts = artifacts.filter((a) => !isVideoArtifact(a) && !isImageArtifact(a));

  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const activeVideo =
    videoArtifacts.find((v) => v.url === selectedVideoUrl) ?? videoArtifacts[0] ?? null;

  const handleDownload = async (artifact: EnrichedArtifact) => {
    setDownloadError(null);
    setDownloadingUrl(artifact.url);
    try {
      const response = await fetch(artifact.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = artifact.name || 'artifact';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback ke anchor download standar apabila header CORS mencegah fetch blob
      const anchor = document.createElement('a');
      anchor.href = artifact.url;
      anchor.download = artifact.name || 'artifact';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setDownloadError(
        'Browser membatasi unduhan langsung lintas-origin; file dibuka melalui tautan backend.'
      );
    } finally {
      setDownloadingUrl(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            Hasil Render & Contact Sheet
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pratinjau video dan contact sheet langsung dari artifact backend yang aktif.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-white/[0.1] bg-[#12161E] px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Segarkan Hasil</span>
        </button>
      </div>

      {downloadError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
          {downloadError}
        </div>
      )}

      {artifacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-[#11151D] px-6 py-16 text-center">
          <Film className="h-10 w-10 text-slate-500 mb-3" />
          <h3 className="font-display text-base font-medium text-white">
            Belum Ada Hasil Render
          </h3>
          <p className="mt-1.5 text-sm text-slate-400 max-w-md">
            Jalankan Contact Sheet, Preview Segmen, atau Render Penuh pada tab Preview & Render
            untuk melihat dan mengunduh hasilnya di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Large Video Stage */}
          {activeVideo && (
            <section className="rounded-xl border border-white/[0.08] bg-[#12161E] overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-amber-400 shrink-0" />
                    <h3 className="font-display text-sm font-semibold text-white truncate">
                      {activeVideo.name}
                    </h3>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{activeVideo.sourceLabel}</span>
                    {activeVideo.size !== undefined && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatBytes(activeVideo.size)}
                        </span>
                      </>
                    )}
                    {activeVideo.created_at && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateTime(activeVideo.created_at)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] whitespace-nowrap"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Buka</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDownload(activeVideo)}
                    disabled={downloadingUrl === activeVideo.url}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-[#0B0D11] hover:bg-amber-400 disabled:opacity-50 whitespace-nowrap"
                  >
                    {downloadingUrl === activeVideo.url ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>Unduh Video</span>
                  </button>
                </div>
              </div>

              {/* Generous Preview Viewport */}
              <div className="bg-black flex items-center justify-center p-2 sm:p-4">
                <video
                  key={activeVideo.url}
                  src={activeVideo.url}
                  controls
                  playsInline
                  className="w-full max-h-[64vh] rounded-lg outline-none"
                />
              </div>

              {videoArtifacts.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto border-t border-white/[0.08] bg-[#0F1219] px-5 py-3">
                  <span className="text-xs text-slate-400 shrink-0">Pilih Video:</span>
                  {videoArtifacts.map((vid) => (
                    <button
                      key={vid.url}
                      type="button"
                      onClick={() => setSelectedVideoUrl(vid.url)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                        activeVideo.url === vid.url
                          ? 'bg-amber-500 text-[#0B0D11]'
                          : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]'
                      }`}
                    >
                      {vid.name}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Contact Sheets & Image Artifacts */}
          {imageArtifacts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Grid2x2 className="h-4 w-4 text-amber-400" />
                <h3 className="font-display text-sm font-semibold text-white">
                  Contact Sheet & Gambar ({imageArtifacts.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {imageArtifacts.map((imgArt) => (
                  <div
                    key={imgArt.url}
                    className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12161E]"
                  >
                    <div className="bg-[#0B0D11] p-3 flex items-center justify-center min-h-[260px]">
                      <img
                        src={imgArt.url}
                        alt={imgArt.name}
                        referrerPolicy="no-referrer"
                        className="max-h-[460px] w-full object-contain rounded"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{imgArt.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {imgArt.sourceLabel}
                          {imgArt.size !== undefined && ` · ${formatBytes(imgArt.size)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={imgArt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Buka</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownload(imgArt)}
                          disabled={downloadingUrl === imgArt.url}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.1] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.16] disabled:opacity-50"
                        >
                          {downloadingUrl === imgArt.url ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          <span>Unduh</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Other Artifacts */}
          {otherArtifacts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-400" />
                <h3 className="font-display text-sm font-semibold text-white">
                  File Artifact Lainnya ({otherArtifacts.length})
                </h3>
              </div>
              <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#12161E]">
                {otherArtifacts.map((art) => (
                  <div
                    key={art.url}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{art.name}</div>
                      <div className="text-xs text-slate-400 font-mono truncate">{art.url}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Buka</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDownload(art)}
                        disabled={downloadingUrl === art.url}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.1] px-3 py-1.5 text-xs font-medium text-white hover:bg-white/[0.16]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Unduh</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
