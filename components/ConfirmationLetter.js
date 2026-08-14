"use client";

import { useState } from "react";
import { Modal, Field, inp } from "@/components/Modal";
import { unduhPDFdariHTML } from "@/lib/pdf";

const HOTEL = {
  nama: "Aston Cirebon Hotel & Convention Center",
  namaCap: "ASTON CIREBON HOTEL & CONVENTION CENTER",
  alamat: "Jl. Brigjen Dharsono Bypass No.12C, Kertawinangun, Kedawung, Kota Cirebon, Jawa Barat 45132",
  telp: "(0231) 8298000",
  email: "info@astoncirebon.com",
  web: "www.AstonCirebon.com",
};

// Room type, Published, Weekdays, Weekend
const ROOM_RATES = [
  ["Superior", 2475000, 928000, 978000],
  ["Deluxe", 2825000, 1048000, 1098000],
  ["Junior Executive", 3175000, 1168000, 1218000],
  ["Executive", 4075000, 1588000, 1638000],
  ["Suite", 5425000, 2108000, 2158000],
  ["Presidential Suite", 12625000, 5108000, 5158000],
];

const INCLUSIONS = [
  "Sarapan untuk 2 orang",
  "Welcome Drink dan wet towel pada saat kedatangan",
  "Dua botol air mineral setiap hari di dalam kamar",
  "Fasilitas pembuat kopi dan teh",
  "Akses internet di kamar dan seluruh area hotel",
  "Free Shuttle menuju Mall dan stasiun kereta",
];

const BANK = { no: "134.050.888.8889", nama: "MULIA PUTRI LESTARI", bank: "Bank Mandiri Cabang Cirebon" };

const rp = (n) => "Rp " + (Number(String(n).replace(/[^\d]/g, "")) || 0).toLocaleString("id-ID") + ",-";
const angka = (n) => Number(String(n).replace(/[^\d]/g, "")) || 0;
const hariIni = () => new Date().toISOString().slice(0, 10);
const tglID = (s) => { if (!s) return "________"; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); };
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

