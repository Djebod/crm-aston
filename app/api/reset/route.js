import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { asPost } from "@/lib/appscript";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email, token, password } = await req.json();
    if (!email || !token || !password) {
      return NextResponse.json({ status: "error", message: "Data tidak lengkap." });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ status: "error", message: "Password minimal 6 karakter." });
    }
    const passwordHash = bcrypt.hashSync(String(password), 10);
    const r = await asPost({
      action: "doReset",
      email: String(email).toLowerCase().trim(),
      token,
      passwordHash,
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
