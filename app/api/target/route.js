import { NextResponse } from "next/server";
import { raw, sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await raw(`SELECT sales_name AS "SalesName", tahun AS "Tahun", bulan AS "Bulan",
      target_room AS "TargetRoom", target_banquet AS "TargetBanquet", target_kunjungan AS "TargetKunjungan"
      FROM sales_target_bulan ORDER BY sales_name ASC, tahun ASC, bulan ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action === "setTarget") {
      const nama = String(b.salesName || "").trim();
      const th = parseInt(b.tahun, 10), bl = parseInt(b.bulan, 10);
      if (!nama || !th || !bl) return NextResponse.json({ status: "error", message: "Sales, tahun, dan bulan wajib." });
      await sql`INSERT INTO sales_target_bulan (sales_name, tahun, bulan, target_room, target_banquet, target_kunjungan)
        VALUES (${nama}, ${th}, ${bl}, ${String(b.targetRoom || "0")}, ${String(b.targetBanquet || "0")}, ${String(b.targetKunjungan || "0")})
        ON CONFLICT (sales_name, tahun, bulan) DO UPDATE SET
          target_room = ${String(b.targetRoom || "0")}, target_banquet = ${String(b.targetBanquet || "0")}, target_kunjungan = ${String(b.targetKunjungan || "0")}`;
      return NextResponse.json({ status: "ok" });
    }
    if (b.action === "hapusTarget") {
      await sql`DELETE FROM sales_target_bulan WHERE sales_name = ${b.salesName} AND tahun = ${parseInt(b.tahun, 10)} AND bulan = ${parseInt(b.bulan, 10)}`;
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
