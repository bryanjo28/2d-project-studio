import { useRef, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  ExternalLink,
  FileAudio,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { resolveBackendUrl } from '../../api/studio-client';
import type { AssetCategory, AssetItem } from '../../types/studio';
import {
  ASSET_CATEGORY_ACCEPT,
  ASSET_CATEGORY_LABELS,
  formatBytes,
} from '../../utils/format';

interface AssetsTabProps {
  slug: string;
  assets: AssetItem[];
  loading: boolean;
  error: string | null;
  isLocked: boolean;
  onRefresh: () => void;
  onUpload: (category: AssetCategory, file: File) => Promise<void>;
}

const CATEGORIES: AssetCategory[] = ['character', 'background', 'prop', 'narration', 'script'];

function AssetThumbnail({ asset }: { asset: AssetItem }) {
  const [imgError, setImgError] = useState(false);
  const fullUrl = resolveBackendUrl(asset.url);
  const isImage =
    asset.category === 'character' ||
    asset.category === 'background' ||
    asset.category === 'prop' ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(asset.name);

  const isAudio =
    asset.category === 'narration' || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(asset.name);

  if (isImage) {
    if (imgError) {
      return (
        <div className="flex h-40 w-full flex-col items-center justify-center gap-1.5 bg-[#0B0D11] text-slate-500">
          <ImageIcon className="h-6 w-6" />
          <span className="text-xs px-3 text-center truncate max-w-full">{asset.name}</span>
        </div>
      );
    }
    return (
      <div className="relative h-40 w-full overflow-hidden bg-[#0B0D11]">
        <img
          src={fullUrl}
          alt={asset.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-contain p-2"
        />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="flex h-40 w-full flex-col items-center justify-center gap-3 bg-[#0B0D11] px-4">
        <FileAudio className="h-7 w-7 text-amber-400" />
        <audio controls preload="metadata" src={fullUrl} className="w-full h-9" />
      </div>
    );
  }

  return (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-[#0B0D11] text-slate-400 px-4">
      <FileText className="h-7 w-7 text-slate-400" />
      <span className="text-xs text-slate-400">Dokumen Naskah</span>
    </div>
  );
}

export function AssetsTab({
  assets,
  loading,
  error,
  isLocked,
  onRefresh,
  onUpload,
}: AssetsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('character');
  const [filterCategory, setFilterCategory] = useState<'all' | AssetCategory>('all');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setUploading(true);

    try {
      await onUpload(selectedCategory, file);
      setUploadSuccess(
        `Berhasil mengunggah "${file.name}" ke kategori ${ASSET_CATEGORY_LABELS[selectedCategory]}.`
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah file aset.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredAssets =
    filterCategory === 'all' ? assets : assets.filter((a) => a.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Important production notice */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#12161E] px-4 py-3.5 text-sm text-slate-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <p className="leading-relaxed">
          Mengunggah gambar karakter, latar, atau properti hanya menyimpan file ke folder aset proyek
          dan <strong>tidak otomatis memasukkannya ke dalam scene animasi</strong>. Aset narasi
          dapat digunakan saat langkah pencampuran audio setelah render penuh selesai.
        </p>
      </div>

      {/* Upload Panel */}
      <div className="rounded-xl border border-white/[0.08] bg-[#12161E] p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-white">Unggah Aset Proyek</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih kategori aset lalu pilih file dari komputer lokal untuk dikirim melalui{' '}
              <code className="font-mono text-slate-300">multipart/form-data</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang Aset</span>
          </button>
        </div>

        {/* Category Selector Buttons */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              disabled={isLocked || uploading}
              className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-[#0B0D11]'
                  : 'bg-[#0B0D11] text-slate-300 border border-white/[0.08] hover:border-white/[0.2]'
              } disabled:opacity-40`}
            >
              {ASSET_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* File Picker Trigger */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ASSET_CATEGORY_ACCEPT[selectedCategory]}
            onChange={handleFileChange}
            disabled={isLocked || uploading}
            className="hidden"
            id="asset-file-upload"
          />
          <label
            htmlFor="asset-file-upload"
            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.2] bg-[#0B0D11] px-5 py-3 text-sm font-medium text-slate-200 hover:border-amber-400/60 hover:text-white transition-colors ${
              isLocked || uploading ? 'pointer-events-none opacity-45' : ''
            }`}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : (
              <Upload className="h-4 w-4 text-amber-400" />
            )}
            <span>
              {uploading
                ? `Mengunggah ${ASSET_CATEGORY_LABELS[selectedCategory]}...`
                : `Pilih File ${ASSET_CATEGORY_LABELS[selectedCategory]}`}
            </span>
          </label>
          <span className="text-xs text-slate-500">
            Format didukung: <span className="font-mono">{ASSET_CATEGORY_ACCEPT[selectedCategory]}</span>
          </span>
        </div>

        {uploadError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
            {uploadSuccess}
          </div>
        )}
      </div>

      {/* Asset Filter & Gallery */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.08] pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filterCategory === 'all'
                  ? 'bg-white/[0.1] text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua ({assets.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = assets.filter((a) => a.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    filterCategory === cat
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ASSET_CATEGORY_LABELS[cat]} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-md bg-white/[0.08] px-3 py-1 text-xs font-medium text-white"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {loading && assets.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-56 rounded-xl border border-white/[0.08] bg-[#12161E] animate-pulse"
              />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.12] bg-[#11151D] py-12 text-center text-sm text-slate-400">
            Belum ada aset{filterCategory !== 'all' ? ` pada kategori ${ASSET_CATEGORY_LABELS[filterCategory]}` : ''}.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAssets.map((asset, idx) => {
              const assetUrl = resolveBackendUrl(asset.url);
              return (
                <div
                  key={`${asset.path}-${idx}`}
                  className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12161E] flex flex-col"
                >
                  <AssetThumbnail asset={asset} />

                  <div className="flex-1 p-4 space-y-2 border-t border-white/[0.06]">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-white truncate" title={asset.name}>
                        {asset.name}
                      </h3>
                      <a
                        href={assetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                        title="Buka URL aset backend"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{ASSET_CATEGORY_LABELS[asset.category] ?? asset.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatBytes(asset.size)}</span>
                    </div>

                    <div
                      className="truncate font-mono text-[11px] text-slate-500"
                      title={asset.path || asset.url}
                    >
                      {asset.path || asset.url}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
