"use client";

import { useState, useEffect } from "react";
import { Modal, Field, inp } from "@/components/Modal";
import { unduhPDFdariHTML } from "@/lib/pdf";
import { RATE_CATEGORIES, rateDefault } from "@/lib/rates";

// ====== Identitas hotel (ubah bila perlu) ======
const HOTEL = {
  nama: "Aston Cirebon Hotel & Convention Center",
  alamat: "Jl. Brigjen Dharsono Bypass No.12C, Kertawinangun, Kedawung, Kota Cirebon, Jawa Barat 45132",
  telp: "(0231) 8298000",
  email: "info@astoncirebon.com",
  web: "www.AstonCirebon.com",
};



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

const RES_BENEFIT = "Superior Room\nPenggunaan ruang Meeting selama 12 jam\nLCD Projector (2000 lumens) dan Layar (2 m x 1,5 m)\nAudio Sound System\n2 Microphone\nMeeting Stationary: 1 Flip Chart 3 warna Spidol, Notepad dan Pensil\nAir Putih dan permen\n2 kali sarapan\n1 kali makan siang\n1 kali makan malam di ballroom\n1 kali Coffee Break\n1 kali Amazing Race";

const PACKAGES = [
  { nama: "Coffee Break Package", harga: 150000, benefit: "1x Coffee Break (snack + minuman)\nRuang meeting\nStandard sound system" },
  { nama: "Meals Package", harga: 250000, benefit: "1x Makan (Lunch/Dinner) prasmanan\nRuang meeting\nAir mineral" },
  { nama: "Half Day Meeting", harga: 300000, benefit: "Ruang meeting (4 jam)\n1x Coffee Break\n1x Makan\nLCD Projector & layar\nSound system & 2 microphone\nMeeting stationary\nAir mineral & permen" },
  { nama: "Full Day Meeting", harga: 450000, benefit: "Ruang meeting (8 jam)\n2x Coffee Break\n1x Makan\nLCD Projector & layar\nSound system & 2 microphone\nMeeting stationary\nAir mineral & permen" },
  { nama: "Fullboard Meeting", harga: 600000, benefit: "Menginap 1 malam (twin share) + sarapan\nRuang meeting\n2x Coffee Break\n3x Makan\nLCD Projector & layar\nSound system & 2 microphone\nMeeting stationary" },
  { nama: "Residential Twin Package", harga: 1500000, benefit: "Special Price 3 Hari 2 Malam (Twin/Triple Share)\n" + RES_BENEFIT },
  { nama: "Residential Single Package", harga: 2300000, benefit: "Special Price 3 Hari 2 Malam (Single Share)\n" + RES_BENEFIT },
];

