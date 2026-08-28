// Perbaiki nama sales yang salah ketik di seluruh data.
// Cara pakai:
//   1) Isi daftar PERBAIKAN di bawah ("nama salah": "nama benar")
//   2) Jalankan: npm run fix-nama
//   (memakai DATABASE_URL dari .env.local — sama dengan yang dipakai aplikasi)

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// ---- muat DATABASE_URL dari .env.local ----
try {
  const env = readFileSync(".env.local", "utf8");
  env.split("\n").forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
} catch (e) {}

const sql = neon(process.env.DATABASE_URL);

// ====== EDIT DI SINI ======
const PERBAIKAN = {
  "Aji Sapuloh": "Aji Saepuloh",
  // "Nama Salah": "Nama Benar",
  // "Wahyu K.": "Wahyu Kusuma Dinata",
};
// ==========================

async function main() {
  const entri = Object.entries(PERBAIKAN).filter(([a, b]) => a && b && a !== b);
  if (entri.length === 0) { console.log("Tidak ada perbaikan. Isi dulu daftar PERBAIKAN di scripts/perbaiki-nama.mjs"); return; }

  for (const [salah, benar] of entri) {
    console.log(`\n➡  "${salah}"  →  "${benar}"`);

    const l = await sql`UPDATE leads SET pic = ${benar} WHERE pic = ${salah}`;
    console.log(`   leads.pic          : ${l.length ?? 0} baris (updated)`);

    const a = await sql`UPDATE aktivitas SET sales_name = ${benar} WHERE sales_name = ${salah}`;
    console.log(`   aktivitas.sales_name: ${a.length ?? 0} baris`);

    // gabungkan target: pindahkan target si "salah" ke "benar" (kalau bentrok bulan sama, target benar dipertahankan)
    await sql`INSERT INTO sales_target_bulan (sales_name, tahun, bulan, target_room, target_banquet, target_kunjungan)
      SELECT ${benar}, tahun, bulan, target_room, target_banquet, target_kunjungan FROM sales_target_bulan WHERE sales_name = ${salah}
      ON CONFLICT (sales_name, tahun, bulan) DO NOTHING`;
    const td = await sql`DELETE FROM sales_target_bulan WHERE sales_name = ${salah}`;
    console.log(`   sales_target_bulan : dipindahkan & ${td.length ?? 0} baris lama dihapus`);

    // updated_by / created_by (opsional, biar rapi)
    await sql`UPDATE leads SET updated_by = ${benar} WHERE updated_by = ${salah}`;
  }
  console.log("\n✅ Selesai. Refresh halaman Target/Leads untuk melihat hasilnya.");
}

main().catch((e) => { console.error("Gagal:", e.message || e); process.exit(1); });
