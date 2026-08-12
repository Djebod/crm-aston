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
    alasan_cancel TEXT, updated_by TEXT, perlu_kamar TEXT, jumlah_kamar TEXT, revenue_room TEXT )`,
  `CREATE TABLE IF NOT EXISTS aktivitas (
    id TEXT PRIMARY KEY, tanggal TEXT, jam TEXT, sales_name TEXT, company_name TEXT,
    segmentation TEXT, pic_name TEXT, position TEXT, phone_number TEXT, description TEXT,
    activity TEXT, photo TEXT, alamat TEXT )`,
  `CREATE TABLE IF NOT EXISTS log_status (
    id BIGSERIAL PRIMARY KEY, waktu TEXT, lead_id TEXT, nama TEXT,
    status_lama TEXT, status_baru TEXT, alasan_cancel TEXT, oleh TEXT )`,
  `CREATE INDEX IF NOT EXISTS idx_companies_seg ON companies (segmentation)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status)`,
  `CREATE INDEX IF NOT EXISTS idx_aktivitas_activity ON aktivitas (activity)`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS perlu_kamar TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS jumlah_kamar TEXT`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS revenue_room TEXT`,
  `CREATE TABLE IF NOT EXISTS call_plan (
    id TEXT PRIMARY KEY, tanggal_rencana TEXT, sales_name TEXT, company_name TEXT,
    pic_name TEXT, phone TEXT, tujuan TEXT, status TEXT DEFAULT 'Plan',
    tanggal_realisasi TEXT, hasil TEXT, created_at TEXT, created_by TEXT )`,
  `CREATE INDEX IF NOT EXISTS idx_callplan_sales ON call_plan (sales_name)`,
  `CREATE INDEX IF NOT EXISTS idx_callplan_status ON call_plan (status)`,
];
