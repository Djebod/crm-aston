import { NextResponse } from "next/server";
import { sql, raw, exec, companyId } from "@/lib/db";

export const runtime = "nodejs";

function ok(extra) { return NextResponse.json({ status: "ok", ...(extra || {}) }); }
function err(m) { return NextResponse.json({ status: "error", message: m }); }

export async function GET() {
  try {
    const rows = await raw(`SELECT company_name AS "CompanyName", segmentation AS "Segmentation", alamat AS "Alamat" FROM companies ORDER BY company_name ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) { return err(e?.message || String(e)); }
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (body.action === "addCompany") {
      const nama = String(body.companyName || "").trim();
      const alamat = String(body.alamat || "").trim();
      if (!nama) return err("Nama company wajib diisi.");
      if (!alamat) return err("Alamat Lengkap wajib diisi.");
      const cid = companyId(nama);
      const ada = await sql`SELECT 1 FROM companies WHERE id = ${cid}`;
      if (ada.length) return err("Company dengan nama itu sudah ada.");
      await sql`INSERT INTO companies (id, company_name, segmentation, alamat) VALUES (${cid}, ${nama}, ${body.segmentation || ""}, ${alamat})`;
      return ok();
    }

    if (body.action === "updateCompany") {
      const nama = String(body.companyName || "").trim();
      const alamat = String(body.alamat || "").trim();
      if (!alamat) return err("Alamat Lengkap wajib diisi.");
      await sql`UPDATE companies SET segmentation = ${body.segmentation || ""}, alamat = ${alamat} WHERE id = ${companyId(nama)}`;
      return ok();
    }

    if (body.action === "importCompanies") {
      const rows = body.rows || [];
      const existing = await raw(`SELECT id FROM companies`);
      const ada = new Set(existing.map((r) => r.id));
      const baru = [];
      for (const r of rows) {
        const nm = String(r.companyName || "").trim();
        if (!nm) continue;
        const cid = companyId(nm);
        if (ada.has(cid)) continue;
        ada.add(cid);
        baru.push([cid, nm, r.segmentation || "", r.alamat || ""]);
      }
      const CH = 500;
      for (let i = 0; i < baru.length; i += CH) {
        const chunk = baru.slice(i, i + CH);
        const parts = ["INSERT INTO companies (id, company_name, segmentation, alamat) VALUES ("];
        const values = [];
        chunk.forEach((row, idx) => {
          values.push(row[0], row[1], row[2], row[3]);
          parts.push(",", ",", ",");
          parts.push(idx < chunk.length - 1 ? "),(" : ") ON CONFLICT (id) DO NOTHING");
        });
        await exec(parts, values);
      }
      return ok({ ditambah: baru.length });
    }

    return err("action tidak dikenal");
  } catch (e) { return err(e?.message || String(e)); }
}
