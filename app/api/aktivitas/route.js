import { NextResponse } from "next/server";
import { sql, raw, companyId } from "@/lib/db";
import { uploadFotoDrive } from "@/lib/drive";

export const runtime = "nodejs";

const SEL = `SELECT id AS "ID", tanggal AS "Date", jam AS "Time", sales_name AS "SalesName",
  company_name AS "CompanyName", segmentation AS "Segmentation", pic_name AS "PICName", position AS "Position",
  phone_number AS "PhoneNumber", description AS "Description", activity AS "Activity", photo AS "Photo", alamat AS "Alamat"
  FROM aktivitas`;

export async function GET() {
  try {
    const rows = await raw(`${SEL} ORDER BY id ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action !== "addActivity") return NextResponse.json({ status: "error", message: "action tidak dikenal" });

    const id = "A" + Date.now();
    const comp = String(b.companyName || "").trim();
    if (comp) {
      await sql`INSERT INTO companies (id, company_name, segmentation, alamat)
                VALUES (${companyId(comp)}, ${comp}, ${b.segmentation || ""}, ${""})
                ON CONFLICT (id) DO NOTHING`;
    }
    let foto = "";
    if (b.fotoBase64) foto = await uploadFotoDrive(b.fotoBase64, id + "_" + (b.fotoNama || "foto"));

    await sql`INSERT INTO aktivitas (id, tanggal, jam, sales_name, company_name, segmentation, pic_name, position,
      phone_number, description, activity, photo, alamat)
      VALUES (${id}, ${b.date || ""}, ${b.time || ""}, ${b.salesName || ""}, ${comp}, ${b.segmentation || ""},
      ${b.picName || ""}, ${b.position || ""}, ${b.phone || ""}, ${b.description || ""}, ${b.activity || ""},
      ${foto}, ${b.alamat || ""})`;
    return NextResponse.json({ status: "ok", id, photo: foto });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
