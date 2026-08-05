import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { uploadFotoDrive } from "@/lib/drive";

export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await db.collection("aktivitas").orderBy("ID", "asc").get();
    return NextResponse.json({ status: "ok", data: snap.docs.map((d) => d.data()) });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    if (b.action !== "addActivity") return NextResponse.json({ status: "error", message: "action tidak dikenal" });

    const id = "A" + Date.now();
    const comp = String(b.companyName || "").trim();
    if (comp) {
      const cref = db.collection("companies").doc(comp.toLowerCase());
      const cs = await cref.get();
      if (!cs.exists) await cref.set({ CompanyName: comp, Segmentation: b.segmentation || "" });
    }
    let foto = "";
    if (b.fotoBase64) foto = await uploadFotoDrive(b.fotoBase64, id + "_" + (b.fotoNama || "foto"));

    const doc = {
      ID: id, Date: b.date || "", Time: b.time || "", SalesName: b.salesName || "", CompanyName: comp,
      Segmentation: b.segmentation || "", PICName: b.picName || "", Position: b.position || "",
      PhoneNumber: b.phone || "", Description: b.description || "", Activity: b.activity || "", Photo: foto,
    };
    await db.collection("aktivitas").doc(id).set(doc);
    return NextResponse.json({ status: "ok", id, photo: foto });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
