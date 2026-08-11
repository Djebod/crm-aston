// Migrasi data dari Firestore -> Neon. Jalankan: npm run migrate
// Butuh: serviceAccountKey.json (baca Firestore) + DATABASE_URL di .env.local (tulis Neon)
import admin from "firebase-admin";
import fs from "fs";
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./_env.mjs";
import { STATEMENTS } from "./schema.mjs";

loadEnv();
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL belum ada di .env.local"); process.exit(1); }
if (!fs.existsSync("./serviceAccountKey.json")) { console.error("serviceAccountKey.json tidak ada di root."); process.exit(1); }

const sa = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const fdb = admin.firestore();
const sql = neon(process.env.DATABASE_URL);
const S = (t) => { const a = [t]; a.raw = [t]; return a; };
const TSA = (arr) => { const a = [...arr]; a.raw = [...arr]; return a; };

const cid = (n) => String(n || "").trim().toLowerCase().replace(/[/\\]+/g, "-");

async function pastikanSkema() {
  for (const st of STATEMENTS) await sql(S(st));
  console.log("• Skema Neon siap.");
}

async function migrasiUsers() {
  const snap = await fdb.collection("users").get();
  let n = 0;
  for (const d of snap.docs) {
    const u = d.data();
    await sql`INSERT INTO users (email, nama, password_hash, role, aktif, reset_token, reset_expiry)
      VALUES (${d.id.toLowerCase()}, ${u.Nama || ""}, ${u.PasswordHash || ""}, ${u.Role || "marketing"},
      ${u.Aktif === false ? false : true}, ${u.ResetToken || ""}, ${Number(u.ResetExpiry) || 0})
      ON CONFLICT (email) DO NOTHING`;
    n++;
  }
  console.log(`• users: ${n}`);
}

async function migrasiLeads() {
  const snap = await fdb.collection("leads").get();
  let n = 0;
  for (const d of snap.docs) {
    const x = d.data();
    const id = x.ID || d.id;
    await sql`INSERT INTO leads (id, tanggal, nama, instansi, nohp, email, jenis_event, tanggal_event, jumlah_pax,
      estimasi_nilai, sumber, status, pic, catatan, link_dokumen, updated_at, alasan_cancel, updated_by)
      VALUES (${id}, ${x.Tanggal || ""}, ${x.Nama || ""}, ${x.Instansi || ""}, ${x.NoHP || ""}, ${x.Email || ""},
      ${x.JenisEvent || ""}, ${x.TanggalEvent || ""}, ${String(x.JumlahPax ?? "")}, ${String(x.EstimasiNilai ?? "")},
      ${x.Sumber || ""}, ${x.Status || "Tentative"}, ${x.PIC || ""}, ${x.Catatan || ""}, ${x.LinkDokumen || ""},
      ${x.UpdatedAt || ""}, ${x.AlasanCancel || ""}, ${x.UpdatedBy || ""})
      ON CONFLICT (id) DO NOTHING`;
    n++;
  }
  console.log(`• leads: ${n}`);
}

async function migrasiAktivitas() {
  const snap = await fdb.collection("aktivitas").get();
  let n = 0;
  for (const d of snap.docs) {
    const x = d.data();
    const id = x.ID || d.id;
    await sql`INSERT INTO aktivitas (id, tanggal, jam, sales_name, company_name, segmentation, pic_name, position,
      phone_number, description, activity, photo, alamat)
      VALUES (${id}, ${x.Date || ""}, ${x.Time || ""}, ${x.SalesName || ""}, ${x.CompanyName || ""}, ${x.Segmentation || ""},
      ${x.PICName || ""}, ${x.Position || ""}, ${x.PhoneNumber || ""}, ${x.Description || ""}, ${x.Activity || ""},
      ${x.Photo || ""}, ${x.Alamat || ""})
      ON CONFLICT (id) DO NOTHING`;
    n++;
  }
  console.log(`• aktivitas: ${n}`);
}

async function migrasiCompanies() {
  const snap = await fdb.collection("companies").get();
  const rows = [];
  snap.docs.forEach((d) => {
    const x = d.data();
    const nm = x.CompanyName || d.id;
    if (nm) rows.push([cid(nm), nm, x.Segmentation || "", x.Alamat || ""]);
  });
  const CH = 500;
  for (let i = 0; i < rows.length; i += CH) {
    const chunk = rows.slice(i, i + CH);
    const parts = ["INSERT INTO companies (id, company_name, segmentation, alamat) VALUES ("];
    const values = [];
    chunk.forEach((r, idx) => {
      values.push(r[0], r[1], r[2], r[3]);
      parts.push(",", ",", ",");
      parts.push(idx < chunk.length - 1 ? "),(" : ") ON CONFLICT (id) DO NOTHING");
    });
    await sql(TSA(parts), ...values);
  }
  console.log(`• companies: ${rows.length}`);
}

async function migrasiLog() {
  const snap = await fdb.collection("log_status").get();
  let n = 0;
  for (const d of snap.docs) {
    const x = d.data();
    await sql`INSERT INTO log_status (waktu, lead_id, nama, status_lama, status_baru, alasan_cancel, oleh)
      VALUES (${x.Waktu || ""}, ${x.LeadID || ""}, ${x.Nama || ""}, ${x.StatusLama || ""}, ${x.StatusBaru || ""},
      ${x.AlasanCancel || ""}, ${x.Oleh || ""})`;
    n++;
  }
  console.log(`• log_status: ${n}`);
}

await pastikanSkema();
for (const [nama, fn] of [["users", migrasiUsers], ["leads", migrasiLeads], ["aktivitas", migrasiAktivitas], ["companies", migrasiCompanies], ["log_status", migrasiLog]]) {
  try { await fn(); }
  catch (e) {
    console.error(`✗ Gagal migrasi ${nama}:`, e?.message || e);
    if (nama === "companies") console.error("  (Kalau ini karena kuota Firestore habis, tunggu reset harian ATAU import ulang company dari CSV lewat aplikasi.)");
  }
}
console.log("✅ Selesai.");
process.exit(0);
