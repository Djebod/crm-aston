import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

export async function GET() {
  try {
    let snap;
    try {
      snap = await db.collection("log_status").orderBy("Waktu", "desc").get();
    } catch (e) {
      // kalau collection belum ada / belum ada index -> ambil apa adanya
      snap = await db.collection("log_status").get();
    }
    const data = snap.docs.map((d) => d.data());
    // urut terbaru di atas (jaga-jaga kalau tidak ter-order dari query)
    data.sort((a, b) => String(b.Waktu || "").localeCompare(String(a.Waktu || "")));
    return NextResponse.json({ status: "ok", data });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
