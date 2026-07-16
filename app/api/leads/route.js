import { NextResponse } from "next/server";
import { asGet, asPost } from "@/lib/appscript";

export const runtime = "nodejs";

// Ambil semua leads
export async function GET() {
  try {
    const r = await asGet("leads");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: String(e) });
  }
}

// Tambah / update lead (action ada di dalam body: "addLead" | "updateLead")
export async function POST(req) {
  try {
    const body = await req.json();
    const r = await asPost(body);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: String(e) });
  }
}
