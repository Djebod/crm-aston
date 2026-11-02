import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Login Google memakai aturan Portal Staff (Firebase project aston-cirebon):
//  1. ID token Google diverifikasi di server.
//  2. Email harus terdaftar di koleksi `users` Portal Staff dan tidak nonaktif.
//  3. Email juga harus terdaftar & aktif di tabel `users` CRM (sumber role).
const PROJECT = "aston-cirebon";

function authPortal() {
  const nama = "portal-staff";
  const app = admin.apps.find((a) => a?.name === nama) || admin.initializeApp({ projectId: PROJECT }, nama);
  return app.auth();
}

// Baca profil Portal Staff dengan token user itu sendiri (sama seperti index.html Portal Staff).
async function profilPortal(email, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: { Authorization: "Bearer " + idToken }, cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Gagal membaca data Portal Staff (" + res.status + ").");
  const f = (await res.json()).fields || {};
  return { aktif: f.aktif?.booleanValue !== false, nama: f.nama?.stringValue || "" };
}

export async function POST(req) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ ok: false, message: "Silakan login dengan Google." });

    let em = "";
    try {
      const dec = await authPortal().verifyIdToken(String(idToken));
      em = String(dec.email || "").toLowerCase().trim();
    } catch {
      return NextResponse.json({ ok: false, message: "Sesi Google tidak valid, coba login ulang." });
    }
    if (!em) return NextResponse.json({ ok: false, message: "Akun Google tidak punya email." });

    const portal = await profilPortal(em, idToken);
    if (!portal) return NextResponse.json({ ok: false, message: "Akun " + em + " belum terdaftar di database karyawan (Portal Staff)." });
    if (!portal.aktif) return NextResponse.json({ ok: false, message: "Akun Anda nonaktif. Hubungi HR." });

    const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (adminEmail && em === adminEmail) {
      return NextResponse.json({ ok: true, user: { email: em, nama: process.env.ADMIN_NAME || "Super Admin", role: "admin" } });
    }

    const rows = await sql`SELECT email AS "Email", nama AS "Nama", role AS "Role", aktif AS "Aktif", kode AS "Kode" FROM users WHERE email = ${em}`;
    if (!rows.length) return NextResponse.json({ ok: false, message: "Akun " + em + " belum terdaftar di tim CRM. Minta admin menambahkan lewat Kelola Tim." });
    const u = rows[0];
    if (u.Aktif === false) return NextResponse.json({ ok: false, message: "Akun CRM ini non-aktif." });
    return NextResponse.json({ ok: true, user: { email: u.Email, nama: u.Nama || portal.nama, role: u.Role || "marketing", kode: u.Kode || "" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Server error: " + (e?.message || String(e)) });
  }
}
