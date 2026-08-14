import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

function isSuperAdmin(email) {
  return String(email || "").toLowerCase().trim() === String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
}
async function bolehKelola(email) {
  if (isSuperAdmin(email)) return true;
  const em = String(email || "").toLowerCase().trim();
  if (!em) return false;
  const r = await sql`SELECT role AS "Role", aktif AS "Aktif" FROM users WHERE email = ${em}`;
  return r.length > 0 && String(r[0].Role) === "admin" && r[0].Aktif !== false;
}

export async function GET(req) {
  const requester = req.headers.get("x-user-email");
  if (!(await bolehKelola(requester))) return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });
  try {
    const rows = await sql`SELECT email AS "Email", nama AS "Nama", role AS "Role", aktif AS "Aktif", kode AS "Kode" FROM users ORDER BY nama ASC`;
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) { return NextResponse.json({ status: "error", message: e?.message || String(e) }); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!(await bolehKelola(body.requesterEmail))) return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });

    if (body.action === "updateUser") {
      const em = String(body.email || "").toLowerCase().trim();
      const ada = await sql`SELECT 1 FROM users WHERE email = ${em}`;
      if (!ada.length) return NextResponse.json({ status: "error", message: "User tidak ditemukan" });
      if (body.nama !== undefined) await sql`UPDATE users SET nama = ${body.nama} WHERE email = ${em}`;
      if (body.role !== undefined) await sql`UPDATE users SET role = ${body.role} WHERE email = ${em}`;
      if (body.kode !== undefined) await sql`UPDATE users SET kode = ${String(body.kode || "").toUpperCase()} WHERE email = ${em}`;
      if (body.aktif !== undefined) await sql`UPDATE users SET aktif = ${!!body.aktif} WHERE email = ${em}`;
      if (body.password) await sql`UPDATE users SET password_hash = ${bcrypt.hashSync(String(body.password), 10)} WHERE email = ${em}`;
      return NextResponse.json({ status: "ok" });
    }

    if (!body.email || !body.password) return NextResponse.json({ status: "error", message: "Email & password wajib diisi." });
    const em = String(body.email).toLowerCase().trim();
    const ada = await sql`SELECT 1 FROM users WHERE email = ${em}`;
    if (ada.length) return NextResponse.json({ status: "error", message: "Email sudah terdaftar." });
    await sql`INSERT INTO users (email, nama, password_hash, role, aktif, reset_token, reset_expiry, kode)
      VALUES (${em}, ${body.nama || ""}, ${bcrypt.hashSync(String(body.password), 10)}, ${body.role || "marketing"}, true, ${""}, ${0}, ${String(body.kode || "").toUpperCase()})`;
    return NextResponse.json({ status: "ok" });
  } catch (e) { return NextResponse.json({ status: "error", message: e?.message || String(e) }); }
}
