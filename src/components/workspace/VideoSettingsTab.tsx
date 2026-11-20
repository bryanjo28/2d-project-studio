import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Save } from 'lucide-react';
import type {
  AspectRatio,
  StyleOption,
  VideoConfig,
  VideoFps,
  VideoResolution,
} from '../../types/studio';

interface VideoSettingsTabProps {
  config: VideoConfig;
  styles: StyleOption[];
  stylesLoading: boolean;
  stylesError: string | null;
  isLocked: boolean;
  onReloadStyles: () => void;
  onSave: (config: VideoConfig) => Promise<void>;
}

const ASPECT_RATIOS: { value: AspectRatio; label: string; hint: string }[] = [
  { value: '16:9', label: '16:9 (Lanskap)', hint: 'YouTube, desktop, presentasi layar lebar' },
  { value: '9:16', label: '9:16 (Vertikal)', hint: 'Shorts, Reels, format mobile vertikal' },
];

const RESOLUTIONS: VideoResolution[] = ['720p', '1080p', '1440p', '2160p'];
const FPS_OPTIONS: VideoFps[] = [24, 30];

export function VideoSettingsTab({
  config,
  styles,
  stylesLoading,
  stylesError,
  isLocked,
  onReloadStyles,
  onSave,
}: VideoSettingsTabProps) {
  const [draft, setDraft] = useState<VideoConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDraft(config);
    setSaveError(null);
    setSaveSuccess(null);
  }, [config]);

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      await onSave(draft);
      setSaveSuccess('Pengaturan video berhasil disimpan.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan video.');
    } finally {
      setSaving(false);
    }
  };

  const hasCurrentStyleInOptions = styles.some((s) => s.id === draft.style);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-6 space-y-6">
        <div>
          <h2 className="font-display text-base font-semibold text-white">Pengaturan Output Video</h2>
          <p className="mt-1 text-xs text-slate-400">
            Konfigurasi ini diterapkan saat menjalankan contact sheet, preview, dan full render.
          </p>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <span className="block text-sm font-medium text-slate-200">Aspect Ratio</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ASPECT_RATIOS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={isLocked || saving}
                onClick={() => {
                  setDraft((prev) => ({ ...prev, aspect_ratio: opt.value }));
                  setSaveSuccess(null);
                }}
                className={`flex flex-col rounded-lg border p-3.5 text-left transition-colors ${
                  draft.aspect_ratio === opt.value
                    ? 'border-amber-500/70 bg-amber-500/10 text-white'
                    : 'border-white/[0.08] bg-[#0B0D11] text-slate-300 hover:border-white/[0.2]'
                } disabled:opacity-45`}
              >
                <span className="font-mono text-sm font-semibold">{opt.label}</span>
                <span className="mt-1 text-xs text-slate-400">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Resolusi & FPS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-200">Resolusi</span>
            <div className="grid grid-cols-2 gap-2">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res}
                  type="button"
                  disabled={isLocked || saving}
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, resolution: res }));
                    setSaveSuccess(null);
                  }}
                  className={`rounded-lg border px-3 py-2.5 font-mono text-sm font-medium transition-colors tabular-nums ${
                    draft.resolution === res
                      ? 'border-amber-500/70 bg-amber-500/10 text-white'
                      : 'border-white/[0.08] bg-[#0B0D11] text-slate-300 hover:border-white/[0.2]'
                  } disabled:opacity-45`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-200">Frame Rate (FPS)</span>
            <div className="grid grid-cols-2 gap-2">
              {FPS_OPTIONS.map((fpsVal) => (
                <button
                  key={fpsVal}
                  type="button"
                  disabled={isLocked || saving}
                  onClick={() => {
                    setDraft((prev) => ({ ...prev, fps: fpsVal }));
                    setSaveSuccess(null);
                  }}
                  className={`rounded-lg border px-3 py-2.5 font-mono text-sm font-medium transition-colors tabular-nums ${
                    draft.fps === fpsVal
                      ? 'border-amber-500/70 bg-amber-500/10 text-white'
                      : 'border-white/[0.08] bg-[#0B0D11] text-slate-300 hover:border-white/[0.2]'
                  } disabled:opacity-45`}
                >
                  {fpsVal} fps
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Style Visual dari API */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="video-style-select" className="block text-sm font-medium text-slate-200">
              Style Visual (dari API)
            </label>
            <button
              type="button"
              onClick={onReloadStyles}
              disabled={stylesLoading}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${stylesLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Style</span>
            </button>
          </div>

          {stylesError && (
            <div className="text-xs text-amber-300">{stylesError}</div>
          )}

          <select
            id="video-style-select"
            value={draft.style}
            onChange={(e) => {
              setDraft((prev) => ({ ...prev, style: e.target.value }));
              setSaveSuccess(null);
            }}
            disabled={isLocked || saving}
            className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D11] px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
          >
            {styles.length === 0 && !draft.style && (
              <option value="">-- Tidak ada daftar style dari API --</option>
            )}
            {!hasCurrentStyleInOptions && draft.style && (
              <option value={draft.style}>{draft.style} (Nilai saat ini)</option>
            )}
            {styles.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
                {opt.description ? ` — ${opt.description}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Captions Toggle */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#0B0D11] px-4 py-3.5">
          <div>
            <div className="text-sm font-medium text-white">Captions / Teks Narasi</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Aktifkan atau nonaktifkan subtitle otomatis pada video hasil render.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.captions}
            disabled={isLocked || saving}
            onClick={() => {
              setDraft((prev) => ({ ...prev, captions: !prev.captions }));
              setSaveSuccess(null);
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-45 ${
              draft.captions ? 'bg-amber-500' : 'bg-white/[0.14]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-[#0B0D11] transition-transform ${
                draft.captions ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {saveError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{saveSuccess}</span>
          </div>
        )}

        <div className="flex justify-end border-t border-white/[0.08] pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLocked || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-[#0B0D11] hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan Video'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
