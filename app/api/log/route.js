import { NextResponse } from "next/server";
import { raw } from "@/lib/db";

export const runtime = "nodejs";
// Jangan di-cache saat build: data harus selalu diambil segar dari database.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await raw(
      `SELECT waktu AS "Waktu", lead_id AS "LeadID", nama AS "Nama", status_lama AS "StatusLama",
       status_baru AS "StatusBaru", alasan_cancel AS "AlasanCancel", oleh AS "Oleh"
       FROM log_status ORDER BY id DESC`
    );
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
