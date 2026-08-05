# Aston CRM — versi Firebase (foto di Google Drive)

CRM Leads Event & Booking Aston Cirebon. Database di **Firebase Firestore**, foto kegiatan tetap di **Google Drive**.

**Arsitektur:** Next.js (Vercel) -> **Firestore** (data) + **Google Drive** (foto, via Apps Script kecil) + **Gmail SMTP** (email reset).
Semua akses Firestore lewat **server** (Firebase Admin SDK). Tidak perlu upgrade Blaze — cukup paket **Spark (gratis)**.

Tampilan & alur pemakaian **sama persis** seperti versi Google Sheets — yang berubah hanya "mesin" di belakang.

---

## Struktur data (otomatis dibuat di Firestore)
- `users` (id = email huruf kecil): Email, Nama, PasswordHash, Role, Aktif, ResetToken, ResetExpiry
- `leads` (id = ID lead): kolom lead + AlasanCancel, UpdatedBy
- `aktivitas` (id = ID): kolom aktivitas + Photo (link Google Drive)
- `companies` (id = nama huruf kecil -> otomatis unik): CompanyName, Segmentation
- `log_status`: riwayat perubahan status (Waktu, LeadID, Nama, StatusLama, StatusBaru, AlasanCancel, Oleh)

---

# LANGKAH SETUP (urut dari atas)

## 1) Buat project Firebase
1. https://console.firebase.google.com -> **Add project** -> beri nama -> selesai.
2. Catat **Project ID** (di Project settings).

## 2) Aktifkan Firestore
1. Menu kiri **Build -> Firestore Database** -> **Create database**.
2. **Production mode** -> lokasi `asia-southeast2` (Jakarta) -> Enable.

## 3) Pasang aturan Firestore
1. **Firestore -> Rules** -> hapus isi -> tempel isi file `firestore.rules` -> **Publish**.
> Storage TIDAK dipakai (foto di Google Drive), jadi tidak perlu upgrade Blaze dan tidak ada langkah Storage rules.

## 4) Buat Service Account (kunci server Firestore)
1. **Project settings** (gerigi) -> tab **Service accounts** -> **Generate new private key** -> **Generate key**.
2. Ganti nama file jadi `serviceAccountKey.json`, taruh di **root folder proyek**.
3. RAHASIA — sudah di `.gitignore`, jangan di-push.

## 5) Pasang Apps Script untuk upload foto ke Drive
1. https://script.google.com -> **New project** -> tempel isi `apps-script-upload/Code.gs`.
   (FOLDER_ID sudah terisi folder Drive Anda: `1v_vC83UUEKpw9HkK3VKNrFYpurQ2pHxO`.)
2. **Deploy -> New deployment -> Web app** -> Execute as: **Me** | Who has access: **Anyone** -> **Deploy**.
3. **Authorize access** (izinkan akses Drive) -> salin **Web app URL**.
4. URL itu jadi nilai `DRIVE_UPLOAD_URL` (dipakai di langkah 8).

## 6) Buat hash password super admin
```bash
npm install bcryptjs
node -e "console.log(require('bcryptjs').hashSync('PASSWORD_ANDA', 10))"
```
Salin hasilnya (mulai `$2a$10$...`).

## 7) Buat Gmail App Password (untuk email reset)
1. Aktifkan **Verifikasi 2 Langkah** di akun Google.
2. https://myaccount.google.com/apppasswords -> buat App Password -> salin 16 huruf (tanpa spasi).
3. `MAIL_USER` = alamat Gmail; `MAIL_APP_PASSWORD` = 16 huruf tadi.

## 8) Isi file .env.local
1. Salin `.env.local.example` menjadi `.env.local`.
2. Isi:
   - `FIREBASE_PROJECT_ID` = `project_id` di serviceAccountKey.json
   - `FIREBASE_CLIENT_EMAIL` = `client_email` di serviceAccountKey.json
   - `FIREBASE_PRIVATE_KEY` = `private_key` di serviceAccountKey.json — **1 baris**, dibungkus kutip, tiap baris baru jadi `\n`. Contoh:
     `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`
   - `DRIVE_UPLOAD_URL` = Web app URL dari langkah 5
   - `ADMIN_PASSWORD_HASH` = hash dari langkah 6
   - `MAIL_USER`, `MAIL_APP_PASSWORD` = dari langkah 7
   - `APP_URL` = `http://localhost:3000` (untuk tes lokal; ganti ke URL Vercel setelah deploy)

## 9) Migrasi data lama (Sheets -> Firestore)
> Lewati kalau ingin mulai dari kosong.
1. Di Sheet lama, ekspor tiap tab jadi CSV: **File -> Download -> .csv** untuk **Leads, Users, Aktivitas, Companies**.
2. Buat folder `migrasi/` di root, ganti nama file jadi: `Leads.csv`, `Users.csv`, `Aktivitas.csv`, `Companies.csv`.
3. Pastikan `serviceAccountKey.json` ada di root.
4. Jalankan:
   ```bash
   npm install
   npm run migrate
   ```
5. Muncul jumlah dokumen -> "Migrasi selesai". Password tim lama tetap berlaku; foto lama tetap link Drive.

## 10) Jalankan lokal
```bash
npm install
npm run dev
```
Buka http://localhost:3000 -> login super admin.

---

## UPLOAD KE GITHUB
Pertama kali:
```bash
git init
git add .
git commit -m "CRM Aston versi Firebase (foto di Google Drive)"
git branch -M main
git remote add origin https://github.com/Djebod/crm-aston.git
git push -u origin main
```
Berikutnya: `git add .` -> `git commit -m "..."` -> `git push`.
> Cek `git status`: `.env.local` dan `serviceAccountKey.json` TIDAK boleh muncul.

---

## DEPLOY KE VERCEL
1. https://vercel.com -> Add New -> Project -> pilih repo -> Import.
2. Isi **Environment Variables** (sama seperti `.env.local`):
   `APP_URL`, `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD_HASH`,
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
   `DRIVE_UPLOAD_URL`, `MAIL_USER`, `MAIL_APP_PASSWORD`.
   - `FIREBASE_PRIVATE_KEY` di Vercel: tempel nilai sama seperti `.env.local` **tanpa tanda kutip**; biarkan `\n` apa adanya.
3. **Deploy** -> dapat link. Ganti `APP_URL` ke URL final -> **Redeploy**.

---

## Catatan keamanan
- Password hanya disimpan sebagai **hash bcrypt**.
- Kunci Firebase & Gmail hanya di **Environment Variable** (server).
- `serviceAccountKey.json` & `.env.local` tidak boleh masuk GitHub (sudah di `.gitignore`).
- Firestore Rules mengunci akses klien — semua data lewat server aplikasi.

## Checklist
- [ ] Project Firebase + Firestore aktif (Spark gratis; TANPA Storage/Blaze).
- [ ] Rules Firestore dipasang.
- [ ] serviceAccountKey.json di root (lokal).
- [ ] Apps Script upload foto ter-deploy; DRIVE_UPLOAD_URL didapat.
- [ ] .env.local terisi lengkap (9 variabel).
- [ ] (Opsional) Migrasi CSV berhasil.
- [ ] npm run dev jalan & bisa login.
- [ ] Repo GitHub tanpa file rahasia; Vercel ter-deploy + env lengkap + APP_URL final.
