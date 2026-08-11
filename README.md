# Aston CRM — versi Neon (Postgres)

CRM Leads Event & Booking Aston Cirebon. Database **Neon Postgres**, foto di **Google Drive**.

**Arsitektur:** Next.js (Vercel) -> **Neon Postgres** (data) + **Google Drive** (foto) + **Gmail SMTP** (email reset).
Tampilan & cara pakai sama seperti sebelumnya; yang berubah hanya database (dari Firestore ke Neon) agar bebas dari batas kuota baca Firestore untuk data besar.

## Kenapa pindah ke Neon?
Firestore paket gratis menagih **per dokumen dibaca**. Dengan 5.000+ company, tiap buka halaman = ribuan baca -> kuota harian cepat habis (RESOURCE_EXHAUSTED). Di Postgres, baca ribuan baris = 1 query murah, dan statistik pakai agregasi SQL.

---

# LANGKAH SETUP

## 1) Buat database Neon
1. Daftar/masuk https://neon.tech -> **New Project** (region terdekat, mis. Singapore).
2. Setelah jadi, buka **Connection Details** -> salin **connection string** (pilih yang **Pooled**).
   Bentuk: `postgresql://user:pass@ep-xxxx-pooler.xxx.aws.neon.tech/neondb?sslmode=require`
3. Simpan sebagai `DATABASE_URL`.

## 2) Isi .env.local
Salin `.env.local.example` -> `.env.local`, isi `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `DRIVE_UPLOAD_URL`, `MAIL_*`, `APP_URL`.
(Buat hash admin: `node -e "console.log(require('bcryptjs').hashSync('PASSWORD', 10))"`.)

## 3) Buat tabel di Neon
```bash
npm install
npm run init-db
```
Akan muncul "Skema Neon siap."

## 4) Pindahkan data lama dari Firestore (opsional, sekali saja)
> Butuh `serviceAccountKey.json` (dari project Firebase lama) di root.
```bash
npm run migrate
```
- Script menyalin users, leads, aktivitas, companies, log_status ke Neon.
- **Kalau company gagal karena kuota Firestore habis:** tunggu reset harian Firestore, atau lewati — company bisa **di-import ulang dari CSV** lewat menu Company di aplikasi.
- Setelah migrasi selesai, `serviceAccountKey.json` tidak dibutuhkan lagi oleh aplikasi.

## 5) Jalankan
```bash
npm run dev
```
Buka http://localhost:3000, login super admin.

---

## DEPLOY KE VERCEL
1. Push ke GitHub (`serviceAccountKey.json` & `.env.local` tidak ikut — sudah di-gitignore).
2. Vercel -> Settings -> Environment Variables, isi:
   `APP_URL`, `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD_HASH`,
   `DATABASE_URL`, `DRIVE_UPLOAD_URL`, `MAIL_USER`, `MAIL_APP_PASSWORD`.
   - `ADMIN_PASSWORD_HASH` di Vercel: tanpa `\` (versi apa adanya).
3. **Deploy** -> set `APP_URL` ke URL final -> Redeploy.

> Aplikasi tidak lagi memakai Firebase. Variabel `FIREBASE_*` boleh dihapus dari Vercel.

## Catatan
- Foto tetap ke Google Drive (env `DRIVE_UPLOAD_URL`), tidak perlu Firebase Storage.
- Data & statistik dihitung dari Neon; pagination 25/halaman, chart top-10.
