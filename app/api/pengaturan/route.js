import { NextResponse } from "next/server";
import { sql, waktuJakarta } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: semua pengaturan (key-value)
export async function GET() {
  try {
    const rows = await sql`SELECT kode, nilai, keterangan, updated_at, updated_by FROM pengaturan ORDER BY kode`;
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

// POST (admin): { action: "simpan", items: [{kode, nilai}], oleh }
export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action !== "simpan" || !Array.isArray(b.items)) return NextResponse.json({ status: "error", message: "action tidak dikenal" });
    const now = waktuJakarta();
    for (const it of b.items) {
      if (!it.kode) continue;
      await sql`UPDATE pengaturan SET nilai = ${String(it.nilai ?? "")}, updated_at = ${now}, updated_by = ${b.oleh || ""} WHERE kode = ${it.kode}`;
    }
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
