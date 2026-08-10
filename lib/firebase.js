// Firebase Admin (server-side) — inisialisasi LAZY.
// Koneksi baru dibuat saat pertama kali dipakai (runtime), BUKAN saat build.
// Lokal: pakai serviceAccountKey.json di root. Vercel: pakai Environment Variable.
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let _db = null;

function initApp() {
  if (admin.apps.length) return;
  let credential;
  const keyPath = path.join(process.cwd(), "serviceAccountKey.json");

  if (fs.existsSync(keyPath)) {
    const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    credential = admin.credential.cert(sa);
  } else {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    });
  }
  admin.initializeApp({ credential });
}

function getDb() {
  if (!_db) {
    initApp();
    _db = admin.firestore();
  }
  return _db;
}

// db "malas": koneksi baru dibuat saat properti pertama diakses (mis. db.collection(...))
export const db = new Proxy({}, {
  get(_t, prop) {
    const real = getDb();
    const val = real[prop];
    return typeof val === "function" ? val.bind(real) : val;
  },
});

export { admin };

// ID dokumen company yang aman untuk Firestore (huruf kecil, garis miring diganti '-').
// Nama asli tetap disimpan utuh di field CompanyName.
export function companyId(nama) {
  const id = String(nama || "").trim().toLowerCase().replace(/[/\\]+/g, "-");
  if (id === "." || id === "..") return "_" + id;
  return id;
}

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
