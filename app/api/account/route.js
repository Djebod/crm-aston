import { NextResponse } from "next/server";
import { sql, pastikanKolomTtd } from "@/lib/db";

export const runtime = "nodejs";

const CATATAN = "Akun super admin dikelola lewat Environment Variable, bukan dari halaman ini.";

export async function POST(req) {
  try {
    const body = await req.json();
    const em = String(body.email || "").toLowerCase().trim();
    if (!em) return NextResponse.json({ status: "error", message: "Email tidak ada." });
    const rows = await sql`SELECT nama AS "Nama", password_hash AS "PasswordHash", role AS "Role" FROM users WHERE email = ${em}`;

    if (body.action === "updateProfile") {
      if (!rows.length) return NextResponse.json({ status: "error", message: CATATAN });
      await sql`UPDATE users SET nama = ${body.nama || ""} WHERE email = ${em}`;
      return NextResponse.json({ status: "ok", user: { email: em, nama: body.nama || "", role: rows[0].Role || "marketing" } });
    }

    if (body.action === "updateTtd") {
      if (!rows.length) return NextResponse.json({ status: "error", message: CATATAN });
      await pastikanKolomTtd();
      const ttd = String(body.ttd || "");
      if (ttd && !ttd.startsWith("data:image/")) return NextResponse.json({ status: "error", message: "Format gambar tidak dikenali." });
      if (ttd.length > 400000) return NextResponse.json({ status: "error", message: "Gambar tanda tangan terlalu besar." });
      await sql`UPDATE users SET ttd = ${ttd} WHERE email = ${em}`;
      return NextResponse.json({ status: "ok" });
    }

    if (body.action === "getTtd") {
      if (!rows.length) return NextResponse.json({ status: "error", message: CATATAN });
      await pastikanKolomTtd();
      const r = await sql`SELECT ttd AS "Ttd" FROM users WHERE email = ${em}`;
      return NextResponse.json({ status: "ok", ttd: r[0]?.Ttd || "" });
    }

    return NextResponse.json({ status: "error", message: "Aksi tidak dikenal." });
  } catch (e) { return NextResponse.json({ status: "error", message: e?.message || String(e) }); }
}
