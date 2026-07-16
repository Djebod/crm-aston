import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { asPost } from "@/lib/appscript";

export const runtime = "nodejs";

function isSuperAdmin(email) {
  return (
    String(email || "").toLowerCase().trim() ===
    String(process.env.ADMIN_EMAIL || "").toLowerCase().trim()
  );
}

// Boleh kelola user jika: super admin (env) ATAU user dengan role "admin" & aktif di Sheet
async function bolehKelola(email) {
  if (isSuperAdmin(email)) return true;
  try {
    const r = await asPost({ action: "auth", email });
    const u = r && r.user;
    return !!u && String(u.Role) === "admin" && String(u.Aktif).toLowerCase() !== "false";
  } catch {
    return false;
  }
}

// Daftar user tim
export async function GET(req) {
  const requester = req.headers.get("x-user-email");
  if (!(await bolehKelola(requester))) {
    return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });
  }
  try {
    const r = await asPost({ action: "listUsers" });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

// Tambah (addUser) / Edit (updateUser). Reset password = updateUser dengan field password.
export async function POST(req) {
  try {
    const body = await req.json();
    if (!(await bolehKelola(body.requesterEmail))) {
      return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });
    }

    if (body.action === "updateUser") {
      const payload = { action: "updateUser", email: body.email };
      if (body.nama !== undefined) payload.nama = body.nama;
      if (body.role !== undefined) payload.role = body.role;
      if (body.aktif !== undefined) payload.aktif = body.aktif;
      if (body.password) payload.passwordHash = bcrypt.hashSync(String(body.password), 10);
      const r = await asPost(payload);
      return NextResponse.json(r);
    }

    // default: tambah user baru
    if (!body.email || !body.password) {
      return NextResponse.json({ status: "error", message: "Email & password wajib diisi." });
    }
    const passwordHash = bcrypt.hashSync(String(body.password), 10);
    const r = await asPost({
      action: "addUser",
      email: body.email,
      nama: body.nama || "",
      passwordHash,
      role: body.role || "marketing",
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
