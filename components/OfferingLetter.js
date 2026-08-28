"use client";

import { useState, useEffect } from "react";
import { Modal, Field, inp } from "@/components/Modal";
import { unduhPDFdariHTML } from "@/lib/pdf";

// ====== Identitas hotel (ubah bila perlu) ======
const HOTEL = {
  nama: "Aston Cirebon Hotel & Convention Center",
  alamat: "Jl. Brigjen Dharsono Bypass No.12C, Kertawinangun, Kedawung, Kota Cirebon, Jawa Barat 45132",
  telp: "(0231) 8298000",
  email: "info@astoncirebon.com",
  web: "www.AstonCirebon.com",
};

// ====== Harga kamar: 4 kategori, masing-masing Weekday & Weekend ======
const RATE_CATEGORIES = ["Corporate New Account", "Corporate LMA", "Corporate CMA", "Travel Agent"];
const ROOM_TYPES = ["Superior", "Deluxe", "Junior Executive", "Executive", "Suite", "Presidential Suite"];
const WD_BASE = [908000, 1028000, 1148000, 1568000, 2088000, 5088000];
function rateDefault() {
  const o = {};
  RATE_CATEGORIES.forEach((c) => { o[c] = ROOM_TYPES.map((t, i) => [t, String(WD_BASE[i]), String(WD_BASE[i] + 50000)]); });
  return o;
}

const INCLUSIONS = [
  "Sarapan untuk 2 orang",
  "Welcome Drink dan wet towel pada saat kedatangan",
  "Dua botol air mineral setiap hari di dalam kamar",
  "Fasilitas pembuat kopi dan teh",
  "Akses internet di kamar dan seluruh area hotel",
  "Free Shuttle menuju Mall dan stasiun kereta",
];

const RES_INCLUDES = [
  "Superior Room",
  "Penggunaan ruang Meeting selama 12 jam",
  "LCD Projector (2000 lumens) dan Layar (2 m x 1,5 m)",
  "Audio Sound System",
  "2 Microphone",
  "Meeting Stationary: 1 Flip Chart dengan 3 warna Spidol, Notepad dan Pensil",
  "Air Putih dan permen",
  "2 kali sarapan",
  "1 kali makan siang",
  "1 kali makan malam di ballroom",
  "1 kali Coffee Break",
  "1 kali Amazing Race",
];

const ADDON = [
  "Mic Rp 300.000,-/mic",
  "Screen Projector Rp 1.500.000,-",
  "Internet 50 mbps Rp 10.000.000,-/meeting",
  "Flip Chart Rp 200.000,-",
  "Videotron Onyx Room (6 x 2.5 m) Rp 500.000,-/m",
  "Videotron Sapphire Grand Ballroom (8 x 4 m) Rp 500.000,-/m",
];

