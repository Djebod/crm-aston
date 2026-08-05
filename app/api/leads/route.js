import { NextResponse } from "next/server";
import { db, waktuJakarta } from "@/lib/firebase";

export const runtime = "nodejs";

async function logStatus(id, nama, lama, baru, alasan, oleh) {
  await db.collection("log_status").add({
    Waktu: waktuJakarta(), LeadID: id, Nama: nama || "",
    StatusLama: lama || "", StatusBaru: baru || "", AlasanCancel: alasan || "", Oleh: oleh || "",
  });
}

export async function GET() {
  try {
    const snap = await db.collection("leads").orderBy("Tanggal", "asc").get();
    return NextResponse.json({ status: "ok", data: snap.docs.map((d) => d.data()) });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();

    if (b.action === "addLead") {
      const id = "L" + Date.now();
      const now = waktuJakarta();
      const status = b.status || "Tentative";
      const doc = {
        ID: id, Tanggal: now, Nama: b.nama || "", Instansi: b.instansi || "", NoHP: b.nohp || "",
        Email: b.email || "", JenisEvent: b.jenisEvent || "", TanggalEvent: b.tanggalEvent || "",
        JumlahPax: b.jumlahPax || "", EstimasiNilai: b.estimasiNilai || "", Sumber: b.sumber || "",
        Status: status, PIC: b.pic || "", Catatan: b.catatan || "", LinkDokumen: "",
        UpdatedAt: now, AlasanCancel: b.alasanCancel || "", UpdatedBy: b.oleh || "",
      };
      await db.collection("leads").doc(id).set(doc);
      await logStatus(id, b.nama || "", "-", status, b.alasanCancel || "", b.oleh || "");
      return NextResponse.json({ status: "ok", id });
    }

    if (b.action === "updateLead") {
      const ref = db.collection("leads").doc(String(b.id));
      const snap = await ref.get();
      if (!snap.exists) return NextResponse.json({ status: "error", message: "ID tidak ditemukan" });
      const old = snap.data();
      const map = {
        Nama: b.nama, Instansi: b.instansi, NoHP: b.nohp, Email: b.email, JenisEvent: b.jenisEvent,
        TanggalEvent: b.tanggalEvent, JumlahPax: b.jumlahPax, EstimasiNilai: b.estimasiNilai,
        Sumber: b.sumber, Status: b.status, PIC: b.pic, Catatan: b.catatan, AlasanCancel: b.alasanCancel,
      };
      const upd = {};
      Object.keys(map).forEach((k) => { if (map[k] !== undefined) upd[k] = map[k]; });
      upd.UpdatedAt = waktuJakarta();
      if (b.oleh !== undefined) upd.UpdatedBy = b.oleh || "";
      await ref.update(upd);
      if (b.status !== undefined && String(b.status) !== String(old.Status || "")) {
        await logStatus(b.id, b.nama || old.Nama || "", old.Status || "", b.status, b.alasanCancel || "", b.oleh || "");
      }
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "error", message: "action tidak dikenal" });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
