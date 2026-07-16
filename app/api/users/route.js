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

// Daftar user tim (hanya super admin)
export async function GET(req) {
  const requester = req.headers.get("x-user-email");
  if (!isSuperAdmin(requester)) {
    return NextResponse.json({ status: "error", message: "Hanya super admin." }, { status: 403 });
  }
  try {
    const r = await asPost({ action: "listUsers" });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: String(e) });
  }
}

// Tambah user tim baru (hanya super admin). Password langsung di-hash bcrypt.
export async function POST(req) {
  try {
    const body = await req.json();
    if (!isSuperAdmin(body.requesterEmail)) {
      return NextResponse.json(
        { status: "error", message: "Hanya super admin yang bisa menambah user." },
        { status: 403 }
      );
    }
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
    return NextResponse.json({ status: "error", message: String(e) });
  }
}
