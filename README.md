# Aston CRM — Sales Leads Event & Booking

Aplikasi CRM untuk mencatat & memantau prospek event dan booking Aston Cirebon.
Multi-user (Bang Syam sebagai super admin + tim marketing), dengan upload dokumen (KTP/foto/file).

**Teknologi:** Next.js 14 (Vercel) -> Google Apps Script -> Google Sheets (data) + Google Drive (dokumen).

---

## Fitur

- Login aman (password di-hash bcrypt, tidak pernah disimpan polos) + branding logo Aston
- Pipeline: **Baru -> Follow Up -> Penawaran -> Negosiasi -> Deal -> Batal**
- Tambah / edit prospek, ubah status cepat dari kartu
- Upload dokumen prospek ke Google Drive (link otomatis masuk ke Sheet)
- Ringkasan: total prospek, sedang proses, nilai pipeline, nilai deal
- Cari & filter status, tombol WhatsApp langsung dari nomor prospek
- **Manajemen user (admin):** tambah, edit (nama/role), aktif-nonaktifkan, dan **reset password**
- **Lupa password (self-service):** user minta tautan reset -> dikirim ke email -> buat password baru
- **Profil Saya (semua user):** ubah nama & ganti password sendiri (wajib password lama benar)
- **Lihat password:** semua kolom password punya tombol mata untuk menampilkan/menyembunyikan isian
- **Sales Activity:** catat kunjungan/aktivitas sales (Activity & Segmentation berupa pilihan, upload foto). Nama Company unik (tidak boleh dobel persis); PIC Name & Position bebas berubah tiap aktivitas.

---

## URUTAN SETUP (ikuti dari atas ke bawah)

### 1) Siapkan Google Sheet (database)

1. Buka https://sheets.google.com -> **Blank**.
2. **Tab pertama** beri nama `Leads`. Baris pertama isi judul kolom ini (urutan persis):
   ```
   ID | Tanggal | Nama | Instansi | NoHP | Email | JenisEvent | TanggalEvent | JumlahPax | EstimasiNilai | Sumber | Status | PIC | Catatan | LinkDokumen | UpdatedAt
   ```
3. **Tab kedua** beri nama `Users`. Baris pertama (7 kolom):
   ```
   Email | Nama | PasswordHash | Role | Aktif | ResetToken | ResetExpiry
   ```
   (Kolom `ResetToken` & `ResetExpiry` biarkan kosong; dipakai otomatis saat fitur lupa password.)
4. **Tab ketiga** beri nama `Aktivitas`. Baris pertama (12 kolom, urutan persis):
   ```
   ID | Date | Time | SalesName | CompanyName | Segmentation | PICName | Position | PhoneNumber | Description | Activity | Photo
   ```
5. **Tab keempat** beri nama `Companies`. Baris pertama (2 kolom):
   ```
   CompanyName | Segmentation
   ```
   (Terisi otomatis saat menambah aktivitas; nama company dijaga unik.)

### 2) Siapkan folder Google Drive (untuk dokumen)

1. Buka https://drive.google.com -> **New -> Folder** -> beri nama `Dokumen-CRM-Aston`.
2. Buka folder itu, salin **ID folder** dari URL (bagian setelah `/folders/`).

### 3) Pasang Apps Script (jembatan + pengirim email)

1. Di Google Sheet: menu **Extensions -> Apps Script**.
2. Hapus kode contoh, salin **semua** isi `apps-script/Code.gs` ke sana.
3. Ganti 2 baris di atas:
   - `FOLDER_ID` = ID folder Drive dari langkah 2.
   - `APP_URL` = URL aplikasi Anda (mis. `https://crm-aston.vercel.app`). Dipakai untuk membuat tautan reset di email. (Boleh diisi belakangan setelah dapat URL Vercel — jangan lupa re-deploy Apps Script.)
4. **Deploy -> New deployment** -> ikon gerigi -> **Web app**.
   - **Execute as:** `Me`  ·  **Who has access:** `Anyone`
5. **Deploy -> Authorize access** -> izinkan. **Penting:** karena aplikasi mengirim email reset, saat Authorize akan diminta izin **kirim email atas nama Anda** — setujui.
6. Salin **Web app URL** -> inilah **`API_URL`**.

> Kalau nanti mengubah `Code.gs`: **Deploy -> Manage deployments -> Edit (pensil) -> Version: New version -> Deploy**.

### 4) Buat hash password super admin

Password asli tidak pernah disimpan, hanya hash-nya. Di komputer (perlu Node.js):

```bash
npm install bcryptjs
node -e "console.log(require('bcryptjs').hashSync('PASSWORD_ANDA', 10))"
```

Ganti `PASSWORD_ANDA` dengan password pilihan Anda. Salin hasilnya (mulai `$2a$10$...`).

### 5) Jalankan di komputer (uji coba lokal)