const rp = (n) => "Rp " + (Number(String(n).replace(/[^\d]/g, "")) || 0).toLocaleString("id-ID") + ",-";
const angka = (n) => Number(String(n).replace(/[^\d]/g, "")) || 0;
const hariIni = () => new Date().toISOString().slice(0, 10);
const tglID = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inisial(nama) { return String(nama || "").trim().split(/\s+/).map((w) => w[0] || "").join("").toUpperCase().slice(0, 4); }
function buildNoDok(code, nomor, tgl, kode) {
  const d = tgl ? new Date(tgl) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${code}/${nomor || "___"}/${dd}/${mm}/${yy}/SM/ACHCC/${String(kode || "").toUpperCase()}`;
}

export default function OfferingLetter({ lead, user, onClose }) {
  const [o, setO] = useState({
    noOL: "",
    nomor: "",
    kodeSales: user?.kode || inisial(user?.nama),
    rateCat: RATE_CATEGORIES[0],
    rates: rateDefault(),
    tglSurat: hariIni(),
    sapaan: "Bapak/Ibu",
    namaTamu: lead.Nama || "",
    instansi: lead.Instansi || "",
    kota: "",
    noHP: lead.NoHP || "",
    perihal: "Penawaran Harga/Meeting dan Kamar",
    tglKamar: lead.TanggalEvent || "",
    jumlahKamar: lead.JumlahKamar || "",
    namaAcara: lead.Instansi || lead.JenisEvent || "",
    jumlahPeserta: lead.JumlahPax || "",
    rangkaian: [{ hari: lead.TanggalEvent || "", waktu: "", acara: "", tempat: "", setup: "", jumlah: lead.JumlahPax || "" }],
    resTwin: "1500000",
    resSingle: "2300000",
    addCoffee: "120000",
    addLunch: "150000",
    addDinner: "285000",
    addBand: "9500000",
    estimasi: [{ deskripsi: "Residential Twin Package", jumlah: "", harga: "1500000" }],
    konfirmasiTgl: "",
    ttdNama: user?.nama || "",
    ttdJabatan: "Sales & Marketing",
    ttdHP: "",
  });

  const set = (k, v) => setO((s) => ({ ...s, [k]: v }));
  const setRow = (arr, i, k, v) => setO((s) => ({ ...s, [arr]: s[arr].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRow = (arr, kosong) => setO((s) => ({ ...s, [arr]: [...s[arr], kosong] }));
  const delRow = (arr, i) => setO((s) => ({ ...s, [arr]: s[arr].filter((_, j) => j !== i) }));
  const setRate = (i, kol, v) => setO((s) => ({ ...s, rates: { ...s.rates, [s.rateCat]: s.rates[s.rateCat].map((r, j) => (j === i ? [r[0], kol === "wd" ? v : r[1], kol === "we" ? v : r[2]] : r)) } }));
  const [busy, setBusy] = useState(false);

  // Nomor OL otomatis (peek dari counter, reset per tahun)
  useEffect(() => {
    const th = new Date(o.tglSurat || hariIni()).getFullYear();
    fetch(`/api/docnum?kode=OL&tahun=${th}`, { cache: "no-store" })
      .then((r) => r.json()).then((r) => { if (r.status === "ok" && !o.nomor) set("nomor", String(r.next)); })
      .catch(() => {});
  }, []); // eslint-disable-line

  const grandTotal = o.estimasi.reduce((t, r) => t + angka(r.jumlah) * angka(r.harga), 0);
  const noOL = buildNoDok("OL", o.nomor, o.tglSurat, o.kodeSales);

  function cetak() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const th = (t) => `<th>${t}</th>`;
    const td = (t, cls = "") => `<td class="${cls}">${t}</td>`;

    const rateRows = (o.rates[o.rateCat] || []).map((r) =>
      `<tr>${td(r[0], "c")}${td(rp(r[1]), "c")}${td(rp(r[2]), "c")}</tr>`).join("");

    const inclList = INCLUSIONS.map((x) => `<li>${esc(x)}</li>`).join("");
    const resList = RES_INCLUDES.map((x) => `<li>${esc(x)}</li>`).join("");
    const addonList = ADDON.map((x) => `<li>${esc(x)}</li>`).join("");

    const rangkaianRows = o.rangkaian.map((r) =>
      `<tr>${td(esc(tglID(r.hari)))}${td(esc(r.waktu))}${td(esc(r.acara))}${td(esc(r.tempat))}${td(esc(r.setup))}${td(esc(r.jumlah), "c")}</tr>`).join("");

    const estRows = o.estimasi.map((r, i) => {
      const tot = angka(r.jumlah) * angka(r.harga);
      return `<tr>${td(i + 1, "c")}${td(esc(r.deskripsi))}${td(angka(r.jumlah).toLocaleString("id-ID"), "r")}${td(angka(r.harga).toLocaleString("id-ID"), "r")}${td(tot.toLocaleString("id-ID"), "r")}</tr>`;
    }).join("");

    const foot = `<div class="foot">${HOTEL.alamat}<br>${HOTEL.telp} ${HOTEL.email}<br><span class="web">${HOTEL.web}</span></div>`;

    const html = `<div class="doc"><style>
  .doc { font-family: Arial, Helvetica, sans-serif; color:#1f2937; font-size:12px; line-height:1.55; }
  .doc * { box-sizing: border-box; }
  .doc .logo { text-align:center; margin-bottom:14px; }
  .doc .logo img { height:52px; display:block; margin:0 auto; }
  .doc b { color:#111; }
  .doc .to b { display:block; }
  .doc .sec { font-weight:bold; margin:14px 0 4px; }
  .doc .italb { font-weight:bold; font-style:italic; }
  .doc ul { margin:4px 0 4px 18px; padding:0; }
  .doc li { margin:2px 0; }
  .doc table { width:100%; border-collapse:collapse; margin:8px 0; page-break-inside:avoid; }
  .doc th, .doc td { border:1px solid #94a3b8; padding:6px 8px; text-align:left; vertical-align:top; }
  .doc th { background:#f1f5f9; text-align:center; font-size:11px; }
  .doc td.c, .doc th.c { text-align:center; }
  .doc td.r { text-align:right; }
  .doc .rate-title td { text-align:center; font-weight:bold; background:#eef2f8; }
  .doc .total td { font-weight:bold; background:#fdf6e9; }
  .doc .pb { page-break-before: always; }
  .doc .foot { text-align:center; font-size:9px; color:#555; margin-top:26px; border-top:1px solid #ddd; padding-top:6px; }
  .doc .foot .web { color:#2563eb; }
</style>

  <div class="logo"><img src="${origin}/aston-logo.png" onerror="this.style.display='none'"/></div>

  <div><b>Cirebon, ${tglID(o.tglSurat)}</b></div>
  <div><b>NO OL : ${esc(noOL)}</b></div>
  <br>
  <div class="to">
    <b>${esc(o.namaTamu) || "-"}</b>
    ${o.instansi ? "<b>" + esc(o.instansi) + "</b>" : ""}
    ${o.kota ? "<b>" + esc(o.kota) + "</b>" : ""}
    ${o.noHP ? "<b>No HP : " + esc(o.noHP) + "</b>" : ""}
  </div>
  <br>
  <div class="sec">Perihal: ${esc(o.perihal)}</div>
  <div class="italb">Salam hangat dari ${HOTEL.nama}</div>
  <p>Terima kasih atas kesempatan yang telah diberikan kepada kami untuk mengajukan proposal untuk acara
  <b>${esc(o.instansi || o.namaAcara)}</b>. Kami sangat antusias atas peluang bekerja sama dengan ${esc(o.sapaan)} dan berkontribusi terhadap kesuksesan acara ini.</p>
  <p>Sehubungan dengan permintaan ${esc(o.sapaan)} terkait Kamar dan Paket Pertemuan di hotel kami, dengan ini kami sampaikan penawaran harga spesial sebagai berikut:</p>

  <div class="sec">KAMAR:</div>
  <div>Tanggal &nbsp;: ${o.tglKamar ? tglID(o.tglKamar) : "-"}</div>
  <div>Jumlah Kamar &nbsp;: ${angka(o.jumlahKamar) || "-"} Kamar</div>

  <div class="sec">Harga Kamar — ${esc(o.rateCat)}</div>
  <table>
    <tr class="rate-title"><td colspan="3">${HOTEL.nama.toUpperCase()} — ${esc(o.rateCat)}</td></tr>
    <tr>${th("ROOM TYPE")}${th("WEEKDAYS RATE")}${th("WEEKEND RATE")}</tr>
    ${rateRows}
  </table>

  <div class="sec pb">Harga Kamar Sudah Termasuk:</div>
  <ul>${inclList}</ul>
  <div class="sec">Kebijakan Extra Bed dan Anak Dibawah Umur</div>
  <p>Penggunaan Extra Bed dikenakan biaya Rp 400.000 per malam sudah termasuk sarapan. Gratis sarapan untuk usia di bawah 5 tahun dan dikenakan Rp 100.000 untuk usia di bawah 12 tahun. Penambahan sarapan di luar paket kamar dikenakan biaya Rp 180.000 per orang.</p>

  <div class="sec">1. KEBUTUHAN ACARA</div>
  <div>Nama Acara &nbsp;: <b>${esc(o.namaAcara) || "-"}</b></div>
  <div>Jumlah Peserta &nbsp;: ${angka(o.jumlahPeserta) ? "Est " + angka(o.jumlahPeserta) + " pax" : "-"}</div>

  <div class="sec">Rangkaian Acara:</div>
  <table>
    <tr>${th("Hari/Tanggal")}${th("Waktu")}${th("Acara")}${th("Tempat")}${th("Set up")}${th("Jumlah Peserta")}</tr>
    ${rangkaianRows}
  </table>
  <p><i>*Catatan: Pemblokiran ruang acara dapat berubah sesuai kebijakan hotel, selama tetap memenuhi persyaratan minimum pelaksanaan acara.</i></p>

  <div class="sec pb">RESIDENTIAL PACKAGE</div>
  <div><b>Special Price 3 Hari 2 Malam</b></div>
  <div><b>Twin/ Triple Share : ${rp(o.resTwin)} Nett/Orang</b></div>
  <div><b>Single Share : ${rp(o.resSingle)} Nett/Orang</b></div>
  <div style="margin-top:4px">Termasuk:</div>
  <ul>${resList}</ul>
  <div class="sec">Additional :</div>
  <div>Coffee Break : ${rp(o.addCoffee)}</div>
  <div>Lunch : ${rp(o.addLunch)}</div>
  <div>Dinner : ${rp(o.addDinner)}</div>
  <div>Band : ${rp(o.addBand)}</div>
  <div class="sec">ADD ON</div>
  <ul>${addonList}</ul>

  <div class="sec">OSMOSIS MUSIC &amp; EATERY</div>
  <div>Jam Operasional : 17.00 – 02.00 WIB (Senin-Sabtu) · Live Music setiap hari 20.00-02.00 · WA +62 817-720-100</div>
  <div class="sec">EAGLE GOLF DRIVING RANGE</div>
  <div>Jam buka 07.00 - 22.00 WIB · Reguler Rp 130.000 nett/100 bola · Add 50 bola Rp 70.000 · Sewa stick Rp 50.000/stick</div>

  <p style="margin-top:10px"><i><b>Catatan: Harga tersebut di atas sudah termasuk 21% pajak &amp; pelayanan dan hotel tidak memberikan komisi.</b></i></p>

  <div class="sec pb">ESTIMASI BIAYA</div>
  <table>
    <tr>${th("No")}${th("Deskripsi")}${th("Jumlah")}${th("Harga")}${th("Total")}</tr>
    ${estRows}
    <tr class="total"><td colspan="4" class="r">Grand Total</td>${td(grandTotal.toLocaleString("id-ID"), "r")}</tr>
  </table>
  <p>Estimasi biaya yang kami sampaikan bersifat sementara dan dapat berubah menyesuaikan kebutuhan serta spesifikasi yang akan disepakati lebih lanjut.</p>
  <p>Saat ini kami sudah melakukan reservasi sebanyak <b>${angka(o.jumlahKamar) || "-"} kamar</b>, namun masih berstatus tentative. Apabila ${esc(o.sapaan)} ingin melakukan perubahan silakan melakukan konfirmasi sebelum <b>${o.konfirmasiTgl ? tglID(o.konfirmasiTgl) : "________"}</b>. Harga yang disebutkan dalam proposal ini berlaku hingga hari tersebut, dan apabila konfirmasi melewati hari tersebut maka hotel berhak melakukan perubahan harga.</p>

  <p style="margin-top:18px">Apabila terdapat perubahan atau membutuhkan informasi lebih lanjut, silakan menghubungi saya di nomor telepon dan email yang tertera di bawah ini.</p>
  <p>Atas perhatian dan kerjasamanya kami mengucapkan terima kasih.</p>
  <div style="margin-top:8px">Hormat Kami,<br>${HOTEL.nama}</div>
  <div style="margin-top:48px"><b><u>${esc(o.ttdNama) || "-"}</u></b><br>${esc(o.ttdJabatan)}${o.ttdHP ? "<br>" + esc(o.ttdHP) : ""}</div>

  ${foot}
</div>`;
    return html;
  }

  async function unduh() {
    setBusy(true);
    const namaFile = "OL-" + (noOL || "offering").replace(/[^\w-]/g, "_") + ".pdf";
    const ok = await unduhPDFdariHTML(cetak(), namaFile);
    // naikkan counter agar nomor berikutnya lanjut
    try {
      const th = new Date(o.tglSurat || hariIni()).getFullYear();
      await fetch("/api/docnum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: "OL", tahun: th, nomor: angka(o.nomor) }) });
    } catch (e) {}
    setBusy(false);
  }

  return (
    <Modal title="Buat Offering Letter" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nomor"><input className={inp} inputMode="numeric" value={o.nomor} onChange={(e) => set("nomor", e.target.value.replace(/[^\d]/g, ""))} placeholder="124" /></Field>
          <Field label="Tanggal Surat"><input type="date" className={inp} value={o.tglSurat} onChange={(e) => set("tglSurat", e.target.value)} /></Field>
          <Field label="Kode Sales"><input className={inp} value={o.kodeSales} onChange={(e) => set("kodeSales", e.target.value.toUpperCase())} placeholder="AS" /></Field>
          <Field label="No. OL (otomatis)"><input className={inp + " bg-slate-100 font-semibold"} value={noOL} readOnly /></Field>
        </div>

        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">HARGA KAMAR (Weekday / Weekend)</span>
            <select className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white" value={o.rateCat} onChange={(e) => set("rateCat", e.target.value)}>
              {RATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-1 text-[11px] text-slate-400 font-semibold px-1">
              <span className="col-span-6">Room Type</span><span className="col-span-3 text-center">Weekday</span><span className="col-span-3 text-center">Weekend</span>
            </div>
            {(o.rates[o.rateCat] || []).map((r, i) => (
              <div key={r[0]} className="grid grid-cols-12 gap-1 items-center">
                <span className="col-span-6 text-xs text-[#12263a]">{r[0]}</span>
                <input className={inp + " !py-1.5 text-xs col-span-3"} inputMode="numeric" value={r[1] ? angka(r[1]).toLocaleString("id-ID") : ""} onChange={(e) => setRate(i, "wd", e.target.value.replace(/[^\d]/g, ""))} />
                <input className={inp + " !py-1.5 text-xs col-span-3"} inputMode="numeric" value={r[2] ? angka(r[2]).toLocaleString("id-ID") : ""} onChange={(e) => setRate(i, "we", e.target.value.replace(/[^\d]/g, ""))} />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Kategori: {RATE_CATEGORIES.join(" · ")}. Harga bisa diubah per kategori.</p>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="text-xs font-semibold text-slate-500">PENERIMA</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sapaan"><input className={inp} value={o.sapaan} onChange={(e) => set("sapaan", e.target.value)} placeholder="Bapak / Ibu" /></Field>
            <Field label="Nama"><input className={inp} value={o.namaTamu} onChange={(e) => set("namaTamu", e.target.value)} /></Field>
            <Field label="Instansi"><input className={inp} value={o.instansi} onChange={(e) => set("instansi", e.target.value)} /></Field>
            <Field label="Kota"><input className={inp} value={o.kota} onChange={(e) => set("kota", e.target.value)} placeholder="Jakarta" /></Field>
            <Field label="No HP"><input className={inp} value={o.noHP} onChange={(e) => set("noHP", e.target.value)} /></Field>
            <Field label="Perihal"><input className={inp} value={o.perihal} onChange={(e) => set("perihal", e.target.value)} /></Field>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="text-xs font-semibold text-slate-500">KAMAR & ACARA</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Kamar/Acara"><input type="date" className={inp} value={o.tglKamar} onChange={(e) => set("tglKamar", e.target.value)} /></Field>
            <Field label="Jumlah Kamar"><input className={inp} inputMode="numeric" value={o.jumlahKamar} onChange={(e) => set("jumlahKamar", e.target.value.replace(/[^\d]/g, ""))} /></Field>
            <Field label="Nama Acara"><input className={inp} value={o.namaAcara} onChange={(e) => set("namaAcara", e.target.value)} /></Field>
            <Field label="Jumlah Peserta (pax)"><input className={inp} inputMode="numeric" value={o.jumlahPeserta} onChange={(e) => set("jumlahPeserta", e.target.value.replace(/[^\d]/g, ""))} /></Field>
          </div>
        </div>

        {/* Rangkaian Acara */}
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">RANGKAIAN ACARA</span>
            <button onClick={() => addRow("rangkaian", { hari: "", waktu: "", acara: "", tempat: "", setup: "", jumlah: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Baris</button>
          </div>
          <div className="space-y-2">
            {o.rangkaian.map((r, i) => (
              <div key={i} className="grid grid-cols-6 gap-1 items-center">
                <input type="date" className={inp + " !py-1.5 text-xs"} value={r.hari} onChange={(e) => setRow("rangkaian", i, "hari", e.target.value)} />
                <input className={inp + " !py-1.5 text-xs"} placeholder="Waktu" value={r.waktu} onChange={(e) => setRow("rangkaian", i, "waktu", e.target.value)} />
                <input className={inp + " !py-1.5 text-xs"} placeholder="Acara" value={r.acara} onChange={(e) => setRow("rangkaian", i, "acara", e.target.value)} />
                <input className={inp + " !py-1.5 text-xs"} placeholder="Tempat" value={r.tempat} onChange={(e) => setRow("rangkaian", i, "tempat", e.target.value)} />
                <input className={inp + " !py-1.5 text-xs"} placeholder="Set up" value={r.setup} onChange={(e) => setRow("rangkaian", i, "setup", e.target.value)} />
                <div className="flex gap-1">
                  <input className={inp + " !py-1.5 text-xs"} placeholder="Jml" value={r.jumlah} onChange={(e) => setRow("rangkaian", i, "jumlah", e.target.value)} />
                  {o.rangkaian.length > 1 && <button onClick={() => delRow("rangkaian", i)} className="text-rose-600 text-xs px-1">✕</button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Harga paket */}
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">HARGA PAKET (opsional, tampil di surat)</div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Twin/Triple (Rp)"><input className={inp} inputMode="numeric" value={o.resTwin} onChange={(e) => set("resTwin", e.target.value.replace(/[^\d]/g, ""))} /></Field>
            <Field label="Single (Rp)"><input className={inp} inputMode="numeric" value={o.resSingle} onChange={(e) => set("resSingle", e.target.value.replace(/[^\d]/g, ""))} /></Field>
            <Field label="Lunch (Rp)"><input className={inp} inputMode="numeric" value={o.addLunch} onChange={(e) => set("addLunch", e.target.value.replace(/[^\d]/g, ""))} /></Field>
          </div>
        </div>

        {/* Estimasi biaya */}
        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">ESTIMASI BIAYA</span>
            <button onClick={() => addRow("estimasi", { deskripsi: "", jumlah: "", harga: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Baris</button>
          </div>
          <div className="space-y-2">
            {o.estimasi.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <input className={inp + " !py-1.5 text-xs col-span-5"} placeholder="Deskripsi" value={r.deskripsi} onChange={(e) => setRow("estimasi", i, "deskripsi", e.target.value)} />
                <input className={inp + " !py-1.5 text-xs col-span-2"} placeholder="Jml" inputMode="numeric" value={r.jumlah} onChange={(e) => setRow("estimasi", i, "jumlah", e.target.value.replace(/[^\d]/g, ""))} />
                <input className={inp + " !py-1.5 text-xs col-span-3"} placeholder="Harga" inputMode="numeric" value={r.harga ? angka(r.harga).toLocaleString("id-ID") : ""} onChange={(e) => setRow("estimasi", i, "harga", e.target.value.replace(/[^\d]/g, ""))} />
                <div className="col-span-2 text-right text-xs text-slate-500">
                  {(angka(r.jumlah) * angka(r.harga)).toLocaleString("id-ID")}
                  {o.estimasi.length > 1 && <button onClick={() => delRow("estimasi", i)} className="text-rose-600 ml-1">✕</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-right text-sm font-bold text-[#12263a] mt-2">Grand Total: Rp {grandTotal.toLocaleString("id-ID")}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Konfirmasi sebelum"><input type="date" className={inp} value={o.konfirmasiTgl} onChange={(e) => set("konfirmasiTgl", e.target.value)} /></Field>
          <div />
          <Field label="Nama Penandatangan"><input className={inp} value={o.ttdNama} onChange={(e) => set("ttdNama", e.target.value)} /></Field>
          <Field label="Jabatan"><input className={inp} value={o.ttdJabatan} onChange={(e) => set("ttdJabatan", e.target.value)} /></Field>
          <Field label="No HP Penandatangan"><input className={inp} value={o.ttdHP} onChange={(e) => set("ttdHP", e.target.value)} /></Field>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Tutup</button>
        <button onClick={unduh} disabled={busy} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{busy ? "Membuat PDF…" : "⬇ Download PDF"}</button>
      </div>
    </Modal>
  );
}
