import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

const CATATAN_SUPERADMIN = "Akun super admin dikelola lewat Environment Variable, bukan dari halaman ini.";

export async function POST(req) {
  try {
    const body = await req.json();
    const em = String(body.email || "").toLowerCase().trim();
    if (!em) return NextResponse.json({ status: "error", message: "Email tidak ada." });
    const ref = db.collection("users").doc(em);
    const snap = await ref.get();

    if (body.action === "updateProfile") {
      if (!snap.exists) return NextResponse.json({ status: "error", message: CATATAN_SUPERADMIN });
      await ref.update({ Nama: body.nama || "" });
      return NextResponse.json({ status: "ok", user: { email: em, nama: body.nama || "", role: snap.data().Role || "marketing" } });
    }

    if (body.action === "changePassword") {
      if (!snap.exists) return NextResponse.json({ status: "error", message: CATATAN_SUPERADMIN });
      const u = snap.data();
      if (!bcrypt.compareSync(String(body.currentPassword || ""), u.PasswordHash || "")) {
        return NextResponse.json({ status: "error", message: "Password lama salah." });
      }
      if (String(body.newPassword || "").length < 6) return NextResponse.json({ status: "error", message: "Password baru minimal 6 karakter." });
      await ref.update({ PasswordHash: bcrypt.hashSync(String(body.newPassword), 10) });
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "error", message: "Aksi tidak dikenal." });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
