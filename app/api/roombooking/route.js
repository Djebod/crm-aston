import { NextResponse } from "next/server";
import { sql, raw, waktuJakarta } from "@/lib/db";

export const runtime = "nodejs";

const SEL = `SELECT id AS "ID", room AS "Room", tanggal AS "Tanggal", jam_mulai AS "JamMulai", jam_selesai AS "JamSelesai",
  event_title AS "EventTitle", company AS "Company", pax AS "Pax", setup AS "Setup", pic AS "PIC",
  status AS "Status", catatan AS "Catatan", created_at AS "CreatedAt", created_by AS "CreatedBy" FROM room_booking`;

function menit(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// Cek bentrok: ruangan sama, tanggal sama, dan jeda < 120 menit (atau overlap)
async function adaBentrok(b) {
  const rows = await sql`SELECT id, jam_mulai, jam_selesai FROM room_booking
    WHERE room = ${b.room} AND tanggal = ${b.tanggal} AND status <> ${"Cancel"} AND id <> ${b.id || ""}`;
  const s = menit(b.jamMulai), e = menit(b.jamSelesai);
  if (s === null || e === null) return null;
  for (const r of rows) {
    const rs = menit(r.jam_mulai), re = menit(r.jam_selesai);
    if (rs === null || re === null) continue;
    // aman jika ada jeda >= 120 menit di antara dua booking
    const aman = s >= re + 120 || rs >= e + 120;
    if (!aman) return r;
  }
  return null;
}

export async function GET() {
  try {
    const rows = await raw(`${SEL} ORDER BY tanggal DESC, jam_mulai ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();

    if (b.action === "setStatus") {
      await sql`UPDATE room_booking SET status = ${b.status || ""} WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }
    if (b.action === "hapus") {
      await sql`DELETE FROM room_booking WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }

    if (b.action === "addBooking" || b.action === "updateBooking") {
      if (!b.room || !b.tanggal || !b.jamMulai || !b.jamSelesai) return NextResponse.json({ status: "error", message: "Ruangan, tanggal, dan jam wajib diisi." });
      if (menit(b.jamSelesai) <= menit(b.jamMulai)) return NextResponse.json({ status: "error", message: "Jam selesai harus setelah jam mulai." });
      if (String(b.status) !== "Cancel") {
        const bentrok = await adaBentrok(b);
        if (bentrok) return NextResponse.json({ status: "error", message: `Bentrok dengan booking ${bentrok.jam_mulai}-${bentrok.jam_selesai} di ruangan yang sama. Minimal jeda 2 jam.` });
      }
      if (b.action === "addBooking") {
        const id = "RB" + Date.now();
        await sql`INSERT INTO room_booking (id, room, tanggal, jam_mulai, jam_selesai, event_title, company, pax, setup, pic, status, catatan, created_at, created_by)
          VALUES (${id}, ${b.room}, ${b.tanggal}, ${b.jamMulai}, ${b.jamSelesai}, ${b.eventTitle || ""}, ${b.company || ""}, ${String(b.pax || "")}, ${b.setup || ""}, ${b.pic || ""}, ${b.status || "Tentative"}, ${b.catatan || ""}, ${waktuJakarta()}, ${b.oleh || ""})`;
        return NextResponse.json({ status: "ok", id });
      } else {
        await sql`UPDATE room_booking SET room = ${b.room}, tanggal = ${b.tanggal}, jam_mulai = ${b.jamMulai}, jam_selesai = ${b.jamSelesai},
          event_title = ${b.eventTitle || ""}, company = ${b.company || ""}, pax = ${String(b.pax || "")}, setup = ${b.setup || ""}, pic = ${b.pic || ""},
          status = ${b.status || "Tentative"}, catatan = ${b.catatan || ""} WHERE id = ${b.id}`;
        return NextResponse.json({ status: "ok" });
      }
    }
    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
