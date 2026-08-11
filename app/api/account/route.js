import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const CATATAN = "Akun super admin dikelola lewat Environment Variable, bukan dari halaman ini.";

export async function POST(req) {
  try {
    const body = await req.json();
    const em = String(body.email || "").toLowerCase().trim();
    if (!em) return NextResponse.json({ status: "error", message: "Email tidak ada." });
    const rows = await sql`SELECT nama AS "Nama", password_hash AS "PasswordHash", role AS "Role" FROM users WHERE email = ${em}`;

    if (body.action === "updateProfile") {
      if (!rows.length) return NextResponse.json({ status: "error", message: CATATAN });
      await sql`UPDATE users SET nama = ${body.nama || ""} WHERE email = ${em}`;
      return NextResponse.json({ status: "ok", user: { email: em, nama: body.nama || "", role: rows[0].Role || "marketing" } });
    }

    if (body.action === "changePassword") {
      if (!rows.length) return NextResponse.json({ status: "error", message: CATATAN });
      if (!bcrypt.compareSync(String(body.currentPassword || ""), rows[0].PasswordHash || "")) {
        return NextResponse.json({ status: "error", message: "Password lama salah." });
      }
      if (String(body.newPassword || "").length < 6) return NextResponse.json({ status: "error", message: "Password baru minimal 6 karakter." });
      await sql`UPDATE users SET password_hash = ${bcrypt.hashSync(String(body.newPassword), 10)} WHERE email = ${em}`;
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "error", message: "Aksi tidak dikenal." });
  } catch (e) { return NextResponse.json({ status: "error", message: e?.message || String(e) }); }
}
