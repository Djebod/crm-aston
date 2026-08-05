import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const em = String(email || "").toLowerCase().trim();
    if (!em || !password) return NextResponse.json({ ok: false, message: "Email dan password wajib diisi." });

    // Super admin dari Environment Variable
    const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (adminEmail && em === adminEmail) {
      const hash = process.env.ADMIN_PASSWORD_HASH || "";
      if (!hash) return NextResponse.json({ ok: false, message: "ADMIN_PASSWORD_HASH belum di-set." });
      if (bcrypt.compareSync(password, hash)) {
        return NextResponse.json({ ok: true, user: { email: em, nama: process.env.ADMIN_NAME || "Super Admin", role: "admin" } });
      }
      return NextResponse.json({ ok: false, message: "Password salah." });
    }

    // User tim dari Firestore
    const snap = await db.collection("users").doc(em).get();
    if (!snap.exists) return NextResponse.json({ ok: false, message: "Akun tidak ditemukan." });
    const u = snap.data();
    if (u.Aktif === false || String(u.Aktif).toLowerCase() === "false") {
      return NextResponse.json({ ok: false, message: "Akun ini non-aktif." });
    }
    if (!bcrypt.compareSync(password, u.PasswordHash || "")) {
      return NextResponse.json({ ok: false, message: "Password salah." });
    }
    return NextResponse.json({ ok: true, user: { email: u.Email, nama: u.Nama, role: u.Role || "marketing" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Server error: " + (e?.message || String(e)) });
  }
}
