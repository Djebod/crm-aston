import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await db.collection("companies").get();
    const data = snap.docs.map((d) => d.data()).filter((x) => x.CompanyName)
      .sort((a, b) => String(a.CompanyName).localeCompare(String(b.CompanyName)));
    return NextResponse.json({ status: "ok", data });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (body.action !== "importCompanies") return NextResponse.json({ status: "error", message: "action tidak dikenal" });
    const rows = body.rows || [];

    const snap = await db.collection("companies").get();
    const ada = new Set(snap.docs.map((d) => d.id));

    const baru = [];
    for (const r of rows) {
      const nama = String(r.companyName || "").trim();
      if (!nama) continue;
      const cid = nama.toLowerCase();
      if (ada.has(cid)) continue;
      ada.add(cid);
      baru.push({ cid, nama, seg: r.segmentation || "" });
    }
    // tulis per-batch (maks 400 per commit)
    for (let i = 0; i < baru.length; i += 400) {
      const batch = db.batch();
      baru.slice(i, i + 400).forEach((x) => {
        batch.set(db.collection("companies").doc(x.cid), { CompanyName: x.nama, Segmentation: x.seg });
      });
      await batch.commit();
    }
    return NextResponse.json({ status: "ok", ditambah: baru.length });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
