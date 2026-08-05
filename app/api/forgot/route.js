import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { kirimEmail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { email } = await req.json();
    const em = String(email || "").toLowerCase().trim();
    if (!em) return NextResponse.json({ status: "error", message: "Email wajib diisi." });

    const ref = db.collection("users").doc(em);
    const snap = await ref.get();
    if (snap.exists) {
      const u = snap.data();
      if (u.Aktif !== false && String(u.Aktif).toLowerCase() !== "false") {
        const token = crypto.randomBytes(24).toString("hex");
        const expiry = Date.now() + 60 * 60 * 1000; // 1 jam
        await ref.update({ ResetToken: token, ResetExpiry: expiry });
        const link = (process.env.APP_URL || "") + "/reset?email=" + encodeURIComponent(em) + "&token=" + token;
        const isi =
          "Halo " + (u.Nama || "") + ",\n\n" +
          "Kami menerima permintaan reset password untuk akun Aston CRM Anda.\n" +
          "Klik tautan berikut untuk membuat password baru (berlaku 1 jam):\n\n" + link + "\n\n" +
          "Jika Anda tidak meminta ini, abaikan email ini.\n\n— Aston CRM, Aston Cirebon";
        try { await kirimEmail(em, "Reset Password — Aston CRM", isi); } catch (err) { /* diamkan demi privasi */ }
      }
    }
    // selalu ok (tidak membocorkan email terdaftar / tidak)
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
