import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
  Save,
  Trash2,
  Wand2,
} from 'lucide-react';
import type { ShotItem, StoryData } from '../../types/studio';
import { formatSeconds, validateStory } from '../../utils/format';

interface StoryTabProps {
  story: StoryData | null | undefined;
  isLocked: boolean;
  onSave: (story: StoryData) => Promise<void>;
}

const EMPTY_STORY: StoryData = {
  storyline: '',
  duration: 0,
  shots: [],
};

export function StoryTab({ story, isLocked, onSave }: StoryTabProps) {
  const [draft, setDraft] = useState<StoryData>(() => story ?? EMPTY_STORY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    setDraft(story ?? EMPTY_STORY);
    setDirty(false);
    setSaveError(null);
    setSaveSuccess(null);
  }, [story]);

  const validation = useMemo(() => validateStory(draft), [draft]);

  const updateShotsAndSyncDuration = (nextShots: ShotItem[], syncDuration = true) => {
    const lastEnd = nextShots.length > 0 ? nextShots[nextShots.length - 1].end : 0;
    setDraft((prev) => ({
      ...prev,
      shots: nextShots,
      duration: syncDuration && Number.isFinite(lastEnd) ? lastEnd : prev.duration,
    }));
    setDirty(true);
    setSaveSuccess(null);
  };

  const handleStorylineChange = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      storyline: value,
    }));
    setDirty(true);
    setSaveSuccess(null);
  };

  const handleDurationChange = (value: string) => {
    const parsed = Number(value);
    setDraft((prev) => ({
      ...prev,
      duration: Number.isNaN(parsed) ? 0 : parsed,
    }));
    setDirty(true);
    setSaveSuccess(null);
  };

  const handleAddShot = () => {
    const existingIds = new Set(draft.shots.map((s) => s.id));
    let nextNum = draft.shots.length + 1;
    while (existingIds.has(`shot-${nextNum}`)) {
      nextNum += 1;
    }

    const lastEnd = draft.shots.length > 0 ? draft.shots[draft.shots.length - 1].end : 0;
    const start = Number.isFinite(lastEnd) ? lastEnd : 0;
    const newShot: ShotItem = {
      id: `shot-${nextNum}`,
      start,
      end: Number((start + 3).toFixed(2)),
      line: '',
      scene_description: '',
    };

    updateShotsAndSyncDuration([...draft.shots, newShot], true);
  };

  const handleShotFieldChange = (
    index: number,
    field: 'id' | 'start' | 'end' | 'line' | 'scene_description',
    rawValue: string
  ) => {
    const nextShots = draft.shots.map((shot, idx) => {
      if (idx !== index) return shot;
      if (field === 'start' || field === 'end') {
        const numeric = rawValue === '' ? 0 : Number(rawValue);
        return {
          ...shot,
          [field]: Number.isNaN(numeric) ? 0 : numeric,
        };
      }
      return {
        ...shot,
        [field]: rawValue,
      };
    });

    const isLastEndEdit = field === 'end' && index === nextShots.length - 1;
    updateShotsAndSyncDuration(nextShots, isLastEndEdit);
  };

  const handleDeleteShot = (index: number) => {
    const nextShots = draft.shots.filter((_, idx) => idx !== index);
    updateShotsAndSyncDuration(nextShots, true);
  };

  const handleMoveShot = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.shots.length) return;
    const nextShots = [...draft.shots];
    const [moved] = nextShots.splice(index, 1);
    nextShots.splice(target, 0, moved);
    updateShotsAndSyncDuration(nextShots, false);
  };

  const handleNormalizeTiming = () => {
    let cursor = 0;
    const normalized = draft.shots.map((shot) => {
      const span = shot.end > shot.start ? shot.end - shot.start : 2;
      const start = Number(cursor.toFixed(2));
      const end = Number((cursor + span).toFixed(2));
      cursor = end;
      return {
        ...shot,
        start,
        end,
      };
    });
    updateShotsAndSyncDuration(normalized, true);
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(null);

    if (!validation.valid) {
      setSaveError(validation.errors[0] || 'Data cerita belum memenuhi aturan validasi.');
      return;
    }

    setSaving(true);
    try {
      // Pertahankan seluruh field tambahan yang ada di draft story dan shot
      const payload: StoryData = {
        ...draft,
        duration: validation.computedDuration,
        shots: draft.shots.map((s) => ({ ...s, id: s.id.trim() })),
      };
      await onSave(payload);
      setDirty(false);
      setSaveSuccess('Cerita dan tabel shot berhasil disimpan ke backend.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Gagal menyimpan cerita.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scope Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#12161E] px-4 py-3.5 text-sm text-slate-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <p className="leading-relaxed">
          Storyline dan deskripsi shot di halaman ini digunakan sebagai struktur naratif proyek dan{' '}
          <strong>belum otomatis menghasilkan kode scene animasi</strong>. Field tambahan pada data
          story yang sudah ada akan tetap dipertahankan saat disimpan.
        </p>
      </div>

      {/* Storyline Editor */}
      <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-white">Editor Storyline</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ringkasan alur cerita utama untuk proyek animasi ini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="story-duration-input" className="text-xs text-slate-400 whitespace-nowrap">
              Total Duration (dtk):
            </label>
            <input
              id="story-duration-input"
              type="number"
              step="0.1"
              min="0"
              value={draft.duration}
              onChange={(e) => handleDurationChange(e.target.value)}
              disabled={isLocked || saving}
              className="w-28 rounded-lg border border-white/[0.1] bg-[#0B0D11] px-3 py-1.5 font-mono text-sm text-white tabular-nums focus:border-amber-400 focus:outline-none disabled:opacity-50"
            />
          </div>
        </div>

        <textarea
          rows={4}
          value={draft.storyline}
          onChange={(e) => handleStorylineChange(e.target.value)}
          disabled={isLocked || saving}
          placeholder="Tuliskan sinopsis atau storyline lengkap animasi di sini..."
          className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D11] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 leading-relaxed focus:border-amber-400 focus:outline-none disabled:opacity-50"
        />
      </div>

      {/* Shot Table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#12161E] overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-white">
              Tabel Shot ({draft.shots.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aturan: mulai detik 0, berurutan tanpa celah, ID unik, durasi positif, dan{' '}
              <code className="font-mono text-slate-300">duration</code> sama dengan{' '}
              <code className="font-mono text-slate-300">end</code> shot terakhir.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {draft.shots.length > 0 && (
              <button
                type="button"
                onClick={handleNormalizeTiming}
                disabled={isLocked || saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0B0D11] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06] disabled:opacity-40 whitespace-nowrap"
                title="Rapikan start dan end agar berurutan mulai detik 0 tanpa celah"
              >
                <Wand2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Rapikan Waktu</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddShot}
              disabled={isLocked || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.14] disabled:opacity-40 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Shot</span>
            </button>
          </div>
        </div>

        {draft.shots.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            Belum ada baris shot. Klik <strong>Tambah Shot</strong> untuk mulai menyusun timeline.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0F1219] text-xs font-medium text-slate-400">
                  <th className="px-4 py-3 w-14 text-center">Urut</th>
                  <th className="px-3 py-3 w-36">ID Shot</th>
                  <th className="px-3 py-3 w-28">Start (dtk)</th>
                  <th className="px-3 py-3 w-28">End (dtk)</th>
                  <th className="px-3 py-3 w-24">Durasi</th>
                  <th className="px-3 py-3">Line / Narasi</th>
                  <th className="px-3 py-3">Deskripsi Scene</th>
                  <th className="px-4 py-3 w-14 text-right">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {draft.shots.map((shot, idx) => {
                  const rowErrors = validation.shotErrors[idx] || [];
                  const span = shot.end - shot.start;
                  return (
                    <tr
                      key={`${idx}-${shot.id}`}
                      className={`align-top ${
                        rowErrors.length > 0 ? 'bg-red-500/[0.06]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveShot(idx, -1)}
                            disabled={idx === 0 || isLocked || saving}
                            className="rounded p-1 text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-25"
                            title="Geser ke atas"
                            aria-label="Geser shot ke atas"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveShot(idx, 1)}
                            disabled={idx === draft.shots.length - 1 || isLocked || saving}
                            className="rounded p-1 text-slate-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-25"
                            title="Geser ke bawah"
                            aria-label="Geser shot ke bawah"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={shot.id}
                          onChange={(e) => handleShotFieldChange(idx, 'id', e.target.value)}
                          disabled={isLocked || saving}
                          className="w-full rounded-md border border-white/[0.1] bg-[#0B0D11] px-2.5 py-1.5 font-mono text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shot.start}
                          onChange={(e) => handleShotFieldChange(idx, 'start', e.target.value)}
                          disabled={isLocked || saving}
                          className="w-full rounded-md border border-white/[0.1] bg-[#0B0D11] px-2.5 py-1.5 font-mono text-xs text-white tabular-nums focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={shot.end}
                          onChange={(e) => handleShotFieldChange(idx, 'end', e.target.value)}
                          disabled={isLocked || saving}
                          className="w-full rounded-md border border-white/[0.1] bg-[#0B0D11] px-2.5 py-1.5 font-mono text-xs text-white tabular-nums focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        />
                      </td>

                      <td className="px-3 py-4 font-mono text-xs tabular-nums text-slate-300 whitespace-nowrap">
                        {span > 0 ? formatSeconds(span) : <span className="text-red-400">{formatSeconds(span)}</span>}
                      </td>

                      <td className="px-3 py-3">
                        <textarea
                          rows={2}
                          value={shot.line}
                          onChange={(e) => handleShotFieldChange(idx, 'line', e.target.value)}
                          disabled={isLocked || saving}
                          placeholder="Dialog / teks narasi..."
                          className="w-full min-w-[180px] rounded-md border border-white/[0.1] bg-[#0B0D11] px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <textarea
                          rows={2}
                          value={shot.scene_description}
                          onChange={(e) =>
                            handleShotFieldChange(idx, 'scene_description', e.target.value)
                          }
                          disabled={isLocked || saving}
                          placeholder="Deskripsi visual / aksi scene..."
                          className="w-full min-w-[200px] rounded-md border border-white/[0.1] bg-[#0B0D11] px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        />
                        {rowErrors.length > 0 && (
                          <div className="mt-1.5 space-y-0.5 text-xs text-red-400">
                            {rowErrors.map((msg, eIdx) => (
                              <div key={eIdx}>{msg}</div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteShot(idx)}
                          disabled={isLocked || saving}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-500/15 hover:text-red-400 disabled:opacity-30"
                          title="Hapus baris shot"
                          aria-label="Hapus baris shot"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validation summary & Save bar */}
      {!validation.valid && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Validasi Cerita Belum Terpenuhi</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-white/[0.08] pt-4">
        <div className="text-xs text-slate-400 tabular-nums">
          {dirty ? 'Ada perubahan yang belum disimpan.' : 'Semua perubahan tersinkron.'} · Total
          durasi shot: <span className="font-mono text-slate-200">{formatSeconds(validation.computedDuration)}</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isLocked || saving || !validation.valid}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-[#0B0D11] hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? 'Menyimpan...' : 'Simpan Cerita'}</span>
        </button>
      </div>
    </div>
  );
}
