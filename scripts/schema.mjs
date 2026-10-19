export const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY, nama TEXT, password_hash TEXT,
    role TEXT DEFAULT 'marketing', aktif BOOLEAN DEFAULT true,
    reset_token TEXT, reset_expiry BIGINT )`,
  `CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, company_name TEXT NOT NULL, segmentation TEXT, alamat TEXT )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, tanggal TEXT, nama TEXT, instansi TEXT, nohp TEXT, email TEXT,
    jenis_event TEXT, tanggal_event TEXT, jumlah_pax TEXT, estimasi_nilai TEXT, sumber TEXT,
    status TEXT, pic TEXT, catatan TEXT, link_dokumen TEXT, updated_at TEXT,
    alasan_cancel TEXT, updated_by TEXT, perlu_kamar TEXT, jumlah_kamar TEXT, revenue_room TEXT,
    tindak_lanjut TEXT, tanggal_tindak_lanjut TEXT )`,
  `CREATE TABLE IF NOT EXISTS aktivitas (
    id TEXT PRIMARY KEY, tanggal TEXT, jam TEXT, sales_name TEXT, company_name TEXT,
    segmentation TEXT, pic_name TEXT, position TEXT, phone_number TEXT, description TEXT,
    activity TEXT, photo TEXT, alamat TEXT, tujuan TEXT, valid TEXT )`,
  `CREATE TABLE IF NOT EXISTS log_status (
    id BIGSERIAL PRIMARY KEY, waktu TEXT, lead_id TEXT, nama TEXT,
    status_lama TEXT, status_baru TEXT, alasan_cancel TEXT, oleh TEXT )`,
  `CREATE INDEX IF NOT EXISTS idx_companies_seg ON companies (segmentation)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status)`,
  `CREATE INDEX IF NOT EXISTS idx_aktivitas_activity ON aktivitas (activity)`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS perlu_kamar TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS jumlah_kamar TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue_room TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS tindak_lanjut TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS tanggal_tindak_lanjut TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type TEXT`,
  `CREATE TABLE IF NOT EXISTS sales_target (
    sales_name TEXT PRIMARY KEY, target_revenue TEXT, target_activity_day TEXT )`,
  `ALTER TABLE aktivitas ADD COLUMN IF NOT EXISTS tujuan TEXT`,
  `ALTER TABLE aktivitas ADD COLUMN IF NOT EXISTS valid TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS kode TEXT`,
  // Gambar tanda tangan (data URL PNG) untuk dokumen OL / CL / GEO
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS ttd TEXT`,
  `CREATE TABLE IF NOT EXISTS room_booking (
    id TEXT PRIMARY KEY, room TEXT, tanggal TEXT, jam_mulai TEXT, jam_selesai TEXT,
    event_title TEXT, company TEXT, pax TEXT, setup TEXT, pic TEXT,
    status TEXT, catatan TEXT, created_at TEXT, created_by TEXT )`,
  `CREATE INDEX IF NOT EXISTS idx_booking_room_tgl ON room_booking (room, tanggal)`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS lead_id TEXT`,
  `CREATE TABLE IF NOT EXISTS doc_counter ( kode TEXT, tahun INT, last INT DEFAULT 0, PRIMARY KEY (kode, tahun) )`,
  `CREATE TABLE IF NOT EXISTS sales_target_bulan (
    sales_name TEXT, tahun INT, bulan INT,
    target_room TEXT, target_banquet TEXT, target_kunjungan TEXT,
    PRIMARY KEY (sales_name, tahun, bulan) )`,
  `CREATE TABLE IF NOT EXISTS geo (
    id TEXT PRIMARY KEY, geo_no TEXT, event_title TEXT, company TEXT,
    data TEXT, created_at TEXT, created_by TEXT )`,
  // Alur persetujuan berjenjang GEO: status, tahap yang sudah disetujui (JSON), audit trail (JSON)
  `ALTER TABLE geo ADD COLUMN IF NOT EXISTS status TEXT`,
  `ALTER TABLE geo ADD COLUMN IF NOT EXISTS approvals TEXT`,
  `ALTER TABLE geo ADD COLUMN IF NOT EXISTS audit TEXT`,
  // Hasil pengiriman alert email terakhir (JSON) untuk tombol "Kirim ulang alert"
  `ALTER TABLE geo ADD COLUMN IF NOT EXISTS alert_terakhir TEXT`,
  `CREATE TABLE IF NOT EXISTS call_plan (
    id TEXT PRIMARY KEY, tanggal_rencana TEXT, sales_name TEXT, company_name TEXT,
    pic_name TEXT, phone TEXT, tujuan TEXT, status TEXT DEFAULT 'Plan',
    tanggal_realisasi TEXT, hasil TEXT, created_at TEXT, created_by TEXT )`,
  `CREATE INDEX IF NOT EXISTS idx_callplan_sales ON call_plan (sales_name)`,
  `CREATE INDEX IF NOT EXISTS idx_callplan_status ON call_plan (status)`,
  `CREATE TABLE IF NOT EXISTS dokumen (
    id TEXT PRIMARY KEY, jenis TEXT, no_dok TEXT, lead_id TEXT,
    judul TEXT, company TEXT, data TEXT,
    created_at TEXT, created_by TEXT, updated_at TEXT, updated_by TEXT )`,
  `CREATE INDEX IF NOT EXISTS idx_dokumen_lead ON dokumen (lead_id, jenis)`,
  // Penyeragaman nama ballroom (aman diulang)
  `UPDATE room_booking SET room = 'Sapphire Grand Ballroom' WHERE room = 'Sapphire Ballroom'`,

  // ====== UCUP (meeting room booking assistant publik) ======
  // Master ruangan — menggantikan konstanta ROOMS yang dulu hardcoded di halaman Room Booking
  `CREATE TABLE IF NOT EXISTS meeting_room (
    id TEXT PRIMARY KEY, nama TEXT NOT NULL, lantai TEXT, dimensi TEXT,
    cap_theater INT, cap_class INT, cap_round INT, cap_ushape INT, cap_hollow INT,
    fasilitas TEXT, deskripsi TEXT, foto TEXT,
    tampil_publik BOOLEAN DEFAULT false, booking_langsung BOOLEAN DEFAULT false,
    urutan INT DEFAULT 0, aktif BOOLEAN DEFAULT true )`,
  // Harga publik per ruangan (hanya dipakai bila booking_langsung = true)
  `CREATE TABLE IF NOT EXISTS room_price (
    room_id TEXT PRIMARY KEY REFERENCES meeting_room(id) ON DELETE CASCADE,
    per_jam BIGINT, half_day BIGINT, full_day BIGINT, weekend_pct INT DEFAULT 0,
    catatan TEXT, updated_at TEXT, updated_by TEXT )`,
  // Pengaturan umum key-value (email sales, masa hold, dll) supaya bisa diubah tanpa deploy
  `CREATE TABLE IF NOT EXISTS pengaturan (
    kode TEXT PRIMARY KEY, nilai TEXT, keterangan TEXT, updated_at TEXT, updated_by TEXT )`,
  `INSERT INTO pengaturan (kode, nilai, keterangan) VALUES
    ('ucup_email_sales', 'sa@astoncirebon.com', 'Penerima notifikasi booking baru dari Ucup'),
    ('ucup_hold_jam', '48', 'Masa hold booking Tentative dari Ucup (jam)'),
    ('ucup_max_hari', '90', 'Maksimal booking ke depan (hari)'),
    ('ucup_aktif', 'true', 'Matikan (false) untuk menutup sementara situs Ucup'),
    ('ucup_llm', 'true', 'Pakai AI (Gemini) untuk percakapan Ucup; false = alur tombol statis'),
    ('ucup_faq', '', 'FAQ untuk Ucup (satu baris per item: Pertanyaan | Jawaban). Contoh: Parkir? | Parkir gratis di basement')
    ON CONFLICT DO NOTHING`,
  // Kolom tambahan room_booking untuk booking dari Ucup
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS sumber TEXT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS hold_until TEXT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS tamu_nama TEXT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS tamu_wa TEXT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS tamu_email TEXT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS preferensi TEXT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS request_khusus TEXT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS estimasi_harga BIGINT`,
  `ALTER TABLE room_booking ADD COLUMN IF NOT EXISTS kode_booking TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_roombooking_tgl ON room_booking (tanggal, room)`,
  // Log percakapan Ucup (analitik tahap)
  `CREATE TABLE IF NOT EXISTS ucup_log (
    id BIGSERIAL PRIMARY KEY, waktu TEXT, sesi TEXT, tahap TEXT, data TEXT, ip_hash TEXT )`,
  // Seed 11 ruangan dari data Meeting Room Dimension (aman diulang)
  `INSERT INTO meeting_room (id, nama, lantai, dimensi, cap_theater, cap_class, cap_round, cap_ushape, cap_hollow, urutan) VALUES
    ('diamond-12', 'Diamond 12', '1st Floor', '17,7 × 8 m', 120, 63, 60, 48, 36, 1),
    ('diamond-3', 'Diamond 3', '1st Floor', '8,7 × 8 m', 50, 21, 30, 39, 24, 2),
    ('diamond-5', 'Diamond 5', '1st Floor', '8,7 × 8 m', 50, 21, 30, 39, 24, 3),
    ('diamond-6', 'Diamond 6', '1st Floor', '22 × 8 m', 140, 90, 80, 66, 48, 4),
    ('diamond-7', 'Diamond 7', '1st Floor', '22 × 8 m', 140, 90, 80, 66, 48, 5),
    ('crystal', 'Crystal', 'Lobby Floor', '15,8 × 6 m', 80, 30, 50, 30, 30, 6),
    ('emerald', 'Emerald', 'Base Main Floor', '16,3 × 8 m', 120, 60, 60, 48, 36, 7),
    ('iron', 'Iron', 'Eagle', '6,3 × 6 m', 24, 18, 20, 27, 18, 8),
    ('wood', 'Wood', 'Eagle', '8 × 6 m', 40, 27, 30, 27, 18, 9),
    ('onyx', 'Onyx', '1st Floor', '26,5 × 18,6 m', 250, 180, 200, 150, 54, 10),
    ('sapphire-grand-ballroom', 'Sapphire Grand Ballroom', 'Lobby Floor', '35,3 × 48,5 m', 1445, 504, 720, 345, 345, 11)
    ON CONFLICT (id) DO NOTHING`,
];
