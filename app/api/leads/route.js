import { NextResponse } from "next/server";
import { sql, raw, exec, waktuJakarta } from "@/lib/db";

export const runtime = "nodejs";

async function logStatus(id, nama, lama, baru, alasan, oleh) {
  await sql`INSERT INTO log_status (waktu, lead_id, nama, status_lama, status_baru, alasan_cancel, oleh)
            VALUES (${waktuJakarta()}, ${id}, ${nama || ""}, ${lama || ""}, ${baru || ""}, ${alasan || ""}, ${oleh || ""})`;
}

const SEL = `SELECT id AS "ID", tanggal AS "Tanggal", nama AS "Nama", instansi AS "Instansi", nohp AS "NoHP",
  email AS "Email", jenis_event AS "JenisEvent", tanggal_event AS "TanggalEvent", jumlah_pax AS "JumlahPax",
  estimasi_nilai AS "EstimasiNilai", sumber AS "Sumber", status AS "Status", pic AS "PIC", catatan AS "Catatan",
  link_dokumen AS "LinkDokumen", updated_at AS "UpdatedAt", alasan_cancel AS "AlasanCancel", updated_by AS "UpdatedBy",
  perlu_kamar AS "PerluKamar", jumlah_kamar AS "JumlahKamar", revenue_room AS "RevenueRoom"
  FROM leads`;

export async function GET() {
  try {
    const rows = await raw(`${SEL} ORDER BY tanggal ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();

    if (b.action === "addLead") {
      const id = "L" + Date.now();
      const now = waktuJakarta();
      const status = b.status || "Tentative";
      await sql`INSERT INTO leads (id, tanggal, nama, instansi, nohp, email, jenis_event, tanggal_event, jumlah_pax,
        estimasi_nilai, sumber, status, pic, catatan, link_dokumen, updated_at, alasan_cancel, updated_by,
        perlu_kamar, jumlah_kamar, revenue_room)
        VALUES (${id}, ${now}, ${b.nama || ""}, ${b.instansi || ""}, ${b.nohp || ""}, ${b.email || ""},
        ${b.jenisEvent || ""}, ${b.tanggalEvent || ""}, ${String(b.jumlahPax ?? "")}, ${String(b.estimasiNilai ?? "")},
        ${b.sumber || ""}, ${status}, ${b.pic || ""}, ${b.catatan || ""}, ${""}, ${now}, ${b.alasanCancel || ""}, ${b.oleh || ""},
        ${b.perluKamar || ""}, ${String(b.jumlahKamar ?? "")}, ${String(b.revenueRoom ?? "")})`;
      await logStatus(id, b.nama || "", "-", status, b.alasanCancel || "", b.oleh || "");
      return NextResponse.json({ status: "ok", id });
    }

    if (b.action === "updateLead") {
      const cur = await sql`SELECT status AS "Status", nama AS "Nama" FROM leads WHERE id = ${b.id}`;
      if (!cur.length) return NextResponse.json({ status: "error", message: "ID tidak ditemukan" });
      const old = cur[0];

      const map = { nama: "nama", instansi: "instansi", nohp: "nohp", email: "email", jenisEvent: "jenis_event",
        tanggalEvent: "tanggal_event", jumlahPax: "jumlah_pax", estimasiNilai: "estimasi_nilai", sumber: "sumber",
        status: "status", pic: "pic", catatan: "catatan", alasanCancel: "alasan_cancel",
        perluKamar: "perlu_kamar", jumlahKamar: "jumlah_kamar", revenueRoom: "revenue_room" };
      const cols = [];
      for (const k in map) {
        if (b[k] !== undefined) cols.push({ col: map[k], val: (k === "estimasiNilai" || k === "jumlahPax" || k === "jumlahKamar" || k === "revenueRoom") ? String(b[k]) : b[k] });
      }
      cols.push({ col: "updated_at", val: waktuJakarta() });
      if (b.oleh !== undefined) cols.push({ col: "updated_by", val: b.oleh || "" });

      const parts = ["UPDATE leads SET " + cols[0].col + " = "];
      for (let i = 1; i < cols.length; i++) parts.push(", " + cols[i].col + " = ");
      parts.push(" WHERE id = ");
      parts.push("");
      const values = cols.map((c) => c.val).concat([b.id]);
      await exec(parts, values);

      if (b.status !== undefined && String(b.status) !== String(old.Status || "")) {
        await logStatus(b.id, b.nama || old.Nama || "", old.Status || "", b.status, b.alasanCancel || "", b.oleh || "");
      }
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
