import { NextResponse } from "next/server";
import { sql, raw, waktuJakarta } from "@/lib/db";

export const runtime = "nodejs";

const SEL = `SELECT id AS "ID", tanggal_rencana AS "TanggalRencana", sales_name AS "SalesName",
  company_name AS "CompanyName", pic_name AS "PICName", phone AS "Phone", tujuan AS "Tujuan",
  status AS "Status", tanggal_realisasi AS "TanggalRealisasi", hasil AS "Hasil",
  created_at AS "CreatedAt", created_by AS "CreatedBy" FROM call_plan`;

export async function GET() {
  try {
    const rows = await raw(`${SEL} ORDER BY tanggal_rencana DESC, id DESC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();

    if (b.action === "addPlan") {
      if (!b.tanggalRencana) return NextResponse.json({ status: "error", message: "Tanggal rencana wajib diisi." });
      if (!b.salesName) return NextResponse.json({ status: "error", message: "Sales wajib diisi." });
      const id = "CP" + Date.now();
      await sql`INSERT INTO call_plan (id, tanggal_rencana, sales_name, company_name, pic_name, phone, tujuan, status, tanggal_realisasi, hasil, created_at, created_by)
        VALUES (${id}, ${b.tanggalRencana}, ${b.salesName || ""}, ${b.companyName || ""}, ${b.picName || ""}, ${b.phone || ""}, ${b.tujuan || ""}, ${"Plan"}, ${""}, ${""}, ${waktuJakarta()}, ${b.oleh || ""})`;
      return NextResponse.json({ status: "ok", id });
    }

    if (b.action === "realisasi") {
      if (!b.id) return NextResponse.json({ status: "error", message: "ID tidak ada." });
      const tgl = b.tanggalRealisasi || waktuJakarta().slice(0, 10);
      await sql`UPDATE call_plan SET status = ${"Realisasi"}, tanggal_realisasi = ${tgl}, hasil = ${b.hasil || ""} WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }

    if (b.action === "batal") {
      if (!b.id) return NextResponse.json({ status: "error", message: "ID tidak ada." });
      await sql`UPDATE call_plan SET status = ${"Batal"}, hasil = ${b.hasil || ""} WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }

    if (b.action === "updatePlan") {
      if (!b.id) return NextResponse.json({ status: "error", message: "ID tidak ada." });
      await sql`UPDATE call_plan SET tanggal_rencana = ${b.tanggalRencana || ""}, sales_name = ${b.salesName || ""},
        company_name = ${b.companyName || ""}, pic_name = ${b.picName || ""}, phone = ${b.phone || ""}, tujuan = ${b.tujuan || ""}
        WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
