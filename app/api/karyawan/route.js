import { NextResponse } from "next/server";
import { raw } from "@/lib/db";

export const runtime = "nodejs";

// Daftar nama karyawan (untuk dropdown tanda tangan) — nama, kode, role, gambar TTD.
export async function GET() {
  try {
    const rows = await raw(
      `SELECT nama AS "Nama", kode AS "Kode", role AS "Role", ttd AS "Ttd" FROM users WHERE aktif = true ORDER BY nama ASC`
    );
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    // Bila kolom ttd belum ada (npm run init-db belum dijalankan), daftar nama
    // tetap dikirim supaya dropdown penandatangan tidak kosong.
    try {
      const rows = await raw(
        `SELECT nama AS "Nama", kode AS "Kode", role AS "Role" FROM users WHERE aktif = true ORDER BY nama ASC`
      );
      return NextResponse.json({
        status: "ok",
        data: rows,
        peringatan: "Kolom tanda tangan belum ada di database. Jalankan: npm run init-db",
      });
    } catch (e2) {
      return NextResponse.json({ status: "error", message: e2?.message || String(e2) });
    }
  }
}
