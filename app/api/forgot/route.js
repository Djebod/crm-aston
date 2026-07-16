import { NextResponse } from "next/server";
import { asPost } from "@/lib/appscript";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ status: "error", message: "Email wajib diisi." });
    await asPost({ action: "requestReset", email: String(email).toLowerCase().trim() });
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
