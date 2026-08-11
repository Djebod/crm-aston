import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, token, password } = await req.json();
    const em = String(email || "").toLowerCase().trim();
    if (!em || !token || !password) return NextResponse.json({ status: "error", message: "Data tidak lengkap." });
    if (String(password).length < 6) return NextResponse.json({ status: "error", message: "Password minimal 6 karakter." });

    const rows = await sql`SELECT reset_token AS "ResetToken", reset_expiry AS "ResetExpiry" FROM users WHERE email = ${em}`;
    if (!rows.length) return NextResponse.json({ status: "error", message: "Tautan tidak valid." });
    const u = rows[0];
    if (!u.ResetToken || u.ResetToken !== token) return NextResponse.json({ status: "error", message: "Tautan tidak valid." });
    if (!u.ResetExpiry || Date.now() > Number(u.ResetExpiry)) return NextResponse.json({ status: "error", message: "Tautan sudah kedaluwarsa. Minta ulang." });

    await sql`UPDATE users SET password_hash = ${bcrypt.hashSync(String(password), 10)}, reset_token = ${""}, reset_expiry = ${0} WHERE email = ${em}`;
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
