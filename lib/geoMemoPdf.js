"use client";

import { muatHtml2pdf } from "./pdf";
import { TAHAP_GEO } from "./geoApproval";
import { cariKaryawan } from "./ttd";
import { buildMemoHTML } from "./geoMemo";

/**
 * Kolom tanda tangan memo: Requested (sales), Acknowledge (Sales Leader & Finance),
 * Approved (General Manager). Gambar TTD hanya dicetak bila tahap GEO terkait sudah
 * benar-benar disetujui — sama seperti aturan di PDF GEO.
 */
export function ttdMemo(g, approvals, karyawan) {
  const ambil = (i) => {
    const def = (g.ttd || [])[i] || {};
    const a = (approvals || [])[i];
    const img = a ? cariKaryawan(karyawan, a.nama)?.Ttd || "" : "";
    return { nama: a ? a.nama : def.nama || "", jabatan: def.jabatan || TAHAP_GEO[i].jabatan, img };
  };
  // urutan: Sales, Sales Leader, Financial Controller, General Manager
  return [ambil(0), ambil(1), ambil(3), ambil(4)];
}

/** Buat & unduh PDF Interoffice Memo. memoNo & tanggal harus sudah dialokasikan server. */
export async function unduhMemoPDF(g, { memoNo, memoTgl, approvals, karyawan }) {
  const html = buildMemoHTML(g, window.location.origin, {
    memoNo, tanggal: memoTgl || undefined, ttd: ttdMemo(g, approvals, karyawan),
  });
  await muatHtml2pdf();
  const cont = document.createElement("div");
  cont.style.width = "200mm";
  cont.style.background = "#fff";
  cont.innerHTML = html;
  document.body.appendChild(cont);
  const prev = window.scrollY;
  window.scrollTo(0, 0);
  try {
    await Promise.all(Array.from(cont.querySelectorAll("img")).map((im) => im.complete ? Promise.resolve() : new Promise((r) => {
      im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); setTimeout(r, 5000);
    })));
    await window.html2pdf().set({
      margin: 8, filename: "MEMO-" + String(memoNo || "SM").replace(/[^\w-]/g, "_") + ".pdf",
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    }).from(cont).save();
  } finally {
    document.body.removeChild(cont);
    window.scrollTo(0, prev);
  }
}

/** Minta nomor memo ke server (atau ambil yang sudah ada), lalu unduh PDF-nya. */
export async function buatMemo({ geoId, g, approvals, karyawan, email }) {
  const res = await fetch("/api/geo", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "nomorMemo", id: geoId, email }),
  }).then((x) => x.json());
  if (res.status !== "ok") throw new Error(res.message || "Gagal membuat nomor memo.");
  await unduhMemoPDF({ ...g, sp: { ...(g.sp || {}), memoNo: res.memoNo } }, { memoNo: res.memoNo, memoTgl: res.memoTgl, approvals, karyawan });
  return res.memoNo;
}