1. Salin `.env.local.example` menjadi `.env.local`, lalu isi:
   ```
   API_URL=(tempel Web app URL dari langkah 3)
   ADMIN_EMAIL=syam.rakhmany@gmail.com
   ADMIN_NAME=Bang Syam
   ADMIN_PASSWORD_HASH=(tempel hash dari langkah 4)
   ```
   > **PENTING (khusus file `.env.local` lokal):** hash bcrypt mengandung tanda `$`.
   > Next.js bisa salah mengira `$` sebagai variabel. Beri tanda `\` di depan tiap `$`, contoh:
   > `ADMIN_PASSWORD_HASH=\$2a\$10\$abcdefg...`
   > (Di **Vercel** tidak perlu di-escape — isi apa adanya.)
2. Di terminal folder proyek:
   ```bash
   npm install
   npm run dev
   ```
3. Buka http://localhost:3000 -> login pakai email super admin + password asli Anda.

---

## UPLOAD KE GITHUB (step-by-step)

**Pertama kali (sekali saja):**
1. Buka https://github.com/new -> nama repo `crm-aston` -> **Private** -> **Create repository**.
2. Di terminal folder proyek:
   ```bash
   git init
   git add .
   git commit -m "Pertama kali upload aplikasi CRM Aston"
   git branch -M main
   git remote add origin https://github.com/Djebod/crm-aston.git
   git push -u origin main
   ```

**Setiap ada perubahan (WAJIB di akhir tiap update):**
```bash
git add .
git commit -m "Jelaskan perubahannya"
git push
```

**Kalau error antar-PC (dubious ownership / konflik):**
```bash
git config --global --add safe.directory "*"
git pull --rebase
git push
```

---

## DEPLOY KE VERCEL (step-by-step)

1. Buka https://vercel.com -> **Login with GitHub**.
2. **Add New... -> Project** -> pilih repo `crm-aston` -> **Import**.
3. Di **Environment Variables**, isi 4 ini (di Vercel isi apa adanya, TANPA escape `$`):
   - `API_URL`
   - `ADMIN_EMAIL` = `syam.rakhmany@gmail.com`
   - `ADMIN_NAME` = `Bang Syam`
   - `ADMIN_PASSWORD_HASH` = hash bcrypt Anda
4. **Deploy** -> dapat link `https://crm-aston.vercel.app`.
5. Setelah dapat URL, kembali ke Apps Script, isi `APP_URL` dengan URL ini, lalu **re-deploy** Apps Script (agar tautan email reset benar).
6. Update berikutnya cukup `git push`, Vercel deploy otomatis.

**Domain sendiri (opsional):** Project -> **Settings -> Domains -> Add** -> ikuti instruksi DNS (Squarespace Domains). Kalau pakai domain sendiri, samakan juga `APP_URL` di Apps Script.

---

## Cara pakai fitur user

- **Tambah/edit/reset (admin):** login sebagai admin -> tombol **Kelola Tim** -> tambah anggota, atau klik **Kelola** pada anggota untuk ubah nama/role, aktif-nonaktif, dan reset password.
- **Profil Saya (semua user):** klik nama Anda di kanan atas -> ubah nama, atau ganti password (isi password lama + password baru). Klik ikon mata untuk melihat isian password.
- **Lupa password (semua user tim):** di halaman masuk -> **Lupa password?** -> isi email -> tautan reset dikirim ke email -> buka tautan -> buat password baru (berlaku 1 jam).
- **Super admin lupa password:** buat hash baru (langkah 4), ganti `ADMIN_PASSWORD_HASH` di Vercel, lalu Redeploy. (Super admin tidak lewat email karena datanya di Environment Variable, bukan di Sheet.)

---

## Kalau login gagal "Server error: ..."

Pesan errornya sekarang menampilkan penyebab asli. Yang paling sering:
- **`API_URL belum diisi`** -> Environment Variable belum di-set / salah nama. Isi lalu **restart** `npm run dev` (lokal) atau **Redeploy** (Vercel). Env baru tidak terbaca sampai restart/redeploy.
- **Password salah** padahal benar -> hash di `.env.local` rusak karena `$` tidak di-escape (lihat langkah 5). Perbaiki jadi `\$2a\$10\$...`.
- **`ADMIN_PASSWORD_HASH belum di-set`** -> variabel itu kosong.

---

## Catatan keamanan (jujur)

- Semua password (admin & tim) disimpan **hanya sebagai hash bcrypt**, tidak bisa dibaca balik.
- Data rahasia ada di **Environment Variable Vercel**, bukan di GitHub. File `.env*` sudah masuk `.gitignore`.
- Tautan reset memakai token acak yang **kedaluwarsa 1 jam** dan sekali pakai.
- Ini alat internal tim. Sesi login disimpan di browser (localStorage) — cukup untuk pemakaian tim, belum sekuat session-token penuh. Bisa ditingkatkan bila perlu audit ketat.

---

## Checklist akhir

- [ ] Tab `Leads` (16 kolom) & `Users` (7 kolom) dibuat dengan judul persis.
- [ ] `FOLDER_ID` dan `APP_URL` di `Code.gs` sudah diisi.
- [ ] Apps Script di-deploy sebagai Web App (`Anyone`) + izin kirim email disetujui; `API_URL` didapat.
- [ ] Hash password dibuat, dimasukkan ke Environment Variable (escape `$` di lokal).
- [ ] `.env.local` terisi & `npm run dev` jalan.
- [ ] Repo GitHub `Djebod/crm-aston` terisi; Vercel ter-deploy dengan 4 Environment Variables.
