import { NextResponse } from "next/server";
import { asGet } from "@/lib/appscript";

export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await asGet("companies");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
