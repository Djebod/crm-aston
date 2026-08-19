import { NextResponse } from "next/server";
import { raw } from "@/lib/db";

export const runtime = "nodejs";

// Daftar nama karyawan (untuk dropdown tanda tangan) — hanya nama, kode, role.
export async function GET() {
  try {
    const rows = await raw(`SELECT nama AS "Nama", kode AS "Kode", role AS "Role" FROM users WHERE aktif = true ORDER BY nama ASC`);
    return NextResponse.json({ status: "ok", data: rows });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
