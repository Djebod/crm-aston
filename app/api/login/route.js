import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { asPost } from "@/lib/appscript";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const em = String(email || "").toLowerCase().trim();
    if (!em || !password) {
      return NextResponse.json({ ok: false, message: "Email dan password wajib diisi." });
    }

    // 1) Super admin — data dari Environment Variable (paling aman)
    const adminEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (em === adminEmail) {
      const cocok = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH || "");
      if (cocok) {
        return NextResponse.json({
          ok: true,
          user: { email: em, nama: process.env.ADMIN_NAME || "Super Admin", role: "admin" },
        });
      }
      return NextResponse.json({ ok: false, message: "Password salah." });
    }

    // 2) User tim marketing — data dari Google Sheets
    const r = await asPost({ action: "auth", email: em });
    const u = r && r.user;
    if (!u) return NextResponse.json({ ok: false, message: "Akun tidak ditemukan." });
    if (String(u.Aktif).toLowerCase() === "false") {
      return NextResponse.json({ ok: false, message: "Akun ini non-aktif." });
    }
    if (!bcrypt.compareSync(password, u.PasswordHash || "")) {
      return NextResponse.json({ ok: false, message: "Password salah." });
    }
    return NextResponse.json({
      ok: true,
      user: { email: u.Email, nama: u.Nama, role: u.Role || "marketing" },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Terjadi kesalahan server. Coba lagi." });
  }
}
