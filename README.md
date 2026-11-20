# Layar2D Studio — Frontend Studio Animasi 2D Lokal

Frontend berbasis **React + TypeScript + Vite** untuk mengoperasikan backend studio animasi 2D lokal pada Windows (`http://127.0.0.1:8000`).

## Fitur Utama

1. **Dashboard Proyek**
   - Mengambil daftar proyek langsung dari backend lokal.
   - Membuat proyek baru dengan `slug` tervalidasi (`a-z`, `0-9`, `-`, `_`), judul, serta template **Kosong** atau **Demo**.
   - Menampilkan ringkasan pengaturan video dan status kesiapan proyek.

2. **Workspace Proyek (5 Tab)**
   - **Aset**: Unggah file karakter, latar, properti, narasi (audio), dan naskah via `multipart/form-data`. Menampilkan thumbnail gambar, pemutar audio, path, dan ukuran file.
   - **Cerita**: Editor storyline dan tabel shot (`id`, `start`, `end`, `line`, `scene_description`) dengan fitur tambah, edit, hapus, urutkan baris, validasi timeline berurutan dari detik `0`, sinkronisasi `duration`, serta mempertahankan field tambahan yang sudah ada.
   - **Pengaturan Video**: Atur aspect ratio (`16:9` / `9:16`), resolusi (`720p`–`2160p`), FPS (`24` / `30`), captions, dan pilihan `style` dari API.
   - **Preview & Render**: Jalankan Contact Sheet, Preview Segmen (`start`, `end`, `scale`), Render Penuh (video silent), dan Campur Audio (setelah render penuh selesai & narasi tersedia). Polling status job otomatis setiap 1 detik dengan log aktual backend dan penguncian penyuntingan proyek saat job berjalan.
   - **Hasil**: Pemutar video besar dan penampil contact sheet dari artifact job, lengkap dengan tombol **Buka** dan **Unduh**.

## Menjalankan di Windows Lokal

1. **Jalankan Backend Lokal Terlebih Dahulu**
   Masuk ke folder backend studio Anda melalui PowerShell lalu jalankan:
   ```powershell
   .\start-api.ps1
   ```
   Pastikan API aktif di `http://127.0.0.1:8000`.

2. **Konfigurasi Environment Frontend**
   Salin `.env.example` menjadi `.env` (opsional jika menggunakan URL default `http://127.0.0.1:8000`):
   ```powershell
   copy .env.example .env
   ```
   Isi `.env`:
   ```env
   VITE_STUDIO_API_URL="http://127.0.0.1:8000"
   ```

3. **Instal Dependensi & Jalankan Vite (Port 5173 strictPort)**
   ```powershell
   npm install
   npm run dev:local
   ```
   > Catatan: `vite.config.ts` sudah dikonfigurasi dengan `port: 5173` dan `strictPort: true`. Script `npm run dev:local` menjalankan Vite tepat di `http://localhost:5173` (`strictPort`), sedangkan `npm run dev` memakai `--port=3000` untuk kompatibilitas pratinjau sandbox.

## Catatan Kontrak API (`src/api/studio-client.ts`)

Seluruh komunikasi REST dipusatkan pada `src/api/studio-client.ts` dan tipe data di `src/types/studio.ts`. Jika file `studio-client.ts` atau skema `openapi.json` lokal Anda menggunakan path endpoint atau nama field respons yang sedikit berbeda, cukup sesuaikan atau ganti `src/api/studio-client.ts` tanpa perlu mengubah komponen UI.

## Batasan yang Sengaja Diterapkan

Sesuai kontrak backend lokal saat ini, frontend tidak menyediakan tombol aktif untuk fitur yang belum didukung endpoint backend:
- Hapus proyek
- Cancel render
- Auto-rigging
- Generator scene AI
- Transkripsi otomatis dari frontend
