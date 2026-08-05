import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

function isSuperAdmin(email) {
  return String(email || "").toLowerCase().trim() === String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
}
async function bolehKelola(email) {
  if (isSuperAdmin(email)) return true;
  const em = String(email || "").toLowerCase().trim();
  if (!em) return false;
  const snap = await db.collection("users").doc(em).get();
  if (!snap.exists) return false;
  const u = snap.data();
  return String(u.Role) === "admin" && u.Aktif !== false && String(u.Aktif).toLowerCase() !== "false";
}

export async function GET(req) {
  const requester = req.headers.get("x-user-email");
  if (!(await bolehKelola(requester))) return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });
  try {
    const snap = await db.collection("users").get();
    const data = snap.docs.map((d) => { const u = d.data(); return { Email: u.Email, Nama: u.Nama, Role: u.Role, Aktif: u.Aktif }; });
    return NextResponse.json({ status: "ok", data });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!(await bolehKelola(body.requesterEmail))) return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });

    if (body.action === "updateUser") {
      const em = String(body.email || "").toLowerCase().trim();
      const ref = db.collection("users").doc(em);
      if (!(await ref.get()).exists) return NextResponse.json({ status: "error", message: "User tidak ditemukan" });
      const upd = {};
      if (body.nama !== undefined) upd.Nama = body.nama;
      if (body.role !== undefined) upd.Role = body.role;
      if (body.aktif !== undefined) upd.Aktif = body.aktif;
      if (body.password) upd.PasswordHash = bcrypt.hashSync(String(body.password), 10);
      await ref.update(upd);
      return NextResponse.json({ status: "ok" });
    }

    // tambah user baru
    if (!body.email || !body.password) return NextResponse.json({ status: "error", message: "Email & password wajib diisi." });
    const em = String(body.email).toLowerCase().trim();
    const ref = db.collection("users").doc(em);
    if ((await ref.get()).exists) return NextResponse.json({ status: "error", message: "Email sudah terdaftar." });
    await ref.set({
      Email: em, Nama: body.nama || "", PasswordHash: bcrypt.hashSync(String(body.password), 10),
      Role: body.role || "marketing", Aktif: true, ResetToken: "", ResetExpiry: 0,
    });
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