function pasalList(g) {
  return [
    ["KEBIJAKAN HOTEL",
      "<b>Kebijakan Pembatalan</b><br>Dalam hal pembatalan, pemberitahuan tertulis harus telah diterima hotel paling lama 90 hari sebelum pelaksanaan kegiatan. Deposit akan hangus apabila Bapak/Ibu melakukan pembatalan. Apabila pembatalan dilakukan kurang dari 90 hari sebelum pelaksanaan kegiatan maka akan dikenakan 100% biaya pembatalan.<br><br><b>Ketidakhadiran (No-Show)</b><br>Dalam hal ketidakhadiran tamu atau no-show, hotel berhak mengenakan biaya penuh terhadap seluruh kamar dan jumlah malam yang telah direservasi.<br><br><b>Pengurangan Jumlah Kamar</b><br>• Pengurangan jumlah kamar dalam kurun waktu 30 dan 7 hari sebelum tanggal kedatangan, pengurangan sebesar 5% dari total masa menginap dapat diizinkan tanpa dikenakan biaya.<br>• Pengurangan jumlah kamar dalam kurun waktu kurang dari 7 hari sebelum tanggal kedatangan akan dikenakan biaya penalty 100% sesuai dengan jumlah kamar dan masa menginap yang dibatalkan."],
    ["DAFTAR KAMAR (ROOMING LIST)",
      "Untuk kelancaran pembagian kamar dimohon mengirimkan daftar kamar atau rooming list paling lambat 2 hari sebelum tanggal kedatangan tamu."],
    ["DEKORASI",
      "Klien setuju bahwa tidak ada bendera, banner, poster, gambar, tanda tangan, logo perusahaan dan lain-lain yang akan dipasang di area umum tanpa persetujuan hotel. Setiap bahan dekorasi yang disetujui harus mematuhi peraturan perlindungan kebakaran dan hotel berhak meminta sertifikat resmi untuk itu. Hotel berhak membebankan biaya atas segala kerusakan yang diakibatkan oleh dekorasi klien."],
    ["BARANG BERBAHAYA",
      "Open flame (lampu lantern, lilin, obor, dll), sparklers, fireworks, pyrotechnics, bahan kimia berbahaya, glitter, confetti, pasir dan segala zat yang menghasilkan sampah/puing dilarang keras di lokasi hotel. Pelanggaran dapat mengakibatkan pembatalan acara, tindakan hukum, dan biaya pembersihan/kerusakan."],
    ["DEPOSIT & PEMBAYARAN",
      "• Biaya kamar akan secara otomatis ditagihkan ke dalam Group Master Account. Biaya tambahan yang dikonsumsi tamu akan dibebankan sebelum meninggalkan hotel.<br>• Hotel berhak meminta tambahan deposit apabila terdapat penambahan jumlah peserta.<br>• Pembayaran DP 50% paling lambat tanggal <b>" + tglID(g.dpDate) + "</b>.<br>• Pelunasan pembayaran paling lambat <b>" + tglID(g.pelunasanDate) + "</b> sebelum kegiatan.<br><br>Pembayaran menggunakan cash atau bank transfer ke:<br>Account Number : <b>" + BANK.no + "</b><br>Account Name : <b>" + BANK.nama + "</b><br>Bank : <b>" + BANK.bank + "</b><br><br>Setelah transfer, mohon kirimkan salinan bukti transfer kepada pihak hotel melalui email. Pembayaran ke rekening lain tidak akan diterima sebagai bukti pembayaran."],
    ["FASILITAS KREDIT",
      "Fasilitas kredit dapat diberikan kepada perusahaan yang memenuhi syarat setelah sukses melakukan aplikasi. Pihak hotel membutuhkan setidaknya 14 hari kerja untuk memproses aplikasi. Fasilitas kredit tidak berlaku untuk tamu individual."],
    ["JATUH TEMPO",
      "Apabila Bapak/Ibu ingin melakukan reservasi, silakan melakukan konfirmasi dengan menandatangani kontrak ini sebelum <b>" + tglID(g.jatuhTempoDate) + "</b>. Harga yang tercantum berlaku hingga tanggal jatuh tempo tersebut, dan apabila melewati tanggal tersebut hotel berhak melakukan revisi harga."],
    ["KONDISI DARURAT",
      "Kontrak ini akan berakhir tanpa menimbulkan kewajiban kepada masing-masing pihak apabila terdapat keadaan di luar kekuasaan kedua belah pihak, termasuk namun tidak terbatas pada tindakan Tuhan, peraturan pemerintah, kebakaran, banjir, ledakan, perang, bencana, kekacauan sipil, pembatasan transportasi, peringatan kesehatan/epidemi, dan sebab lain yang wajar di luar kendali."],
    ["KEAMANAN",
      "Penyelenggara Acara bertanggung jawab penuh atas keamanan peralatan, perlengkapan, maupun barang berharga selama berada di hotel. Setiap barang yang dikirim ke hotel harus ditandai dan ditujukan kepada \"Sales Marketing\" dengan menyatakan nama acara. Penyelenggara harus mengatur asuransi dan/atau keamanan sendiri."],
    ["KERUGIAN & KERUSAKAN",
      "Penyelenggara Acara beserta seluruh kontraktor, pemasok, dan karyawannya harus menjaga dan tidak melakukan tindakan yang menyebabkan kerusakan pada ruang acara atau properti hotel, dan wajib membayar setiap kerusakan yang terjadi akibat kelalaian."],
    ["HUKUM & REGULASI",
      "Penyelenggara tidak mengizinkan kegiatan ilegal atau yang melanggar hukum. Minuman keras yang dibawa ke hotel dikenakan biaya corkage sesuai kebijakan hotel. Merokok dilarang di seluruh outlet, ruang rapat, maupun ruang publik hotel."],
    ["LISENSI",
      "Klien sepenuhnya bertanggung jawab untuk mendapatkan lisensi/izin yang diperlukan untuk menampilkan karya hak cipta (musik, audio, video, karya seni, dll) yang digunakan Grup di hotel."],
    ["KERAHASIAAN",
      "Semua rincian pada perjanjian bersifat rahasia dan tidak boleh ditunjukkan kepada pihak ketiga atau dipublikasikan tanpa persetujuan khusus dari pihak hotel."],
    ["GANTI RUGI",
      "Klien setuju untuk mengganti rugi hotel dan penyedianya dari segala kewajiban, kerugian, klaim, tuntutan, kerusakan, dan biaya (termasuk biaya legal) yang disebabkan oleh pelanggaran terhadap ketentuan dalam perjanjian ini."],
    ["KETIDAKBERDAYAAN KINERJA",
      "Perjanjian ini akan berakhir tanpa kewajiban apabila kinerja substansial salah satu pihak tertunda/terhambat oleh sebab di luar kendali yang wajar. Pengakhiran dilakukan melalui pemberitahuan tertulis dan tidak lebih dari sepuluh (10) hari setelah mempelajari dasar tersebut."],
    ["EKSEKUSI YANG TEPAT",
      "Perjanjian ini menggantikan semua perjanjian, proposal, dan komunikasi sebelumnya, dan hanya dapat diubah secara tertulis melalui persetujuan bersama. Perjanjian ini tidak berlaku sampai dieksekusi oleh individu yang berwenang dari klien dan hotel."],
    ["FLUKTUASI PAJAK",
      "Apabila di kemudian hari terjadi perubahan nilai pajak dan/atau retribusi, hotel berhak mengumpulkan pajak/retribusi tersebut dari Penyelenggara Acara atas nama kewenangan Pemerintah dengan pemberitahuan terlebih dahulu."],
    ["KELALAIAN",
      "Apabila Penyelenggara Acara gagal melakukan pembayaran atau tidak mematuhi persyaratan, maka Hotel dapat mengakhiri kontrak ini."],
    ["TANDA TANGAN",
      "Silakan tandatangani semua lembar kontrak ini apabila telah disetujui dan dikirim kembali kepada " + HOTEL.nama + ". Setelah kontrak ditandatangani maka kesepakatan yang mengikat dianggap telah dikonfirmasi dan pasti."],
  ];
}

