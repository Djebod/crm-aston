// Koneksi Neon Postgres (serverless). Inisialisasi LAZY.
import { neon } from "@neondatabase/serverless";

let _client = null;
function client() {
  if (!_client) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum di-set.");
    _client = neon(process.env.DATABASE_URL);
  }
  return _client;
}

// Bikin array mirip template-string (punya .raw) supaya diterima driver neon
function tsa(arr) {
  const a = [...arr];
  a.raw = [...arr];
  return a;
}

// Query pakai tagged template: await sql`SELECT ... ${nilai}`
export function sql(strings, ...values) {
  return client()(strings, ...values);
}

// SQL mentah tanpa parameter (SELECT statis, DDL): await raw("SELECT ...")
export function raw(text) {
  return client()(tsa([text]));
}

// SQL dinamis berparameter: parts = potongan string (panjang = values.length + 1)
// contoh: exec(["UPDATE t SET a = ", " WHERE id = ", ""], [nilaiA, idNilai])
export function exec(parts, values) {
  return client()(tsa(parts), ...values);
}

// Pastikan kolom tanda tangan ada. Dipanggil sebelum query yang memakai users.ttd,
// supaya fitur tanda tangan tetap jalan walau `npm run init-db` belum dijalankan.
let _ttdSiap = false;
export async function pastikanKolomTtd() {
  if (_ttdSiap) return;
  await raw(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ttd TEXT`);
  _ttdSiap = true;
}

// Pastikan kolom alur persetujuan GEO ada (status, approvals, audit),
// supaya fitur tetap jalan walau `npm run init-db` belum dijalankan.
let _geoSiap = false;
export async function pastikanKolomGeo() {
  if (_geoSiap) return;
  await raw(`ALTER TABLE geo ADD COLUMN IF NOT EXISTS status TEXT`);
  await raw(`ALTER TABLE geo ADD COLUMN IF NOT EXISTS approvals TEXT`);
  await raw(`ALTER TABLE geo ADD COLUMN IF NOT EXISTS audit TEXT`);
  await raw(`ALTER TABLE geo ADD COLUMN IF NOT EXISTS alert_terakhir TEXT`);
  _geoSiap = true;
}

// ID company aman (huruf kecil, garis miring diganti '-')
export function companyId(nama) {
  const id = String(nama || "").trim().toLowerCase().replace(/[/\\]+/g, "-");
  return id === "." || id === ".." ? "_" + id : id;
}

// Waktu "yyyy-MM-dd HH:mm" zona Asia/Jakarta
export function waktuJakarta() {
  const opt = { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false };
  const p = new Intl.DateTimeFormat("en-CA", opt).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value || "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
}
