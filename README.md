# Aston CRM — Sales Leads Event & Booking

Aplikasi CRM untuk mencatat & memantau prospek event dan booking Aston Cirebon.
Multi-user (Bang Syam sebagai super admin + tim marketing), dengan upload dokumen (KTP/foto/file).

**Teknologi:** Next.js 14 (Vercel) → Google Apps Script → Google Sheets (data) + Google Drive (dokumen).

---

## Fitur

- Login aman (password di-hash bcrypt, tidak pernah disimpan polos)
- Pipeline: **Baru → Follow Up → Penawaran → Negosiasi → Deal → Batal**
- Tambah / edit prospek, ubah status cepat dari kartu
- Upload dokumen prospek ke Google Drive (link otomatis masuk ke Sheet)
- Ringkasan: total prospek, sedang proses, nilai pipeline, nilai deal
- Cari & filter status
- Tombol WhatsApp langsung dari nomor prospek
- **Kelola Tim** (khusus super admin): tambah akun marketing

---

## URUTAN SETUP (ikuti dari atas ke bawah)

### 1) Siapkan Google Sheet (database)

1. Buka https://sheets.google.com → **Blank**.
2. Buat **tab pertama** beri nama `Leads`. Baris pertama isi judul kolom ini (satu kolom satu sel, urutan persis):
   ```
   ID | Tanggal | Nama | Instansi | NoHP | Email | JenisEvent | TanggalEvent | JumlahPax | EstimasiNilai | Sumber | Status | PIC | Catatan | LinkDokumen | UpdatedAt
   ```
3. Buat **tab kedua** beri nama `Users`. Baris pertama:
   ```
   Email | Nama | PasswordHash | Role | Aktif
   ```

### 2) Siapkan folder Google Drive (untuk dokumen)

1. Buka https://drive.google.com → **New → Folder** → beri nama `Dokumen-CRM-Aston`.
2. Buka folder itu, lihat URL-nya. Salin **ID folder** (bagian setelah `/folders/`).

### 3) Pasang Apps Script (jembatan)

1. Di Google Sheet tadi: menu **Extensions → Apps Script**.
2. Hapus kode contoh, buka file `apps-script/Code.gs` di proyek ini, salin **semua** isinya ke sana.
3. Ganti baris `FOLDER_ID = "PASTE_ID_FOLDER_DRIVE_DISINI"` dengan ID folder Drive dari langkah 2.
4. Klik **Deploy → New deployment** → ikon gerigi → pilih **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
5. Klik **Deploy** → **Authorize access** (izinkan akun Anda).
6. Salin **Web app URL** → inilah **`API_URL`**. Simpan dulu.

> Kalau nanti mengubah `Code.gs`: **Deploy → Manage deployments → Edit (pensil) → Version: New version → Deploy**.

### 4) Buat hash password super admin

Password asli tidak pernah disimpan — hanya hash-nya. Di komputer (perlu Node.js):

```bash
npm install bcryptjs
node -e "console.log(require('bcryptjs').hashSync('PASSWORD_ANDA', 10))"
```

Ganti `PASSWORD_ANDA` dengan password pilihan Anda. Salin hasilnya (mulai `$2a$10$...`).

### 5) Jalankan di komputer (uji coba lokal)

1. Salin file `.env.local.example` menjadi `.env.local`, lalu isi:
   ```
   API_URL=（tempel Web app URL dari langkah 3)
   ADMIN_EMAIL=syam.rakhmany@gmail.com
   ADMIN_NAME=Bang Syam
   ADMIN_PASSWORD_HASH=（tempel hash dari langkah 4)
   ```
2. Di terminal folder proyek:
   ```bash
   npm install
   npm run dev
   ```
3. Buka http://localhost:3000 → login pakai email super admin + password asli Anda.

---

## UPLOAD KE GITHUB (step-by-step)

**Pertama kali (sekali saja):**

1. Buka https://github.com/new → nama repo `crm-aston` → pilih **Private** → **Create repository**.
2. Di terminal folder proyek, jalankan satu per satu:
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

**Kalau muncul error antar-PC (dubious ownership / konflik):**
```bash
git config --global --add safe.directory "*"
git pull --rebase
git push
```

---

## DEPLOY KE VERCEL (step-by-step)

1. Buka https://vercel.com → **Login with GitHub**.
2. **Add New… → Project** → pilih repo `crm-aston` → **Import**.
3. Di bagian **Environment Variables**, isi 4 ini (sama seperti `.env.local`):
   - `API_URL`
   - `ADMIN_EMAIL` = `syam.rakhmany@gmail.com`
   - `ADMIN_NAME` = `Bang Syam`
   - `ADMIN_PASSWORD_HASH` = hash bcrypt Anda
4. Klik **Deploy** → tunggu selesai → dapat link `https://crm-aston.vercel.app`.
5. Update berikutnya cukup `git push`, Vercel deploy otomatis (±1 menit).

**Pakai domain sendiri (opsional):** Project → **Settings → Domains → Add** → ikuti instruksi DNS (kelola di Squarespace Domains).

---

## Menambah anggota tim marketing

Login sebagai super admin → tombol **Kelola Tim** → isi nama, email, password, role → **Tambah User**.
Password anggota otomatis di-hash bcrypt sebelum masuk ke Sheet. Mereka lalu bisa login sendiri.

---

## Catatan keamanan (jujur)

- Password (admin & tim) **hanya disimpan sebagai hash bcrypt**, tidak bisa dibaca balik.
- Data rahasia ada di **Environment Variable Vercel**, bukan di GitHub. File `.env*` sudah masuk `.gitignore`.
- Ini alat internal tim. Sesi login disimpan di browser (localStorage) — cukup untuk pemakaian tim, tapi belum sekuat sistem sesi/token penuh. Kalau nanti perlu lebih ketat (misal audit siapa mengubah apa, atau anti-akses paksa), bisa ditingkatkan ke session cookie + verifikasi tiap request.

---

## Checklist akhir

- [ ] Tab `Leads` & `Users` sudah dibuat dengan judul kolom persis.
- [ ] `FOLDER_ID` di `Code.gs` sudah diisi.
- [ ] Apps Script sudah di-deploy sebagai Web App (`Anyone`), `API_URL` didapat.
- [ ] Hash password dibuat, dimasukkan ke Environment Variable.
- [ ] `.env.local` terisi & `npm run dev` jalan.
- [ ] Repo GitHub `Djebod/crm-aston` terisi.
- [ ] Vercel ter-deploy dengan 4 Environment Variables.
