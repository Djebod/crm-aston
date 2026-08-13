import { NextResponse } from "next/server";
import { sql, raw } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await raw(`SELECT sales_name AS "SalesName", target_revenue AS "TargetRevenue", target_activity_day AS "TargetActivityDay" FROM sales_target ORDER BY sales_name ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action === "setTarget") {
      const nm = String(b.salesName || "").trim();
      if (!nm) return NextResponse.json({ status: "error", message: "Nama sales wajib." });
      const rev = String(Number(String(b.targetRevenue ?? "").replace(/[^\d]/g, "")) || 0);
      const day = String(Number(String(b.targetActivityDay ?? "").replace(/[^\d]/g, "")) || 0);
      await sql`INSERT INTO sales_target (sales_name, target_revenue, target_activity_day)
        VALUES (${nm}, ${rev}, ${day})
        ON CONFLICT (sales_name) DO UPDATE SET target_revenue = ${rev}, target_activity_day = ${day}`;
      return NextResponse.json({ status: "ok" });
    }
    if (b.action === "hapusTarget") {
      await sql`DELETE FROM sales_target WHERE sales_name = ${String(b.salesName || "").trim()}`;
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
