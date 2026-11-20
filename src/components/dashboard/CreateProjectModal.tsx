import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import type { CreateProjectPayload, ProjectTemplate } from '../../types/studio';
import { isValidSlug, suggestSlugFromTitle } from '../../utils/format';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateProjectPayload) => Promise<void>;
}

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [template, setTemplate] = useState<ProjectTemplate>('empty');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const slugValid = slug.length > 0 && isValidSlug(slug);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(suggestSlugFromTitle(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugTouched(true);
    setSlug(val);
  };

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setTemplate('empty');
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedTitle) {
      setError('Judul proyek wajib diisi.');
      return;
    }
    if (!isValidSlug(trimmedSlug)) {
      setError('Slug hanya boleh berisi huruf kecil (a-z), angka (0-9), tanda hubung (-), dan underscore (_).');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        slug: trimmedSlug,
        title: trimmedTitle,
        template,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat proyek baru.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-project-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/[0.1] bg-[#141821] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h2 id="create-project-title" className="font-display text-lg font-semibold text-white">
            Buat Proyek Baru
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="project-title-input" className="block text-sm font-medium text-slate-200 mb-1.5">
              Judul Proyek
            </label>
            <input
              id="project-title-input"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: Episode 01 — Petualangan Pagi"
              className="w-full rounded-lg border border-white/[0.1] bg-[#0B0D11] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="project-slug-input" className="block text-sm font-medium text-slate-200 mb-1.5">
              Slug Proyek
            </label>
            <input
              id="project-slug-input"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="episode-01_petualangan"
              className={`w-full rounded-lg border bg-[#0B0D11] px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:outline-none ${
                slug.length > 0 && !slugValid
                  ? 'border-red-500/60 focus:border-red-400'
                  : 'border-white/[0.1] focus:border-amber-400'
              }`}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Hanya huruf kecil (<code className="font-mono text-slate-300">a-z</code>), angka (
              <code className="font-mono text-slate-300">0-9</code>), tanda hubung (
              <code className="font-mono text-slate-300">-</code>), dan underscore (
              <code className="font-mono text-slate-300">_</code>).
            </p>
            {slug.length > 0 && !slugValid && (
              <p className="mt-1 text-xs text-red-400">
                Format slug tidak valid. Hapus spasi, huruf kapital, atau simbol lain.
              </p>
            )}
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-200 mb-2">Template Proyek</span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setTemplate('empty')}
                className={`flex flex-col rounded-lg border p-3.5 text-left transition-colors ${
                  template === 'empty'
                    ? 'border-amber-500/60 bg-amber-500/10 text-white'
                    : 'border-white/[0.08] bg-[#0B0D11] text-slate-300 hover:border-white/[0.16]'
                }`}
              >
                <span className="text-sm font-semibold">Template Kosong</span>
                <span className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Mulai dari proyek bersih untuk mengisi aset, storyline, dan scene secara manual.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('demo')}
                className={`flex flex-col rounded-lg border p-3.5 text-left transition-colors ${
                  template === 'demo'
                    ? 'border-amber-500/60 bg-amber-500/10 text-white'
                    : 'border-white/[0.08] bg-[#0B0D11] text-slate-300 hover:border-white/[0.16]'
                }`}
              >
                <span className="text-sm font-semibold">Template Demo</span>
                <span className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Gunakan template demo untuk langsung mencoba contact sheet, preview, dan render tanpa membuat scene baru.
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !slugValid}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-[#0B0D11] hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{submitting ? 'Membuat...' : 'Buat Proyek'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
