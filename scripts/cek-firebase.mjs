// Cek cepat: kredensial serviceAccountKey.json valid & punya izin tulis Firestore?
// Jalankan: npm run cek
import admin from "firebase-admin";
import fs from "fs";

if (!fs.existsSync("./serviceAccountKey.json")) {
  console.error("❌ serviceAccountKey.json tidak ada di root proyek.");
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));
console.log("----------------------------------------------------");
console.log("project_id di key :", sa.project_id);
console.log("client_email      :", sa.client_email);
console.log("----------------------------------------------------");
console.log("Pastikan project_id di atas = project Firestore Anda (achcc-sales).");
console.log("");

admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

try {
  await db.collection("_cek").doc("tes").set({ waktu: new Date().toISOString() });
  await db.collection("_cek").doc("tes").delete();
  console.log("✅ BERHASIL menulis ke Firestore. Kredensial & izin OK.");
  console.log("   Aplikasi seharusnya sudah bisa simpan data.");
  process.exit(0);
} catch (e) {
  console.error("❌ GAGAL:", e.code, "-", e.message);
  console.error("");
  if (String(e.code) === "7" || /PERMISSION_DENIED/.test(String(e.message))) {
    console.error("Penyebab: service account ini tidak punya izin di project tsb,");
    console.error("hampir selalu karena key berasal dari PROJECT LAIN.");
    console.error("Solusi: unduh key baru dari project achcc-sales (lihat instruksi).");
  }
  process.exit(1);
}