export default function ConfirmationLetter({ lead, user, onClose }) {
  const [g, setG] = useState({
    clNo: "",
    tglSurat: hariIni(),
    sapaan: "Bapak/Ibu",
    namaTamu: lead.Nama || "",
    instansi: lead.Instansi || "",
    kota: "",
    noHP: lead.NoHP || "",
    tglKamar: lead.TanggalEvent || "",
    jumlahKamar: lead.JumlahKamar || "",
    namaAcara: lead.Instansi || lead.JenisEvent || "",
    jumlahPeserta: lead.JumlahPax || "",
    rangkaian: [{ hari: lead.TanggalEvent || "", waktu: "", acara: "", tempat: "", setup: "", jumlah: lead.JumlahPax || "" }],
    estimasi: [{ deskripsi: "Residential Twin Package", jumlah: "", harga: "1500000" }],
    dpDate: "", pelunasanDate: "", jatuhTempoDate: "",
    prepBy: user?.nama || "", prepTitle: "Asst. DOSM",
    gmNama: "", gmTitle: "General Manager",
  });

  const set = (k, v) => setG((s) => ({ ...s, [k]: v }));
  const setRow = (arr, i, k, v) => setG((s) => ({ ...s, [arr]: s[arr].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRow = (arr, kosong) => setG((s) => ({ ...s, [arr]: [...s[arr], kosong] }));
  const delRow = (arr, i) => setG((s) => ({ ...s, [arr]: s[arr].filter((_, j) => j !== i) }));
  const grandTotal = g.estimasi.reduce((t, r) => t + angka(r.jumlah) * angka(r.harga), 0);

  function build() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const rateRows = ROOM_RATES.map((r) =>
      `<tr><td>${r[0]}</td><td class="c">${rp(r[1])}</td><td class="c">${rp(r[2])}</td><td class="c">${rp(r[3])}</td></tr>`).join("");
    const inclList = INCLUSIONS.map((x) => `<li>${esc(x)}</li>`).join("");
    const rangkaianRows = g.rangkaian.map((r) =>
      `<tr><td>${esc(r.hari)}</td><td>${esc(r.waktu)}</td><td>${esc(r.acara)}</td><td>${esc(r.tempat)}</td><td>${esc(r.setup)}</td><td class="c">${esc(r.jumlah)}</td></tr>`).join("");
    const estRows = g.estimasi.map((r, i) => {
      const tot = angka(r.jumlah) * angka(r.harga);
      return `<tr><td class="c">${i + 1}</td><td>${esc(r.deskripsi)}</td><td class="r">${angka(r.jumlah).toLocaleString("id-ID")}</td><td class="r">${angka(r.harga).toLocaleString("id-ID")}</td><td class="r">${tot.toLocaleString("id-ID")}</td></tr>`;
    }).join("");
    const pasalRows = pasalList(g).map((p, i) =>
      `<div class="pasal"><div class="ptitle">${i + 3}. ${p[0]}</div><div class="pbody">${p[1]}</div></div>`).join("");

    const foot = `<div class="foot">${HOTEL.alamat}<br>${HOTEL.telp} ${HOTEL.email} · <span class="web">${HOTEL.web}</span></div>`;

    return `<div class="doc">
<style>
  .doc { font-family: Arial, Helvetica, sans-serif; font-size:11px; color:#111; line-height:1.5; }
  .doc .logo { text-align:center; margin-bottom:10px; }
  .doc .logo img { height:46px; }
  .doc b { color:#000; }
  .doc .sec { font-weight:bold; margin:12px 0 4px; }
  .doc .italb { font-weight:bold; font-style:italic; }
  .doc ul { margin:4px 0 4px 18px; padding:0; }
  .doc table { width:100%; border-collapse:collapse; margin:8px 0; }
  .doc th, .doc td { border:1px solid #94a3b8; padding:5px 7px; text-align:left; vertical-align:top; font-size:10px; }
  .doc th { background:#f1f5f9; text-align:center; }
  .doc td.c { text-align:center; } .doc td.r { text-align:right; }
  .doc .rate-title td { text-align:center; font-weight:bold; }
  .doc .total td { font-weight:bold; background:#fdf6e9; }
  .doc .pasal { margin:8px 0; }
  .doc .ptitle { font-weight:bold; }
  .doc .pb { page-break-before: always; }
  .doc .foot { text-align:center; font-size:8px; color:#666; border-top:1px solid #ddd; padding-top:5px; margin-top:16px; }
  .doc .foot .web { color:#2563eb; }
  .doc .sign td { border:0; padding:2px 6px; vertical-align:bottom; }
</style>

<div class="logo"><img src="${origin}/aston-logo.png" onerror="this.style.display='none'"/></div>
<div><b>Cirebon, ${tglID(g.tglSurat)}</b></div>
<div><b>${esc(g.clNo || "CL/____/____-" + new Date().getFullYear() + "/SM")}</b></div>
<br>
<div><b>${esc(g.namaTamu) || "-"}</b></div>
${g.instansi ? "<div><b>" + esc(g.instansi) + "</b></div>" : ""}
${g.kota ? "<div><b>" + esc(g.kota) + "</b></div>" : ""}
${g.noHP ? "<div><b>No HP : " + esc(g.noHP) + "</b></div>" : ""}
<br>
<div class="italb">Perihal: Perjanjian/${esc(g.instansi || g.namaAcara)}/${g.tglKamar ? tglID(g.tglKamar) : ""}</div>
<p>Dengan hormat,</p>
<div class="italb">Salam hangat dari ${HOTEL.nama}.</div>
<p>Terima kasih telah memilih <b>${HOTEL.nama}</b> sebagai tempat akomodasi <b>${esc(g.instansi || g.namaAcara)}</b>. Melanjutkan percakapan mengenai harga kamar dan paket meeting, bersama ini kami sampaikan konfirmasi acara tersebut:</p>

<div class="sec">1. KAMAR</div>
<div>Tanggal &nbsp;: ${g.tglKamar ? tglID(g.tglKamar) : "-"}</div>
<div>Jumlah Kamar &nbsp;: ${angka(g.jumlahKamar) || "-"} Kamar</div>
<table>
  <tr class="rate-title"><td colspan="4">${HOTEL.namaCap}</td></tr>
  <tr><th>ROOM TYPE</th><th>PUBLISHED RATE</th><th>WEEKDAYS RATE</th><th>WEEKEND RATE</th></tr>
  ${rateRows}
</table>
<div class="sec">Harga Kamar Sudah Termasuk:</div>
<ul>${inclList}</ul>
<p>Penggunaan Extra Bed dikenakan biaya Rp 400.000 per malam sudah termasuk sarapan. Penambahan sarapan di luar paket kamar dikenakan biaya Rp 180.000 per orang.</p>

<div class="sec pb">2. KEBUTUHAN ACARA</div>
<div>Nama Acara &nbsp;: <b>${esc(g.namaAcara) || "-"}</b></div>
<div>Jumlah Peserta &nbsp;: ${angka(g.jumlahPeserta) ? angka(g.jumlahPeserta) + " Orang" : "-"}</div>
<div class="sec">Rangkaian Acara:</div>
<table>
  <tr><th>Hari/Tanggal</th><th>Waktu</th><th>Acara</th><th>Tempat</th><th>Set up</th><th>Jumlah Peserta</th></tr>
  ${rangkaianRows}
</table>

<div class="sec">ESTIMASI BIAYA</div>
<table>
  <tr><th>No</th><th>Deskripsi</th><th>Jumlah</th><th>Harga</th><th>Total</th></tr>
  ${estRows}
  <tr class="total"><td colspan="4" class="r">Grand Total</td><td class="r">${grandTotal.toLocaleString("id-ID")}</td></tr>
</table>
<p><i><b>Catatan: Harga tersebut di atas sudah termasuk 21% pajak &amp; pelayanan dan hotel tidak memberikan komisi.</b></i></p>

<div class="pb"></div>
${pasalRows}

<table class="sign" style="margin-top:20px">
  <tr><td>Ditandatangani untuk <b>${HOTEL.nama}</b></td></tr>
</table>
<table class="sign">
  <tr><td width="50%">Prepared by,</td><td width="50%">Acknowledge,</td></tr>
  <tr style="height:48px"><td></td><td></td></tr>
  <tr><td><b><u>${esc(g.prepBy) || "-"}</u></b><br>${esc(g.prepTitle)}</td><td><b><u>${esc(g.gmNama) || "-"}</u></b><br>${esc(g.gmTitle)}</td></tr>
</table>
<br>
<div>Ditandatangani untuk <b>${esc(g.instansi || g.namaAcara)}</b></div>
<table class="sign" style="width:60%">
  <tr><td width="35%">Nama</td><td>: ______________________</td></tr>
  <tr><td>Jabatan</td><td>: ______________________</td></tr>
  <tr><td>Tanggal</td><td>: ______________________</td></tr>
  <tr><td>Tanda Tangan</td><td>: ______________________</td></tr>
</table>

${foot}
</div>`;
  }

  const [busy, setBusy] = useState(false);
  async function unduh() {
    setBusy(true);
    await unduhPDFdariHTML(build(), "Confirmation-" + (g.clNo || "letter").replace(/[^\w-]/g, "_") + ".pdf");
    setBusy(false);
  }

  return (
    <Modal title="Buat Confirmation Letter / Perjanjian" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="No. CL"><input className={inp} value={g.clNo} onChange={(e) => set("clNo", e.target.value)} placeholder="CL/158/VI-2026/SM" /></Field>
          <Field label="Tanggal Surat"><input type="date" className={inp} value={g.tglSurat} onChange={(e) => set("tglSurat", e.target.value)} /></Field>
        </div>
        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-semibold text-slate-500">PENERIMA</div>
          <Field label="Nama"><input className={inp} value={g.namaTamu} onChange={(e) => set("namaTamu", e.target.value)} /></Field>
          <Field label="Instansi"><input className={inp} value={g.instansi} onChange={(e) => set("instansi", e.target.value)} /></Field>
          <Field label="Kota"><input className={inp} value={g.kota} onChange={(e) => set("kota", e.target.value)} placeholder="Jakarta" /></Field>
          <Field label="No HP"><input className={inp} value={g.noHP} onChange={(e) => set("noHP", e.target.value)} /></Field>
        </div>
        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-semibold text-slate-500">KAMAR & ACARA</div>
          <Field label="Tanggal Kamar/Acara"><input type="date" className={inp} value={g.tglKamar} onChange={(e) => set("tglKamar", e.target.value)} /></Field>
          <Field label="Jumlah Kamar"><input className={inp} inputMode="numeric" value={g.jumlahKamar} onChange={(e) => set("jumlahKamar", e.target.value.replace(/[^\d]/g, ""))} /></Field>
          <Field label="Nama Acara"><input className={inp} value={g.namaAcara} onChange={(e) => set("namaAcara", e.target.value)} /></Field>
          <Field label="Jumlah Peserta"><input className={inp} inputMode="numeric" value={g.jumlahPeserta} onChange={(e) => set("jumlahPeserta", e.target.value.replace(/[^\d]/g, ""))} /></Field>
        </div>

        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-500">RANGKAIAN ACARA</span>
            <button onClick={() => addRow("rangkaian", { hari: "", waktu: "", acara: "", tempat: "", setup: "", jumlah: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Baris</button></div>
          {g.rangkaian.map((r, i) => (
            <div key={i} className="grid grid-cols-6 gap-1 mb-1">
              <input className={inp + " !py-1.5 text-xs"} placeholder="Hari/Tgl" value={r.hari} onChange={(e) => setRow("rangkaian", i, "hari", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Waktu" value={r.waktu} onChange={(e) => setRow("rangkaian", i, "waktu", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Acara" value={r.acara} onChange={(e) => setRow("rangkaian", i, "acara", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Tempat" value={r.tempat} onChange={(e) => setRow("rangkaian", i, "tempat", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs"} placeholder="Set up" value={r.setup} onChange={(e) => setRow("rangkaian", i, "setup", e.target.value)} />
              <div className="flex gap-1"><input className={inp + " !py-1.5 text-xs"} placeholder="Jml" value={r.jumlah} onChange={(e) => setRow("rangkaian", i, "jumlah", e.target.value)} />{g.rangkaian.length > 1 && <button onClick={() => delRow("rangkaian", i)} className="text-rose-600 text-xs">✕</button>}</div>
            </div>
          ))}
        </div>

        <div className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-500">ESTIMASI BIAYA</span>
            <button onClick={() => addRow("estimasi", { deskripsi: "", jumlah: "", harga: "" })} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Baris</button></div>
          {g.estimasi.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 mb-1 items-center">
              <input className={inp + " !py-1.5 text-xs col-span-5"} placeholder="Deskripsi" value={r.deskripsi} onChange={(e) => setRow("estimasi", i, "deskripsi", e.target.value)} />
              <input className={inp + " !py-1.5 text-xs col-span-2"} placeholder="Jml" inputMode="numeric" value={r.jumlah} onChange={(e) => setRow("estimasi", i, "jumlah", e.target.value.replace(/[^\d]/g, ""))} />
              <input className={inp + " !py-1.5 text-xs col-span-3"} placeholder="Harga" inputMode="numeric" value={r.harga ? angka(r.harga).toLocaleString("id-ID") : ""} onChange={(e) => setRow("estimasi", i, "harga", e.target.value.replace(/[^\d]/g, ""))} />
              <div className="col-span-2 text-right text-xs text-slate-500">{(angka(r.jumlah) * angka(r.harga)).toLocaleString("id-ID")}{g.estimasi.length > 1 && <button onClick={() => delRow("estimasi", i)} className="text-rose-600 ml-1">✕</button>}</div>
            </div>
          ))}
          <div className="text-right text-sm font-bold text-[#12263a] mt-1">Grand Total: Rp {grandTotal.toLocaleString("id-ID")}</div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-3 gap-3">
          <div className="col-span-3 text-xs font-semibold text-slate-500">TANGGAL PENTING</div>
          <Field label="DP 50% s.d."><input type="date" className={inp} value={g.dpDate} onChange={(e) => set("dpDate", e.target.value)} /></Field>
          <Field label="Pelunasan s.d."><input type="date" className={inp} value={g.pelunasanDate} onChange={(e) => set("pelunasanDate", e.target.value)} /></Field>
          <Field label="Jatuh Tempo TTD"><input type="date" className={inp} value={g.jatuhTempoDate} onChange={(e) => set("jatuhTempoDate", e.target.value)} /></Field>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 text-xs font-semibold text-slate-500">TANDA TANGAN</div>
          <Field label="Prepared by (nama)"><input className={inp} value={g.prepBy} onChange={(e) => set("prepBy", e.target.value)} /></Field>
          <Field label="Jabatan"><input className={inp} value={g.prepTitle} onChange={(e) => set("prepTitle", e.target.value)} /></Field>
          <Field label="General Manager (nama)"><input className={inp} value={g.gmNama} onChange={(e) => set("gmNama", e.target.value)} /></Field>
          <Field label="Jabatan GM"><input className={inp} value={g.gmTitle} onChange={(e) => set("gmTitle", e.target.value)} /></Field>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Tutup</button>
        <button onClick={unduh} disabled={busy} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{busy ? "Membuat PDF…" : "⬇ Download PDF"}</button>
      </div>
    </Modal>
  );
}
