import { NextResponse } from "next/server";
import { sql, raw, waktuJakarta } from "@/lib/db";

export const runtime = "nodejs";
// Jangan di-cache saat build: data harus selalu diambil segar dari database.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dokumen tersimpan: Offering Letter (OL/OLW) & Confirmation Letter (CL).
// Disimpan supaya bisa dibuka & diedit lagi tanpa mengetik ulang dari awal.
let _siap = false;
async function pastikanTabel() {
  if (_siap) return;
  await raw(`CREATE TABLE IF NOT EXISTS dokumen (
    id TEXT PRIMARY KEY, jenis TEXT, no_dok TEXT, lead_id TEXT,
    judul TEXT, company TEXT, data TEXT,
    created_at TEXT, created_by TEXT, updated_at TEXT, updated_by TEXT )`);
  await raw(`CREATE INDEX IF NOT EXISTS idx_dokumen_lead ON dokumen (lead_id, jenis)`);
  _siap = true;
}

export async function GET(req) {
  try {
    await pastikanTabel();
    const u = new URL(req.url);
    const leadId = (u.searchParams.get("leadId") || "").trim();
    const jenis = (u.searchParams.get("jenis") || "").trim();

    if (leadId) {
      const rows = jenis
        ? await sql`SELECT * FROM dokumen WHERE lead_id = ${leadId} AND jenis = ${jenis} ORDER BY updated_at DESC`
        : await sql`SELECT * FROM dokumen WHERE lead_id = ${leadId} ORDER BY updated_at DESC`;
      return NextResponse.json({ status: "ok", data: rows });
    }

    const rows = await raw(
      `SELECT id, jenis, no_dok, lead_id, judul, company, created_at, created_by, updated_at, updated_by
       FROM dokumen ORDER BY updated_at DESC LIMIT 200`
    );
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    await pastikanTabel();
    const b = await req.json();
    const data = typeof b.data === "string" ? b.data : JSON.stringify(b.data || {});
    const oleh = b.oleh || "";
    const now = waktuJakarta();

    if (b.action === "simpan") {
      if (b.id) {
        const ada = await sql`SELECT 1 FROM dokumen WHERE id = ${b.id}`;
        if (ada.length) {
          await sql`UPDATE dokumen SET no_dok = ${b.noDok || ""}, judul = ${b.judul || ""},
            company = ${b.company || ""}, data = ${data}, updated_at = ${now}, updated_by = ${oleh}
            WHERE id = ${b.id}`;
          return NextResponse.json({ status: "ok", id: b.id });
        }
      }
      const id = (b.jenis || "DOK") + Date.now();
      await sql`INSERT INTO dokumen (id, jenis, no_dok, lead_id, judul, company, data, created_at, created_by, updated_at, updated_by)
        VALUES (${id}, ${b.jenis || ""}, ${b.noDok || ""}, ${b.leadId || ""}, ${b.judul || ""},
                ${b.company || ""}, ${data}, ${now}, ${oleh}, ${now}, ${oleh})`;
      return NextResponse.json({ status: "ok", id });
    }

    if (b.action === "hapus") {
      if (!b.id) return NextResponse.json({ status: "error", message: "ID tidak ada." });
      await sql`DELETE FROM dokumen WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
