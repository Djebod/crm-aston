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

## Persetujuan berjenjang GEO
Alur: **Sales (Ajukan) → Sales Leader → Front Office Manager → Financial Controller → General Manager**.
- Di **Kelola Tim**, beri role `leader`, `fom`, `fc`, atau `gm` kepada orang yang berwenang, dan pastikan masing-masing sudah mengunggah tanda tangan (Profil Saya → Tanda tangan).
- Tanda tangan digital di PDF **hanya tercetak untuk tahap yang sudah di-acknowledge**; tahap yang belum, ruangnya kosong.
- Mengubah isi GEO setelah diajukan akan **mereset seluruh persetujuan** (harus diajukan ulang). Penyetuju juga bisa **mengembalikan** GEO ke sales dengan alasan.
- Halaman terakhir PDF berisi **audit trail**: jenjang persetujuan (siapa, kapan, catatan) dan riwayat aktivitas dokumen (dibuat, diubah, diajukan, acknowledge, dikembalikan, unduh PDF).
- Admin dapat bertindak di tahap mana pun sebagai cadangan; hal itu tercatat di audit trail sebagai "dilakukan oleh admin mewakili …".
- Kolom baru di tabel `geo` (`status`, `approvals`, `audit`) dibuat otomatis saat API pertama kali dipanggil, atau lewat `npm run init-db`.

## Alert email persetujuan GEO (Apps Script)
Setiap langkah alur persetujuan mengirim email otomatis lewat **Google Apps Script** (`apps-script-alert-geo/Code.gs`), tanpa perlu SMTP tambahan:

| Kejadian | Email ke | CC |
|---|---|---|
| Sales **Ajukan** / penyetuju **Acknowledge** | semua user aktif dengan role tahap berikutnya (`leader` → `fom` → `fc` → `gm`) | sales pembuat |
| GEO **dikembalikan** | sales pembuat | semua `leader` |
| GM **Approve** (disetujui penuh) | sales pembuat + semua penyetuju | – |

Bila tidak ada user dengan role tersebut (atau email sales tidak ditemukan), email jatuh ke `ADMIN_EMAIL`. Email berisi tombol tautan `/geo?id=…` yang langsung membuka modal persetujuan GEO itu.
Hasil pengiriman terakhir tampil di modal **Riwayat → Notifikasi Email**, dan ada tombol **🔔 Kirim ulang alert email** (admin, leader, sales pembuat, atau penyetuju yang sedang giliran). Gagal kirim email **tidak** membatalkan persetujuan.

### Cara setting (sekali saja)
1. Buka https://script.google.com → **New project** → beri nama `Alert GEO Aston CRM`.
2. Hapus isi editor, tempel seluruh isi `apps-script-alert-geo/Code.gs` → **Save** (ikon disket).
3. Di baris paling atas ganti `TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA"` dengan teks rahasia bebas, minimal 20 karakter (contoh: `aston-geo-2026-xK9mQ2pL`). Simpan.
4. Di toolbar pilih fungsi **`tesKirim`** → klik **Run** → **Review permissions** → pilih akun Gmail pengirim → **Advanced → Go to … (unsafe)** → **Allow**.
   Cek inbox akun itu: harus masuk email berjudul *[Perlu Acknowledge] GEO … TES alert GEO*. Kalau sudah masuk, script berfungsi.
5. **Deploy → New deployment** → ikon gerigi pilih **Web app** → isi:
   - Description: `alert geo`
   - Execute as: **Me**
   - Who has access: **Anyone**
   → **Deploy** → salin **Web app URL** (berakhiran `/exec`).
6. Vercel → project → **Settings → Environment Variables**, tambahkan:
   - `GEO_ALERT_URL` = Web app URL tadi
   - `GEO_ALERT_TOKEN` = token yang sama persis dengan langkah 3
   Lalu **Deployments → ⋯ → Redeploy**.
7. Pastikan di **Kelola Tim** setiap penyetuju punya **email yang benar** dan role `leader` / `fom` / `fc` / `gm`, karena alamat penerima diambil dari sana.
8. Uji: ajukan satu GEO → Sales Leader harus menerima email. Jika tidak, buka **Riwayat** GEO itu → bagian **Notifikasi Email** menampilkan alasan gagal, lalu klik **Kirim ulang alert email** setelah diperbaiki.

### Catatan
- Pengirim email = akun Google yang melakukan deploy. Pakai akun kantor (mis. `itm@astoncirebon.com`) supaya nama pengirimnya resmi. Kuota MailApp: 100 email/hari untuk Gmail biasa, 1.500/hari untuk Google Workspace.
- Mengubah kode script = wajib **Deploy → Manage deployments → ✎ → Version: New version → Deploy** agar URL yang sama memakai kode baru.
- Kolom `alert_terakhir` di tabel `geo` dibuat otomatis (atau `npm run init-db`).
- Lokal tanpa `GEO_ALERT_URL`: fitur alert diam (tidak error), tombol kirim ulang memberi pesan "GEO_ALERT_URL belum di-set".
