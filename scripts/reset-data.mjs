// ============================================================
//  HAPUS DATA TRANSAKSI (data dummy) — Sales CRM Aston Cirebon
// ------------------------------------------------------------
//  DIPERTAHANKAN : users (Kelola Tim) & companies (Perusahaan)
//  DIHAPUS       : leads, aktivitas, log_status, call_plan,
//                  room_booking, geo, sales_target,
//                  sales_target_bulan, doc_counter
//
//  Cara pakai:  npm run reset-data
//  Skrip akan menampilkan jumlah baris, membuat file cadangan,
//  lalu meminta Anda mengetik HAPUS sebelum benar-benar menghapus.
// ============================================================

import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "fs";
import readline from "readline";
import { loadEnv } from "./_env.mjs";

loadEnv();
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL belum ada (isi di .env.local).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const S = (t) => { const a = [t]; a.raw = [t]; return a; }; // array mirip template-string
const q = (teks) => sql(S(teks));

const DIHAPUS = [
  "leads",
  "aktivitas",
  "log_status",
  "call_plan",
  "room_booking",
  "geo",
  "sales_target",
  "sales_target_bulan",
  "doc_counter",
];
const DIPERTAHANKAN = ["users", "companies"];

async function jumlah(tabel) {
  try {
    const r = await q(`SELECT COUNT(*)::int AS n FROM ${tabel}`);
    return r[0].n;
  } catch (e) {
    return null; // tabel belum ada
  }
}

async function isiTabel(tabel) {
  try { return await q(`SELECT * FROM ${tabel}`); } catch (e) { return []; }
}

function tanya(teks) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(teks, (a) => { rl.close(); res(a); }));
}

// ---------- 1. Tampilkan isi database ----------
console.log("\n=== ISI DATABASE SAAT INI ===\n");
console.log("AKAN DIHAPUS:");
let totalHapus = 0;
for (const t of DIHAPUS) {
  const n = await jumlah(t);
  if (n === null) { console.log(`  - ${t.padEnd(20)} (tabel belum ada, dilewati)`); continue; }
  totalHapus += n;
  console.log(`  - ${t.padEnd(20)} ${n} baris`);
}
console.log("\nAKAN DIPERTAHANKAN:");
for (const t of DIPERTAHANKAN) {
  const n = await jumlah(t);
  console.log(`  ✓ ${t.padEnd(20)} ${n === null ? "(tabel belum ada)" : n + " baris"}`);
}

if (totalHapus === 0) {
  console.log("\n✅ Tidak ada data yang perlu dihapus. Selesai.");
  process.exit(0);
}

// ---------- 2. Buat file cadangan ----------
const stempel = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const namaFile = `backup-sebelum-reset-${stempel}.json`;
const cadangan = {};
for (const t of [...DIHAPUS, ...DIPERTAHANKAN]) cadangan[t] = await isiTabel(t);
writeFileSync(namaFile, JSON.stringify(cadangan, null, 2), "utf8");
console.log(`\n💾 Cadangan tersimpan: ${namaFile}`);
console.log("   (simpan file ini di tempat aman — isinya seluruh data sebelum dihapus)");

// ---------- 3. Konfirmasi ----------
console.log(`\n⚠  ${totalHapus} baris akan DIHAPUS PERMANEN dari database.`);
const jawab = await tanya('   Ketik  HAPUS  lalu Enter untuk melanjutkan (atau Enter saja untuk batal): ');
if (String(jawab).trim() !== "HAPUS") {
  console.log("\n🚫 Dibatalkan. Tidak ada data yang dihapus.");
  process.exit(0);
}

// ---------- 4. Hapus ----------
console.log("");
for (const t of DIHAPUS) {
  try {
    await q(`DELETE FROM ${t}`);
    console.log(`  🗑  ${t} dikosongkan`);
  } catch (e) {
    console.log(`  ⚠  ${t} dilewati (${e?.message || e})`);
  }
}

console.log("\n✅ Selesai. Perusahaan & Kelola Tim tetap utuh.");
console.log("   Nomor dokumen OL/OLW/CL/GEO mulai lagi dari 1.");
process.exit(0);
