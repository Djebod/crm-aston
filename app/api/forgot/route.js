import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/db";
import { kirimEmail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email } = await req.json();
    const em = String(email || "").toLowerCase().trim();
    if (!em) return NextResponse.json({ status: "error", message: "Email wajib diisi." });

    const rows = await sql`SELECT nama AS "Nama", aktif AS "Aktif" FROM users WHERE email = ${em}`;
    if (rows.length && rows[0].Aktif !== false) {
      const token = crypto.randomBytes(24).toString("hex");
      const expiry = Date.now() + 60 * 60 * 1000;
      await sql`UPDATE users SET reset_token = ${token}, reset_expiry = ${expiry} WHERE email = ${em}`;
      const link = (process.env.APP_URL || "") + "/reset?email=" + encodeURIComponent(em) + "&token=" + token;
      const isi =
        "Halo " + (rows[0].Nama || "") + ",\n\n" +
        "Kami menerima permintaan reset password untuk akun Aston CRM Anda.\n" +
        "Klik tautan berikut untuk membuat password baru (berlaku 1 jam):\n\n" + link + "\n\n" +
        "Jika Anda tidak meminta ini, abaikan email ini.\n\n— Aston CRM, Aston Cirebon";
      try { await kirimEmail(em, "Reset Password — Aston CRM", isi); } catch (err) {}
    }
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
