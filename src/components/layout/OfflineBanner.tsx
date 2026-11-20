import { RefreshCw, Terminal, WifiOff } from 'lucide-react';
import { getStudioApiBaseUrl } from '../../api/studio-client';

interface OfflineBannerProps {
  onRetry: () => void;
  isRetrying: boolean;
}

export function OfflineBanner({ onRetry, isRetrying }: OfflineBannerProps) {
  const apiUrl = getStudioApiBaseUrl();

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-[#171215] p-5 text-slate-200"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
            <WifiOff className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-base font-semibold text-white">
              Backend Studio Lokal Tidak Terhubung
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              Frontend tidak dapat menjangkau server backend di{' '}
              <code className="font-mono text-amber-300">{apiUrl}</code>. Pastikan server backend
              lokal Windows sudah dijalankan sebelum membuat proyek, mengunggah aset, atau melakukan
              render.
            </p>
            <div className="rounded-lg border border-white/[0.08] bg-[#0B0D11] p-3 text-xs">
              <div className="flex items-center gap-2 text-slate-400 mb-1.5">
                <Terminal className="h-3.5 w-3.5 text-amber-400" />
                <span>Jalankan perintah berikut di folder backend melalui PowerShell:</span>
              </div>
              <pre className="font-mono text-slate-100 select-all overflow-x-auto">
                .\start-api.ps1
              </pre>
            </div>
            <p className="text-xs text-slate-400">
              Catatan: Riwayat job render tersimpan di memori server sementara dan akan tereset
              setiap kali server backend dimatikan atau dimulai ulang.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white hover:bg-white/[0.14] disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Memeriksa...' : 'Coba Hubungkan Ulang'}</span>
        </button>
      </div>
    </div>
  );
}
