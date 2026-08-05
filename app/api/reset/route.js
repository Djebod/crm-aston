import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, token, password } = await req.json();
    const em = String(email || "").toLowerCase().trim();
    if (!em || !token || !password) return NextResponse.json({ status: "error", message: "Data tidak lengkap." });
    if (String(password).length < 6) return NextResponse.json({ status: "error", message: "Password minimal 6 karakter." });

    const ref = db.collection("users").doc(em);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ status: "error", message: "Akun tidak ditemukan." });
    const u = snap.data();
    if (!u.ResetToken || u.ResetToken !== token) return NextResponse.json({ status: "error", message: "Link reset tidak valid." });
    if (Date.now() > Number(u.ResetExpiry || 0)) return NextResponse.json({ status: "error", message: "Link reset sudah kedaluwarsa. Minta ulang." });

    await ref.update({ PasswordHash: bcrypt.hashSync(String(password), 10), ResetToken: "", ResetExpiry: 0 });
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
