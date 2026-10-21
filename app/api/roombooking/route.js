import { NextResponse } from "next/server";
import { sql, raw, waktuJakarta } from "@/lib/db";
import { kirimEmail } from "@/lib/mail";

export const runtime = "nodejs";
// Jangan di-cache saat build: data harus selalu diambil segar dari database.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEL = `SELECT id AS "ID", room AS "Room", tanggal AS "Tanggal", jam_mulai AS "JamMulai", jam_selesai AS "JamSelesai",
  event_title AS "EventTitle", company AS "Company", pax AS "Pax", setup AS "Setup", pic AS "PIC",
  status AS "Status", catatan AS "Catatan", created_at AS "CreatedAt", created_by AS "CreatedBy", lead_id AS "LeadID",
  sumber AS "Sumber", hold_until AS "HoldUntil", tamu_nama AS "TamuNama", tamu_wa AS "TamuWA", tamu_email AS "TamuEmail",
  preferensi AS "Preferensi", request_khusus AS "RequestKhusus", estimasi_harga AS "EstimasiHarga", kode_booking AS "KodeBooking"
  FROM room_booking`;

// Status yang TIDAK memblok slot
const BEBAS = ["Cancel", "Expired"];

function menit(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// Cek bentrok: ruangan sama, tanggal sama, dan jeda < 120 menit (atau overlap).
// Aturan antrian: booking Tentative boleh menumpuk di jam yang sama (antri). Yang memblok slot hanya booking Definite.
// Saat sebuah booking mau dijadikan Definite, semua booking lain di jam itu harus sudah di-Cancel dulu (hanyaDefinite = false).
async function adaBentrok(b, hanyaDefinite = true) {
  if (!b.room) return null;
  const rows = hanyaDefinite
    ? await sql`SELECT id, jam_mulai, jam_selesai, status, event_title, company FROM room_booking
        WHERE room = ${b.room} AND tanggal = ${b.tanggal} AND status = 'Definite' AND id <> ${b.id || ""}`
    : await sql`SELECT id, jam_mulai, jam_selesai, status, event_title, company FROM room_booking
        WHERE room = ${b.room} AND tanggal = ${b.tanggal} AND status <> 'Cancel' AND status <> 'Expired' AND id <> ${b.id || ""}`;
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

const pesanAntrian = (x) => `Masih ada booking ${x.status} ${x.jam_mulai}-${x.jam_selesai} (${x.event_title || x.company || "-"}) di ruangan yang sama. Cancel booking itu dulu sebelum menjadikan Definite.`;
const pesanDefinite = (x) => `Slot sudah Definite: ${x.jam_mulai}-${x.jam_selesai} (${x.event_title || x.company || "-"}). Pilih jam atau ruangan lain.`;

const tglID = (s) => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
async function emailTamu(rb, subject, isi) {
  if (!rb.tamu_email) return;
  try { await kirimEmail(rb.tamu_email, subject, isi); } catch (e) {}
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
      if (String(b.status) === "Definite") {
        const cur = await sql`SELECT id, room, tanggal, jam_mulai, jam_selesai FROM room_booking WHERE id = ${b.id}`;
        if (cur.length) {
          const c = cur[0];
          const lain = await adaBentrok({ id: c.id, room: c.room, tanggal: c.tanggal, jamMulai: c.jam_mulai, jamSelesai: c.jam_selesai }, false);
          if (lain) return NextResponse.json({ status: "error", message: pesanAntrian(lain) });
        }
      }
      await sql`UPDATE room_booking SET status = ${b.status || ""} WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }
    if (b.action === "hapus") {
      await sql`DELETE FROM room_booking WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }

    // ===== Booking dari Ucup: Konfirmasi & Jadikan Lead =====
    if (b.action === "konfirmasiUcup") {
      const rows = await sql`SELECT * FROM room_booking WHERE id = ${b.id}`;
      if (!rows.length) return NextResponse.json({ status: "error", message: "Booking tidak ditemukan." });
      const rb = rows[0];
      if (rb.lead_id) return NextResponse.json({ status: "error", message: "Booking ini sudah tertaut Lead." });
      const bentrok = await adaBentrok({ id: rb.id, room: rb.room, tanggal: rb.tanggal, jamMulai: rb.jam_mulai, jamSelesai: rb.jam_selesai }, false);
      if (bentrok) return NextResponse.json({ status: "error", message: pesanAntrian(bentrok) });

      const now = waktuJakarta();
      const leadId = "L" + Date.now();
      const pic = b.oleh || "";
      const catatan = "Dari Ucup " + (rb.kode_booking || "") + (rb.request_khusus ? " — request: " + rb.request_khusus : "");
      await sql`INSERT INTO leads (id, tanggal, nama, instansi, nohp, email, jenis_event, tanggal_event, jumlah_pax,
          estimasi_nilai, sumber, status, pic, catatan, link_dokumen, updated_at, alasan_cancel, updated_by,
          perlu_kamar, jumlah_kamar, revenue_room, lead_type)
        VALUES (${leadId}, ${now}, ${rb.tamu_nama || ""}, ${rb.company || ""}, ${rb.tamu_wa || ""}, ${rb.tamu_email || ""},
          ${"Meeting / Rapat"}, ${rb.tanggal || ""}, ${String(rb.pax || "")}, ${String(rb.estimasi_harga || "")},
          ${"Ucup Online"}, ${"Definite"}, ${pic}, ${catatan},
          ${""}, ${now}, ${""}, ${pic}, ${""}, ${""}, ${""}, ${"MICE"})`;
      await sql`INSERT INTO log_status (waktu, lead_id, nama, status_lama, status_baru, alasan_cancel, oleh)
        VALUES (${now}, ${leadId}, ${rb.tamu_nama || ""}, ${"-"}, ${"Definite"}, ${""}, ${pic})`;
      await sql`UPDATE room_booking SET status = 'Definite', lead_id = ${leadId}, pic = ${pic}, hold_until = NULL WHERE id = ${rb.id}`;

      await emailTamu(rb, `Booking ${rb.kode_booking || ""} dikonfirmasi — Aston Cirebon`,
        `Halo ${rb.tamu_nama || ""},\n\nKabar baik! Booking ruang meeting kamu sudah DIKONFIRMASI oleh tim sales kami.\n\n` +
        `Kode booking : ${rb.kode_booking || "-"}\nRuangan      : ${rb.room}\nTanggal      : ${tglID(rb.tanggal)}\nJam          : ${rb.jam_mulai} - ${rb.jam_selesai}\nPeserta      : ${rb.pax || "-"} orang\n\n` +
        `Sales yang menangani: ${pic || "Tim Sales Aston Cirebon"}. Kami akan menghubungi kamu untuk detail setup, F&B, dan pembayaran.\n\nTerima kasih,\nUcup — Aston Cirebon`);
      return NextResponse.json({ status: "ok", leadId });
    }

    // ===== Booking dari Ucup: Tolak =====
    if (b.action === "tolakUcup") {
      const rows = await sql`SELECT * FROM room_booking WHERE id = ${b.id}`;
      if (!rows.length) return NextResponse.json({ status: "error", message: "Booking tidak ditemukan." });
      const rb = rows[0];
      const alasan = String(b.alasan || "").trim();
      const catatan = (rb.catatan ? rb.catatan + " | " : "") + "Ditolak: " + (alasan || "-");
      await sql`UPDATE room_booking SET status = 'Cancel', catatan = ${catatan}, hold_until = NULL WHERE id = ${rb.id}`;
      await emailTamu(rb, `Booking ${rb.kode_booking || ""} tidak dapat diproses — Aston Cirebon`,
        `Halo ${rb.tamu_nama || ""},\n\nMohon maaf, booking ruang meeting kamu (${rb.kode_booking || "-"}, ${rb.room}, ${tglID(rb.tanggal)} ${rb.jam_mulai}-${rb.jam_selesai}) tidak dapat kami proses.\n\n` +
        `Alasan: ${alasan || "-"}\n\nJangan ragu hubungi tim sales kami untuk alternatif ruangan atau jadwal lain.\n\nTerima kasih,\nUcup — Aston Cirebon`);
      return NextResponse.json({ status: "ok" });
    }

    if (b.action === "addBooking" || b.action === "updateBooking") {
      if (!b.room || !b.tanggal || !b.jamMulai || !b.jamSelesai) return NextResponse.json({ status: "error", message: "Ruangan, tanggal, dan jam wajib diisi." });
      if (menit(b.jamSelesai) <= menit(b.jamMulai)) return NextResponse.json({ status: "error", message: "Jam selesai harus setelah jam mulai." });
      if (!BEBAS.includes(String(b.status))) {
        const jadiDefinite = String(b.status) === "Definite";
        const bentrok = await adaBentrok(b, !jadiDefinite);
        if (bentrok) return NextResponse.json({ status: "error", message: jadiDefinite ? pesanAntrian(bentrok) : pesanDefinite(bentrok) });
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
