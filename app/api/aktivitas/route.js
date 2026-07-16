import { NextResponse } from "next/server";
import { asGet, asPost } from "@/lib/appscript";

export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await asGet("aktivitas");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const body = await req.json(); // action: addActivity
    const r = await asPost(body);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
