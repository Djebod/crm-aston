import { NextResponse } from "next/server";
import { sql, raw, waktuJakarta } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await raw(`SELECT id AS "ID", geo_no AS "GeoNo", event_title AS "EventTitle", company AS "Company",
      data AS "Data", created_at AS "CreatedAt", created_by AS "CreatedBy" FROM geo ORDER BY created_at DESC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const data = typeof b.data === "string" ? b.data : JSON.stringify(b.data || {});

    if (b.action === "addGeo") {
      const id = "GEO" + Date.now();
      await sql`INSERT INTO geo (id, geo_no, event_title, company, data, created_at, created_by)
        VALUES (${id}, ${b.geoNo || ""}, ${b.eventTitle || ""}, ${b.company || ""}, ${data}, ${waktuJakarta()}, ${b.oleh || ""})`;
      return NextResponse.json({ status: "ok", id });
    }
    if (b.action === "updateGeo") {
      if (!b.id) return NextResponse.json({ status: "error", message: "ID tidak ada." });
      await sql`UPDATE geo SET geo_no = ${b.geoNo || ""}, event_title = ${b.eventTitle || ""}, company = ${b.company || ""}, data = ${data} WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }
    if (b.action === "hapusGeo") {
      await sql`DELETE FROM geo WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }
    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
