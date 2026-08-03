import { NextResponse } from "next/server";
import { asGet, asPost } from "@/lib/appscript";

export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await asGet("companies");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

// Import massal company (action: importCompanies, rows: [{companyName, segmentation}])
export async function POST(req) {
  try {
    const body = await req.json();
    const r = await asPost(body);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
