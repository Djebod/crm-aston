import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
export const runtime = "nodejs";

// Peek nomor berikutnya (tidak menaikkan counter)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kode = String(searchParams.get("kode") || "").toUpperCase();
    const tahun = parseInt(searchParams.get("tahun") || "0", 10);
    if (!kode || !tahun) return NextResponse.json({ status: "error", message: "kode & tahun wajib" });
    const rows = await sql`SELECT last FROM doc_counter WHERE kode = ${kode} AND tahun = ${tahun}`;
    const last = rows.length ? Number(rows[0].last) : 0;
    return NextResponse.json({ status: "ok", next: last + 1 });
  } catch (e) { return NextResponse.json({ status: "error", message: e?.message || String(e) }); }
}

// Bump counter saat dokumen benar-benar dibuat
export async function POST(req) {
  try {
    const b = await req.json();
    const kode = String(b.kode || "").toUpperCase();
    const tahun = parseInt(b.tahun, 10);
    const nomor = parseInt(b.nomor, 10) || 0;
    if (!kode || !tahun) return NextResponse.json({ status: "error", message: "kode & tahun wajib" });
    await sql`INSERT INTO doc_counter (kode, tahun, last) VALUES (${kode}, ${tahun}, ${nomor})
      ON CONFLICT (kode, tahun) DO UPDATE SET last = GREATEST(doc_counter.last, ${nomor})`;
    const rows = await sql`SELECT last FROM doc_counter WHERE kode = ${kode} AND tahun = ${tahun}`;
    return NextResponse.json({ status: "ok", last: rows.length ? Number(rows[0].last) : nomor });
  } catch (e) { return NextResponse.json({ status: "error", message: e?.message || String(e) }); }
}
