import { NextResponse } from "next/server";
import { sql, waktuJakarta } from "@/lib/db";
import { uploadFotoDrive } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SEL = `SELECT m.*, p.per_jam, p.half_day, p.full_day, p.weekend_pct, p.catatan AS catatan_harga
  FROM meeting_room m LEFT JOIN room_price p ON p.room_id = m.id`;

const slug = (s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const angka = (v) => { const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10); return isNaN(n) ? null : n; };

// GET: daftar ruangan + harga. ?publik=1 hanya ruangan tampil_publik & aktif (dipakai Ucup).
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const publik = searchParams.get("publik") === "1";
    const rows = publik
      ? await sql`SELECT m.*, p.per_jam, p.half_day, p.full_day, p.weekend_pct, p.catatan AS catatan_harga
          FROM meeting_room m LEFT JOIN room_price p ON p.room_id = m.id
          WHERE m.tampil_publik = true AND m.aktif = true ORDER BY m.urutan, m.nama`
      : await sql`SELECT m.*, p.per_jam, p.half_day, p.full_day, p.weekend_pct, p.catatan AS catatan_harga
          FROM meeting_room m LEFT JOIN room_price p ON p.room_id = m.id ORDER BY m.urutan, m.nama`;
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

// POST (admin): simpan / hapus ruangan + harga
export async function POST(req) {
  try {
    const b = await req.json();
    const now = waktuJakarta();

    if (b.action === "hapus") {
      await sql`DELETE FROM meeting_room WHERE id = ${b.id}`;
      return NextResponse.json({ status: "ok" });
    }

    if (b.action === "simpan") {
      const nama = String(b.nama || "").trim();
      if (!nama) return NextResponse.json({ status: "error", message: "Nama ruangan wajib diisi." });
      const id = b.id || slug(nama);
      if (!id) return NextResponse.json({ status: "error", message: "Nama ruangan tidak valid." });
      const fasilitas = Array.isArray(b.fasilitas) ? JSON.stringify(b.fasilitas) : String(b.fasilitas || "");
      let foto = b.foto || "";
      if (b.fotoBase64) { const u = await uploadFotoDrive(b.fotoBase64, "ruang_" + id); if (u) foto = u; }
      await sql`INSERT INTO meeting_room (id, nama, lantai, dimensi, cap_theater, cap_class, cap_round, cap_ushape, cap_hollow,
          fasilitas, deskripsi, foto, tampil_publik, booking_langsung, urutan, aktif)
        VALUES (${id}, ${nama}, ${b.lantai || ""}, ${b.dimensi || ""}, ${angka(b.cap_theater)}, ${angka(b.cap_class)}, ${angka(b.cap_round)},
          ${angka(b.cap_ushape)}, ${angka(b.cap_hollow)}, ${fasilitas}, ${b.deskripsi || ""}, ${foto},
          ${!!b.tampil_publik}, ${!!b.booking_langsung}, ${angka(b.urutan) ?? 0}, ${b.aktif !== false})
        ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, lantai = EXCLUDED.lantai, dimensi = EXCLUDED.dimensi,
          cap_theater = EXCLUDED.cap_theater, cap_class = EXCLUDED.cap_class, cap_round = EXCLUDED.cap_round,
          cap_ushape = EXCLUDED.cap_ushape, cap_hollow = EXCLUDED.cap_hollow, fasilitas = EXCLUDED.fasilitas,
          deskripsi = EXCLUDED.deskripsi, foto = EXCLUDED.foto, tampil_publik = EXCLUDED.tampil_publik,
          booking_langsung = EXCLUDED.booking_langsung, urutan = EXCLUDED.urutan, aktif = EXCLUDED.aktif`;

      // Harga: simpan bila ada salah satu nilai, kalau semua kosong hapus baris harga
      const perJam = angka(b.per_jam), half = angka(b.half_day), full = angka(b.full_day), wk = angka(b.weekend_pct) ?? 0;
      if (perJam || half || full) {
        await sql`INSERT INTO room_price (room_id, per_jam, half_day, full_day, weekend_pct, catatan, updated_at, updated_by)
          VALUES (${id}, ${perJam}, ${half}, ${full}, ${wk}, ${b.catatan_harga || ""}, ${now}, ${b.oleh || ""})
          ON CONFLICT (room_id) DO UPDATE SET per_jam = EXCLUDED.per_jam, half_day = EXCLUDED.half_day, full_day = EXCLUDED.full_day,
            weekend_pct = EXCLUDED.weekend_pct, catatan = EXCLUDED.catatan, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by`;
      } else {
        await sql`DELETE FROM room_price WHERE room_id = ${id}`;
      }
      return NextResponse.json({ status: "ok", id });
    }
    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