// ====== Wedding Package (4 venue × Gold/Platinum) ======
const W_GOLD = "1 Suite Room 1 malam (honeymoon decoration)\n2 Superior Room 1 malam\nBuffet 13 pilihan menu\nFood Testing 6 orang\nRomantic Dinner\nAkad Nikah 30 pax include Food\nGiant Welcome Banner\nFree Meeting Room 1x Meeting Coordination\nFree Parkir (10 kendaraan)";
const W_PLAT = "1 Presidential Suite 1 malam (honeymoon decoration)\n2 Superior Room 1 malam\nBuffet 16 pilihan menu\n2 Food Stalls (25% of each)\n1 Beverage Stall (50% of each)\nFood Testing 6 orang\nRomantic Dinner\nAkad Nikah 30 pax include Food\nGiant Welcome Banner\nFree Meeting Room 1x Meeting Coordination\nFree Parkir (10 kendaraan)\nFree Royal Carriage";
const WEDDING_PACKAGES = [
  { venue: "Backyard", tier: "Gold", harga: 28900000, persons: 100, add: 225000, benefit: W_GOLD },
  { venue: "Backyard", tier: "Platinum", harga: 35500000, persons: 100, add: 265000, benefit: W_PLAT },
  { venue: "Onyx Room", tier: "Gold", harga: 49900000, persons: 200, add: 225000, benefit: W_GOLD + "\nLCD dan Screen\nFree VIP/Transit Room" },
  { venue: "Onyx Room", tier: "Platinum", harga: 66500000, persons: 200, add: 265000, benefit: W_PLAT + "\nVideotron 6 m x 2.5 m\nFree VIP/Transit Room" },
  { venue: "Nana Land", tier: "Gold", harga: 92900000, persons: 400, add: 225000, benefit: W_GOLD + "\nLCD dan Screen" },
  { venue: "Nana Land", tier: "Platinum", harga: 109500000, persons: 400, add: 265000, benefit: W_PLAT + "\nLCD & Screen" },
  { venue: "Sapphire Grand Ballroom", tier: "Gold", harga: 125900000, persons: 500, add: 225000, benefit: W_GOLD + "\nVideotron 8 m x 4 m\nFree VIP/Transit Room\nFree Royal Carriage" },
  { venue: "Sapphire Grand Ballroom", tier: "Platinum", harga: 144500000, persons: 500, add: 265000, benefit: W_PLAT + "\nVideotron 8 m x 4 m\nFree VIP/Transit Room" },
];
const wLabel = (w) => w.venue + " — " + w.tier;

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
    jenisOL: "Meeting",
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
    ttdJabatan: "Sales Person",
    pakets: [{ nama: PACKAGES[5].nama, harga: String(PACKAGES[5].harga), benefit: PACKAGES[5].benefit }],
    weddings: [{ key: wLabel(WEDDING_PACKAGES[6]), harga: String(WEDDING_PACKAGES[6].harga), persons: String(WEDDING_PACKAGES[6].persons), add: String(WEDDING_PACKAGES[6].add), benefit: WEDDING_PACKAGES[6].benefit }],
    ttdHP: "",
  });

  const kodeDok = o.jenisOL === "Wedding" ? "OLW" : "OL";
  const set = (k, v) => setO((s) => ({ ...s, [k]: v }));
  const pilihPaket = (i, nama) => { const p = PACKAGES.find((x) => x.nama === nama); setO((s) => ({ ...s, pakets: s.pakets.map((r, j) => (j === i ? { nama, harga: p ? String(p.harga) : r.harga, benefit: p ? p.benefit : r.benefit } : r)) })); };
  const setPaket = (i, k, v) => setO((s) => ({ ...s, pakets: s.pakets.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addPaket = () => setO((s) => ({ ...s, pakets: [...s.pakets, { nama: PACKAGES[0].nama, harga: String(PACKAGES[0].harga), benefit: PACKAGES[0].benefit }] }));
  const delPaket = (i) => setO((s) => ({ ...s, pakets: s.pakets.filter((_, j) => j !== i) }));
  const pilihWedding = (i, key) => { const w = WEDDING_PACKAGES.find((x) => wLabel(x) === key); setO((s) => ({ ...s, weddings: s.weddings.map((r, j) => (j === i ? { key, harga: w ? String(w.harga) : r.harga, persons: w ? String(w.persons) : r.persons, add: w ? String(w.add) : r.add, benefit: w ? w.benefit : r.benefit } : r)) })); };
  const setWed = (i, k, v) => setO((s) => ({ ...s, weddings: s.weddings.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addWed = () => setO((s) => ({ ...s, weddings: [...s.weddings, { key: wLabel(WEDDING_PACKAGES[0]), harga: String(WEDDING_PACKAGES[0].harga), persons: String(WEDDING_PACKAGES[0].persons), add: String(WEDDING_PACKAGES[0].add), benefit: WEDDING_PACKAGES[0].benefit }] }));
  const delWed = (i) => setO((s) => ({ ...s, weddings: s.weddings.filter((_, j) => j !== i) }));
  const setRow = (arr, i, k, v) => setO((s) => ({ ...s, [arr]: s[arr].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRow = (arr, kosong) => setO((s) => ({ ...s, [arr]: [...s[arr], kosong] }));
  const delRow = (arr, i) => setO((s) => ({ ...s, [arr]: s[arr].filter((_, j) => j !== i) }));
  const setRate = (i, kol, v) => setO((s) => ({ ...s, rates: { ...s.rates, [s.rateCat]: s.rates[s.rateCat].map((r, j) => (j === i ? [r[0], kol === "wd" ? v : r[1], kol === "we" ? v : r[2]] : r)) } }));
  const [busy, setBusy] = useState(false);

  // Nomor otomatis mengikuti jenis (OL untuk Meeting, OLW untuk Wedding), reset per tahun
  useEffect(() => {
    const th = new Date(o.tglSurat || hariIni()).getFullYear();
    fetch(`/api/docnum?kode=${kodeDok}&tahun=${th}`, { cache: "no-store" })
      .then((r) => r.json()).then((r) => { if (r.status === "ok") set("nomor", String(r.next)); })
      .catch(() => {});
  }, [o.jenisOL]); // eslint-disable-line

  const grandTotal = o.estimasi.reduce((t, r) => t + angka(r.jumlah) * angka(r.harga), 0);
  const noOL = buildNoDok(kodeDok, o.nomor, o.tglSurat, o.kodeSales);

  function cetak() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const th = (t) => `<th>${t}</th>`;
    const td = (t, cls = "") => `<td class="${cls}">${t}</td>`;

    const rateRows = (o.rates[o.rateCat] || []).map((r) =>
      `<tr>${td(r[0], "c")}${td(rp(r[1]), "c")}${td(rp(r[2]), "c")}</tr>`).join("");

    const inclList = INCLUSIONS.map((x) => `<li>${esc(x)}</li>`).join("");
    const resList = RES_INCLUDES.map((x) => `<li>${esc(x)}</li>`).join("");
    const addonList = ADDON.map((x) => `<li>${esc(x)}</li>`).join("");
    const paketBlok = (o.pakets || []).map((p) => {
      const li = String(p.benefit || "").split("\n").filter((x) => x.trim()).map((x) => `<li>${esc(x)}</li>`).join("");
      return `<div style="margin-top:6px"><b>${esc(p.nama)}</b> &nbsp;—&nbsp; <b>${rp(p.harga)} Nett/Orang</b></div><ul>${li}</ul>`;
    }).join("");
    const weddingBlok = (o.weddings || []).map((w) => {
      const li = String(w.benefit || "").split("\n").filter((x) => x.trim()).map((x) => `<li>${esc(x)}</li>`).join("");
      return `<div class="sec">WEDDING PACKAGE — ${esc(w.key)}</div>
      <div><b>Harga: ${rp(w.harga)} Nett</b> untuk <b>${esc(w.persons)} Orang</b></div>
      <div>Penambahan pesanan: <b>${rp(w.add)} Nett/Orang</b></div>
      <div style="margin-top:2px">Benefit termasuk:</div><ul>${li}</ul>`;
    }).join("");
    const paketSection = o.jenisOL === "Wedding"
      ? `<div class="sec pb">PILIHAN WEDDING PACKAGE</div>${weddingBlok}`
      : `<div class="sec pb">PAKET</div>${paketBlok}`;

    const rangkaianRows = o.rangkaian.map((r) =>
      `<tr>${td(esc(tglID(r.hari)))}${td(esc(r.waktu))}${td(esc(r.acara))}${td(esc(r.tempat))}${td(esc(r.setup))}${td(esc(r.jumlah), "c")}</tr>`).join("");

    const galeri = (a, b, c) => `<table class="galeri"><tr><td><img src="${origin}/img/${a}"/></td><td><img src="${origin}/img/${b}"/></td><td><img src="${origin}/img/${c}"/></td></tr></table>`;

    const galeriWedding = o.jenisOL === "Wedding"
      ? `<div class="sec pb">VENUE &amp; DEKORASI WEDDING</div>
  <div class="subcap">Pilihan venue wedding ${HOTEL.nama} — Backyard, Onyx, Nana Land &amp; Sapphire Ballroom.</div>
  ${galeri("wedding-1.jpg", "wedding-2.jpg", "wedding-3.jpg")}`
      : "";

    const estRows = o.estimasi.map((r, i) => {
      const tot = angka(r.jumlah) * angka(r.harga);
      return `<tr>${td(i + 1, "c")}${td(esc(r.deskripsi))}${td(angka(r.jumlah).toLocaleString("id-ID"), "r")}${td(angka(r.harga).toLocaleString("id-ID"), "r")}${td(tot.toLocaleString("id-ID"), "r")}</tr>`;
    }).join("");



    const html = `<div class="doc"><style>
  .doc { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color:#26303b; font-size:12px; line-height:1.55; }
  .doc * { box-sizing: border-box; }
  .doc .kop { border-top:5px solid #12263a; border-bottom:2px solid #cbd5e1; padding:12px 0 10px; text-align:center; margin-bottom:14px; }
  .doc .kop img { height:52px; display:block; margin:0 auto 6px; }
  .doc .kop .hname { font-size:14px; font-weight:bold; color:#12263a; letter-spacing:1px; }
  .doc .kop .haddr { font-size:9px; color:#64748b; margin-top:2px; }
  .doc b { color:#111; }
  .doc .to b { display:block; }
  .doc .metabar { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:11px; }
  .doc .metabar td { border:0; padding:4px 8px; color:#12263a; font-weight:bold; }
  .doc .metabar td:first-child { border-left:3px solid #12263a; }
  .doc .sec { font-weight:bold; color:#12263a; margin:15px 0 5px; padding:4px 0 4px 9px; border-left:4px solid #334155; background:#f1f5f9; text-transform:uppercase; font-size:11.5px; letter-spacing:.4px; }
  .doc .italb { font-weight:bold; font-style:italic; color:#12263a; }
  .doc ul { margin:4px 0 4px 18px; padding:0; }
  .doc li { margin:2px 0; }
  .doc table { width:100%; border-collapse:collapse; margin:8px 0; page-break-inside:avoid; }
  .doc th, .doc td { border:1px solid #cbd5e1; padding:6px 8px; text-align:left; vertical-align:top; }
  .doc th { background:#475569; color:#fff; text-align:center; font-size:11px; letter-spacing:.3px; }
  .doc td.c, .doc th.c { text-align:center; }
  .doc td.r { text-align:right; }
  .doc .rate-title td { text-align:center; font-weight:bold; background:#12263a; color:#fff; border-color:#12263a; }
  .doc .total td { font-weight:bold; background:#eef2f7; }
  .doc .pb { page-break-before: always; }
  .doc .foot { text-align:center; font-size:9px; color:#fff; margin-top:26px; background:#12263a; padding:8px 6px; border-top:3px solid #cbd5e1; }
  .doc .foot .web { color:#cbd5e1; }
  .doc .galeri { width:100%; margin:6px 0 4px; page-break-inside:avoid; table-layout:fixed; border-collapse:collapse; }
  .doc .galeri td { width:33.33%; border:0; padding:0 3px; vertical-align:top; }
  .doc .galeri td:first-child { padding-left:0; }
  .doc .galeri td:last-child { padding-right:0; }
  .doc .galeri img { width:100%; height:auto; display:block; border-radius:6px; border:1px solid #e2e8f0; }
  .doc .subcap { font-size:10px; color:#64748b; margin:2px 0 6px; }
</style>

  <div class="kop">
    <img src="${origin}/aston-logo.png" onerror="this.style.display='none'"/>
    <div class="hname">${HOTEL.nama.toUpperCase()}</div>
    <div class="haddr">${HOTEL.alamat} · ${HOTEL.telp} · ${HOTEL.email}</div>
  </div>

  <table class="metabar"><tr><td>Cirebon, ${tglID(o.tglSurat)}</td><td class="r">NO OL : ${esc(noOL)}</td></tr></table>
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

  ${galeriWedding}

  <div class="sec">1. KEBUTUHAN ACARA</div>
  <div>Nama Acara &nbsp;: <b>${esc(o.namaAcara) || "-"}</b></div>
  <div>Jumlah Peserta &nbsp;: ${angka(o.jumlahPeserta) ? "Est " + angka(o.jumlahPeserta) + " pax" : "-"}</div>

  <div class="sec">Rangkaian Acara:</div>
  <table>
    <tr>${th("Hari/Tanggal")}${th("Waktu")}${th("Acara")}${th("Tempat")}${th("Set up")}${th("Jumlah Peserta")}</tr>
    ${rangkaianRows}
  </table>
  <p><i>*Catatan: Pemblokiran ruang acara dapat berubah sesuai kebijakan hotel, selama tetap memenuhi persyaratan minimum pelaksanaan acara.</i></p>

  ${paketSection}
  <div class="sec">ADD ON</div>
  <ul>${addonList}</ul>

  <div class="sec pb">OSMOSIS MUSIC &amp; EATERY</div>
  <div class="subcap">Jam Operasional : 17.00 – 02.00 WIB (Senin-Sabtu) · Live Music setiap hari 20.00-02.00 · WA +62 817-720-100</div>
  ${galeri("osmosis-1.jpg", "osmosis-2.jpg", "osmosis-3.jpg")}

  <div class="sec">EAGLE GOLF DRIVING RANGE</div>
  <div class="subcap">Jam buka 07.00 - 22.00 WIB · Reguler Rp 130.000 nett/100 bola · Add 50 bola Rp 70.000 · Sewa stick Rp 50.000/stick</div>
  ${galeri("eagle-1.jpg", "eagle-2.jpg", "eagle-3.jpg")}

  <div class="sec">FUN GAMES &amp; TEAM BUILDING</div>
  <div class="subcap">Aneka permainan seru untuk gathering &amp; outbound di area taman &amp; lapangan hotel — cocok untuk employee gathering, family day, dan team building.</div>
  ${galeri("fungames-1.jpg", "fungames-2.jpg", "fungames-3.jpg")}

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

</div>`;
    return html;
  }

  async function unduh() {
    setBusy(true);
    const namaFile = "OL-" + (noOL || "offering").replace(/[^\w-]/g, "_") + ".pdf";
    const ok = await unduhPDFdariHTML(cetak(), namaFile, HOTEL.alamat + " · " + HOTEL.telp + " · " + HOTEL.web);
    // naikkan counter agar nomor berikutnya lanjut
    try {
      const th = new Date(o.tglSurat || hariIni()).getFullYear();
      await fetch("/api/docnum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode: kodeDok, tahun: th, nomor: angka(o.nomor) }) });
    } catch (e) {}
    setBusy(false);
  }

  return (
    <Modal title="Buat Offering Letter" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium text-slate-700 mb-1">Jenis Offering</div>
          <div className="grid grid-cols-2 gap-2">
            {["Meeting", "Wedding"].map((t) => (
              <button key={t} type="button" onClick={() => set("jenisOL", t)}
                className={"rounded-lg border px-3 py-2.5 text-sm font-semibold transition " + (o.jenisOL === t ? "border-[#12263a] bg-[#12263a] text-white" : "border-slate-300 text-slate-600 hover:bg-slate-50")}>
                {t === "Meeting" ? "Meeting / Kamar" : "Wedding"}
              </button>
            ))}
          </div>
          {o.jenisOL === "Wedding" && <p className="text-xs text-slate-400 mt-1">Nomor otomatis memakai seri terpisah (OLW).</p>}
        </div>
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

        {/* Paket (bisa lebih dari satu; benefit & harga mengikuti paket, tetap bisa diedit) */}
        {o.jenisOL === "Meeting" ? (
        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">PAKET (bisa lebih dari satu)</span>
            <button onClick={addPaket} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Tambah Paket</button>
          </div>
          {o.pakets.map((p, i) => (
            <div key={i} className="border border-slate-100 rounded-lg p-2 space-y-2 bg-slate-50/40">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label={"Paket " + (i + 1)}>
                    <select className={inp} value={p.nama} onChange={(e) => pilihPaket(i, e.target.value)}>
                      {PACKAGES.map((x) => <option key={x.nama} value={x.nama}>{x.nama}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Harga (Rp)"><input className={inp} inputMode="numeric" value={p.harga ? angka(p.harga).toLocaleString("id-ID") : ""} onChange={(e) => setPaket(i, "harga", e.target.value.replace(/[^\d]/g, ""))} /></Field>
              </div>
              <Field label="Benefit (satu per baris, bisa diedit)"><textarea className={inp + " h-28 resize-none text-sm"} value={p.benefit} onChange={(e) => setPaket(i, "benefit", e.target.value)} /></Field>
              {o.pakets.length > 1 && <button onClick={() => delPaket(i)} className="text-xs text-rose-600 font-semibold">✕ Hapus paket ini</button>}
            </div>
          ))}
        </div>
        ) : (
        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">WEDDING PACKAGE (bisa lebih dari satu)</span>
            <button onClick={addWed} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Tambah Paket</button>
          </div>
          {o.weddings.map((w, i) => (
            <div key={i} className="border border-slate-100 rounded-lg p-2 space-y-2 bg-slate-50/40">
              <div className="grid grid-cols-6 gap-2">
                <div className="col-span-3">
                  <Field label={"Venue & Tier " + (i + 1)}>
                    <select className={inp} value={w.key} onChange={(e) => pilihWedding(i, e.target.value)}>
                      {WEDDING_PACKAGES.map((x) => <option key={wLabel(x)} value={wLabel(x)}>{wLabel(x)}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Harga (Rp)"><input className={inp} inputMode="numeric" value={w.harga ? angka(w.harga).toLocaleString("id-ID") : ""} onChange={(e) => setWed(i, "harga", e.target.value.replace(/[^\d]/g, ""))} /></Field>
                <Field label="Orang"><input className={inp} inputMode="numeric" value={w.persons} onChange={(e) => setWed(i, "persons", e.target.value.replace(/[^\d]/g, ""))} /></Field>
                <Field label="Add/Org"><input className={inp} inputMode="numeric" value={w.add ? angka(w.add).toLocaleString("id-ID") : ""} onChange={(e) => setWed(i, "add", e.target.value.replace(/[^\d]/g, ""))} /></Field>
              </div>
              <Field label="Benefit (satu per baris, bisa diedit)"><textarea className={inp + " h-32 resize-none text-sm"} value={w.benefit} onChange={(e) => setWed(i, "benefit", e.target.value)} /></Field>
              {o.weddings.length > 1 && <button onClick={() => delWed(i)} className="text-xs text-rose-600 font-semibold">✕ Hapus paket ini</button>}
            </div>
          ))}
        </div>
        )}

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
