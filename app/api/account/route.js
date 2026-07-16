import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { asPost } from "@/lib/appscript";

export const runtime = "nodejs";

const CATATAN_SUPERADMIN =
  "Akun super admin dikelola lewat Environment Variable, bukan dari halaman ini.";

async function cariUser(email) {
  const r = await asPost({ action: "auth", email: String(email).toLowerCase().trim() });
  return r && r.user;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ status: "error", message: "Email tidak ada." });

    // Ubah nama sendiri
    if (body.action === "updateProfile") {
      const u = await cariUser(email);
      if (!u) return NextResponse.json({ status: "error", message: CATATAN_SUPERADMIN });
      const r = await asPost({ action: "updateUser", email, nama: body.nama || "" });
      return NextResponse.json({ ...r, user: { email, nama: body.nama || "", role: u.Role || "marketing" } });
    }

    // Ganti password sendiri (wajib password lama benar)
    if (body.action === "changePassword") {
      const u = await cariUser(email);
      if (!u) return NextResponse.json({ status: "error", message: CATATAN_SUPERADMIN });
      if (!bcrypt.compareSync(String(body.currentPassword || ""), u.PasswordHash || "")) {
        return NextResponse.json({ status: "error", message: "Password lama salah." });
      }
      if (String(body.newPassword || "").length < 6) {
        return NextResponse.json({ status: "error", message: "Password baru minimal 6 karakter." });
      }
      const passwordHash = bcrypt.hashSync(String(body.newPassword), 10);
      const r = await asPost({ action: "updateUser", email, passwordHash });
      return NextResponse.json(r);
    }

    return NextResponse.json({ status: "error", message: "Aksi tidak dikenal." });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
