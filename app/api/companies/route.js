import { NextResponse } from "next/server";
import { db, companyId } from "@/lib/firebase";

export const runtime = "nodejs";

function ok(extra) { return NextResponse.json({ status: "ok", ...(extra || {}) }); }
function err(m) { return NextResponse.json({ status: "error", message: m }); }

export async function GET() {
  try {
    const snap = await db.collection("companies").get();
    const data = snap.docs.map((d) => {
      const x = d.data();
      return { CompanyName: x.CompanyName || "", Segmentation: x.Segmentation || "", Alamat: x.Alamat || "" };
    }).filter((x) => x.CompanyName).sort((a, b) => a.CompanyName.localeCompare(b.CompanyName));
    return NextResponse.json({ status: "ok", data });
  } catch (e) {
    return err(e?.message || String(e));
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Tambah company (nama unik, alamat wajib)
    if (body.action === "addCompany") {
      const nama = String(body.companyName || "").trim();
      const alamat = String(body.alamat || "").trim();
      if (!nama) return err("Nama company wajib diisi.");
      if (!alamat) return err("Alamat Lengkap wajib diisi.");
      const ref = db.collection("companies").doc(companyId(nama));
      if ((await ref.get()).exists) return err("Company dengan nama itu sudah ada.");
      await ref.set({ CompanyName: nama, Segmentation: body.segmentation || "", Alamat: alamat });
      return ok();
    }

    // Edit company (nama = kunci, tidak diubah; ubah segmen & alamat)
    if (body.action === "updateCompany") {
      const nama = String(body.companyName || "").trim();
      const alamat = String(body.alamat || "").trim();
      if (!alamat) return err("Alamat Lengkap wajib diisi.");
      const ref = db.collection("companies").doc(companyId(nama));
      if (!(await ref.get()).exists) return err("Company tidak ditemukan.");
      await ref.update({ Segmentation: body.segmentation || "", Alamat: alamat });
      return ok();
    }

    // Import massal (CSV): CompanyName, Segmentation, Alamat
    if (body.action === "importCompanies") {
      const rows = body.rows || [];
      const snap = await db.collection("companies").get();
      const ada = new Set(snap.docs.map((d) => d.id));
      const baru = [];
      for (const r of rows) {
        const nm = String(r.companyName || "").trim();
        if (!nm) continue;
        const cid = companyId(nm);
        if (ada.has(cid)) continue;
        ada.add(cid);
        baru.push({ cid, nm, seg: r.segmentation || "", alamat: r.alamat || "" });
      }
      for (let i = 0; i < baru.length; i += 400) {
        const batch = db.batch();
        baru.slice(i, i + 400).forEach((x) =>
          batch.set(db.collection("companies").doc(x.cid), { CompanyName: x.nm, Segmentation: x.seg, Alamat: x.alamat })
        );
        await batch.commit();
      }
      return ok({ ditambah: baru.length });
    }

    return err("action tidak dikenal");
  } catch (e) {
    return err(e?.message || String(e));
  }
}
