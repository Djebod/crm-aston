// Migrasi data dari CSV (ekspor Google Sheets) ke Firestore.
// Cara pakai (baca README bagian "Migrasi data"):
//   1) Ekspor tiap tab Sheet jadi CSV, taruh di folder ./migrasi/
//      -> Leads.csv, Users.csv, Aktivitas.csv, Companies.csv
//   2) Letakkan serviceAccountKey.json di root proyek
//   3) Jalankan: npm run migrate
import admin from "firebase-admin";
import fs from "fs";

if (!fs.existsSync("./serviceAccountKey.json")) {
  console.error("serviceAccountKey.json tidak ada di root proyek. Unduh dari Firebase lalu letakkan di sini.");
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

function splitCsvLine(line) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
  }
  out.push(cur);
  return out;
}
function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const o = {}; header.forEach((h, idx) => (o[h] = (cols[idx] ?? "").trim()));
    rows.push(o);
  }
  return rows;
}
function baca(nama) {
  const p = "./migrasi/" + nama;
  if (!fs.existsSync(p)) { console.log("Lewati (tidak ada file):", nama); return []; }
  return parseCSV(fs.readFileSync(p, "utf8"));
}
function boolAktif(v) {
  const s = String(v).toLowerCase();
  return !(s === "false" || s === "0" || s === "no" || s === "tidak");
}
async function tulis(coll, rows, idFn, mapFn) {
  let n = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    rows.slice(i, i + 400).forEach((r) => {
      const id = idFn(r);
      if (!id) return;
      batch.set(db.collection(coll).doc(String(id)), mapFn(r));
      n++;
    });
    await batch.commit();
  }
  console.log(`${coll}: ${n} dokumen`);
}

const run = async () => {
  await tulis("users", baca("Users.csv"),
    (r) => String(r.Email || "").toLowerCase().trim(),
    (r) => ({
      Email: String(r.Email || "").toLowerCase().trim(), Nama: r.Nama || "", PasswordHash: r.PasswordHash || "",
      Role: r.Role || "marketing", Aktif: boolAktif(r.Aktif), ResetToken: "", ResetExpiry: 0,
    }));

  await tulis("leads", baca("Leads.csv"),
    (r) => r.ID,
    (r) => ({
      ID: r.ID, Tanggal: r.Tanggal || "", Nama: r.Nama || "", Instansi: r.Instansi || "", NoHP: r.NoHP || "",
      Email: r.Email || "", JenisEvent: r.JenisEvent || "", TanggalEvent: r.TanggalEvent || "", JumlahPax: r.JumlahPax || "",
      EstimasiNilai: r.EstimasiNilai || "", Sumber: r.Sumber || "", Status: r.Status || "Tentative", PIC: r.PIC || "",
      Catatan: r.Catatan || "", LinkDokumen: r.LinkDokumen || "", UpdatedAt: r.UpdatedAt || "",
      AlasanCancel: r.AlasanCancel || "", UpdatedBy: r.UpdatedBy || "",
    }));

  await tulis("aktivitas", baca("Aktivitas.csv"),
    (r) => r.ID,
    (r) => ({
      ID: r.ID, Date: r.Date || "", Time: r.Time || "", SalesName: r.SalesName || "", CompanyName: r.CompanyName || "",
      Segmentation: r.Segmentation || "", PICName: r.PICName || "", Position: r.Position || "", PhoneNumber: r.PhoneNumber || "",
      Description: r.Description || "", Activity: r.Activity || "", Photo: r.Photo || "",
    }));

  await tulis("companies", baca("Companies.csv"),
    (r) => String(r.CompanyName || "").toLowerCase().trim(),
    (r) => ({ CompanyName: r.CompanyName || "", Segmentation: r.Segmentation || "" }));

  console.log("✅ Migrasi selesai.");
  process.exit(0);
};
run().catch((e) => { console.error(e); process.exit(1); });
