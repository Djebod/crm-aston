// Inisialisasi Firebase Admin SDK (server-side saja) — hanya Firestore.
// Lokal: otomatis pakai serviceAccountKey.json di root (paling anti-ribet).
// Vercel: file itu tidak ada (di-gitignore), jadi pakai Environment Variable.
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

if (!admin.apps.length) {
  let credential;
  const keyPath = path.join(process.cwd(), "serviceAccountKey.json");

  if (fs.existsSync(keyPath)) {
    // ---- Lokal: baca langsung dari file JSON ----
    const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    credential = admin.credential.cert(sa);
  } else {
    // ---- Vercel/produksi: dari Environment Variable ----
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    });
  }

  admin.initializeApp({ credential });
}

export const db = admin.firestore();
export { admin };

// Waktu format "yyyy-MM-dd HH:mm" zona Asia/Jakarta
export function waktuJakarta() {
  const now = new Date();
  const opt = {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  };
  const p = new Intl.DateTimeFormat("en-CA", opt).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t)?.value || "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
}
