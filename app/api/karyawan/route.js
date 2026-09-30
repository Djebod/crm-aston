import { NextResponse } from "next/server";
import { raw } from "@/lib/db";

export const runtime = "nodejs";
// Jangan di-cache saat build: data harus selalu diambil segar dari database.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Daftar nama karyawan (untuk dropdown tanda tangan) — nama, kode, role, gambar TTD.
export async function GET() {
  try {
    const rows = await raw(`SELECT nama AS "Nama", kode AS "Kode", role AS "Role", ttd AS "Ttd" FROM users WHERE aktif = true ORDER BY nama ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
