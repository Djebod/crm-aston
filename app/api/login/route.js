import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const em = String(email || "").toLowerCase().trim();
    if (!em || !password) return NextResponse.json({ ok: false, message: "Email dan password wajib diisi." });

    const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (adminEmail && em === adminEmail) {
      const hash = process.env.ADMIN_PASSWORD_HASH || "";
      if (!hash) return NextResponse.json({ ok: false, message: "ADMIN_PASSWORD_HASH belum di-set." });
      if (bcrypt.compareSync(password, hash)) {
        return NextResponse.json({ ok: true, user: { email: em, nama: process.env.ADMIN_NAME || "Super Admin", role: "admin" } });
      }
      return NextResponse.json({ ok: false, message: "Password salah." });
    }

    const rows = await sql`SELECT email AS "Email", nama AS "Nama", password_hash AS "PasswordHash", role AS "Role", aktif AS "Aktif" FROM users WHERE email = ${em}`;
    if (!rows.length) return NextResponse.json({ ok: false, message: "Akun tidak ditemukan." });
    const u = rows[0];
    if (u.Aktif === false) return NextResponse.json({ ok: false, message: "Akun ini non-aktif." });
    if (!bcrypt.compareSync(password, u.PasswordHash || "")) return NextResponse.json({ ok: false, message: "Password salah." });
    return NextResponse.json({ ok: true, user: { email: u.Email, nama: u.Nama, role: u.Role || "marketing" } });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Server error: " + (e?.message || String(e)) });
  }
}
