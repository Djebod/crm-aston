"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import Header from "@/components/Header";
import { Modal, Field, inp } from "@/components/Modal";
import DateRange, { dalamRentang } from "@/components/DateRange";
import { statusTtd, cariKaryawan } from "@/lib/ttd";
import {
  TAHAP_GEO, STATUS_GEO, WARNA_STATUS, labelStatus, parseGeoRow, tahapBerikut,
  bolehBertindak, bolehEdit, bolehHapus, bolehKirimAlert,
} from "@/lib/geoApproval";

const HOTEL = {
  nama: "ASTON CIREBON HOTEL & CONVENTION CENTER",
  alamat: "Jl. Brigjen Dharsono Bypass No.12C, Kertawinangun, Kedawung, Kota Cirebon, Jawa Barat 45132",
};
const angka = (n) => Number(String(n).replace(/[^\d]/g, "")) || 0;
const fmt = (n) => angka(n).toLocaleString("id-ID");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
const low = (v) => String(v || "").trim().toLowerCase();

function inisial(nama) {
  return String(nama || "").trim().split(/\s+/).map((w) => w[0] || "").join("").toUpperCase().slice(0, 4);
}
function nextNomor(list, tahun) {
  let max = 0;
  (list || []).forEach((row) => {
    const parts = String(row.GeoNo || "").split("/");
    const n = parseInt(parts[0], 10);
    const y = parseInt(parts[3], 10);
    if (!isNaN(n) && y === tahun && n > max) max = n;
  });
  return max + 1;
}
// Format: Nomor/Tanggal/Bulan/Tahun/SM/ACHCC/KODE_SALES
function rebuildNo(g) {
  if (!g.nomor) return g.geoNo || "";
  const d = g.issuedDate ? new Date(g.issuedDate) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${g.nomor}/${dd}/${mm}/${yy}/SM/ACHCC/${String(g.kodeSales || "").toUpperCase()}`;
}

const DEFAULT_NOTES = {
  fo: "Group arrival by partial/group, check in time: 14.00 WIB.\nPlease prepare room as per requested.\nPlease prepare room keys before guest arrival.\nPlease be ready to assist guests luggage.",
  hk: "Please prepare the room based on room blocking.\nPlease make sure that all guest rooms are cleaned & tidy.",
  eng: "Please make sure AC & standard lighting are working properly.",
  fin: "Payment by CA - Trf",
  sec: "Please be ready to assist each individual for their luggage upon check in & check out.\nPlease drop the luggage into room.",
  sign: "None",
};

// ====== Breakdown harga kamar ======
// Komponen bisa ditambah/dihapus/diganti namanya. Nilai per tipe kamar
// disimpan di room.bd = { <id komponen>: "150000" }.
// Lodging selalu dihitung otomatis = Harga − seluruh komponen.
const idBaru = () => "k" + Math.random().toString(36).slice(2, 8);
const KOMPONEN_DEFAULT = () => [
  { id: "bfast", nama: "Breakfast" },
  { id: "dinner", nama: "Dinner" },
  { id: "others", nama: "Others" },
];

// Kolom tanda tangan selalu 5, urutannya mengikuti jenjang persetujuan (TAHAP_GEO)
const TTD_DEFAULT = () => TAHAP_GEO.map((t) => ({ nama: "", jabatan: t.jabatan }));

/**
 * Menyesuaikan data GEO lama (yang masih memakai kolom tetap bfast/dinner/others)
 * ke bentuk komponen bebas, supaya dokumen lama tetap bisa dibuka & dicetak.
 */
function normalisasiGeo(d) {
  const n = { ...d };
  if (!Array.isArray(n.komponen) || !n.komponen.length) n.komponen = KOMPONEN_DEFAULT();
  n.rooms = (n.rooms || []).map((r) => {
    if (r.bd && typeof r.bd === "object") return r;
    return { ...r, bd: { bfast: r.bfast || "", dinner: r.dinner || "", others: r.others || "" } };
  });
  n.ttd = TAHAP_GEO.map((t, i) => {
    const x = (Array.isArray(n.ttd) && n.ttd[i]) || {};
    return { ...x, nama: x.nama || "", jabatan: x.jabatan || t.jabatan };
  });
  return n;
}

const GEO_KOSONG = () => ({
  id: "", geoNo: "", nomor: "", kodeSales: "", issuedDate: new Date().toISOString().slice(0, 10),
  eventTitle: "", company: "", contactPerson: "", address: "", phone: "", email: "",
  salesPerson: "", checkIn: "", checkOut: "", noRoom: "", guarantee: "YES",
  komponen: KOMPONEN_DEFAULT(),
  rooms: [{ type: "Superior", checkIn: "", checkOut: "", totalRoom: "", day: "", price: "", bd: {} }],
  dpAmount: "", dpDate: "", remark: "",
  notes: { ...DEFAULT_NOTES },
  ttd: TTD_DEFAULT(),
});

// Jumlah malam (Room Night) dari check in – check out
function hitungMalam(ci, co) {
  if (!ci || !co) return 0;
  const a = new Date(ci), b = new Date(co);
  if (isNaN(a) || isNaN(b)) return 0;
  const d = Math.round((b - a) / 86400000);
  return d > 0 ? d : 0;
}

function muatHtml2pdf() {
  return new Promise((res, rej) => {
    if (typeof window !== "undefined" && window.html2pdf) return res();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = () => res();
    s.onerror = () => rej(new Error("gagal memuat"));
    document.body.appendChild(s);
  });
}

function grandTotal(g) {
  return (g.rooms || []).reduce((t, r) => t + angka(r.totalRoom) * hitungMalam(r.checkIn, r.checkOut) * angka(r.price), 0);
}

/**
 * Kolom tanda tangan untuk PDF. Gambar tanda tangan digital HANYA dicetak
 * untuk tahap yang sudah di-acknowledge/approve (tercatat di approvals);
 * tahap yang belum, ruangnya dibiarkan kosong.
 */
function kolomTtd(g, ctx) {
  return TAHAP_GEO.map((t, i) => {
    const def = (g.ttd || [])[i] || {};
    const a = (ctx.approvals || [])[i];
    const img = a ? (cariKaryawan(ctx.karyawan, a.nama)?.Ttd || "") : "";
    return { nama: a ? a.nama : def.nama || "", jabatan: def.jabatan || t.jabatan, img, waktu: a?.waktu || "" };
  });
}

function buildHTML(g, origin, ctx) {
  const gt = grandTotal(g);
  const balance = gt - angka(g.dpAmount);
  const roomRows = (g.rooms || []).map((r) => {
    const malam = hitungMalam(r.checkIn, r.checkOut);
    const tot = angka(r.totalRoom) * malam * angka(r.price);
    return `<tr>
      <td>${esc(r.type)}</td><td class="c">${esc(r.checkIn)}</td><td class="c">${esc(r.checkOut)}</td>
      <td class="c">${fmt(r.totalRoom)}</td><td class="c">${malam}</td><td class="r">${fmt(r.price)}</td><td class="r">${tot.toLocaleString("id-ID")}</td>
    </tr>`;
  }).join("");

  // Breakdown per tipe kamar. Kolomnya mengikuti daftar komponen (bisa ditambah sendiri).
  // Lodging selalu dihitung otomatis = Harga − seluruh komponen.
  const komp = (g.komponen || []).filter((k) => String(k.nama || "").trim());
  const kamarBd = (g.rooms || []).filter((r) => r.type && angka(r.price) > 0);
  const TDBD = "border:1px solid #111;padding:2px 4px;";
  const breakdownRows = kamarBd.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:8px;margin-top:2px;">
        <tr style="background:#eef2f8;font-weight:bold;text-align:center;">
          <td style="${TDBD}">Room Type</td>
          <td style="${TDBD}">Lodging</td>
          ${komp.map((k) => `<td style="${TDBD}">${esc(k.nama)}</td>`).join("")}
          <td style="${TDBD}">Total</td>
        </tr>
        ${kamarBd.map((r) => {
          const price = angka(r.price);
          const totalKomp = komp.reduce((t, k) => t + angka((r.bd || {})[k.id]), 0);
          const lodging = price - totalKomp;
          return `<tr>
            <td style="${TDBD}">${esc(r.type)}</td>
            <td style="${TDBD}text-align:right;">${lodging.toLocaleString("id-ID")}</td>
            ${komp.map((k) => `<td style="${TDBD}text-align:right;">${angka((r.bd || {})[k.id]).toLocaleString("id-ID")}</td>`).join("")}
            <td style="${TDBD}text-align:right;font-weight:bold;">${price.toLocaleString("id-ID")}</td>
          </tr>`;
        }).join("")}
      </table>`
    : "";

  const ttd = kolomTtd(g, ctx);

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#111;width:100%;">
  <div style="border:1.5px solid #111;">
    <div style="text-align:center;padding:8px;"><img src="${origin}/aston-logo.png" style="height:42px;display:block;margin:0 auto;" onerror="this.style.display='none'"/></div>
    <div style="text-align:center;font-weight:bold;font-size:12px;border-top:1px solid #111;border-bottom:1px solid #111;padding:4px;background:#dbe5f1;">GROUP EVENT ORDER (GEO)</div>
    <div style="text-align:center;font-weight:bold;border-bottom:1px solid #111;padding:3px;background:#eef2f8;">GEO NO : ${esc(g.geoNo)}</div>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;vertical-align:top;border-right:1px solid #111;padding:0;">
          <table style="width:100%;border-collapse:collapse;">
            ${infoRow("Issued Date", g.issuedDate)}
            ${infoRow("Event Title", g.eventTitle, true)}
            ${infoRow("Company/Organizer", g.company, true)}
            ${infoRow("Contact Person", g.contactPerson)}
            ${infoRow("Address", g.address)}
            ${infoRow("Phone", g.phone)}
            ${infoRow("Email", g.email)}
          </table>
        </td>
        <td style="width:50%;vertical-align:top;padding:0;">
          <table style="width:100%;border-collapse:collapse;">
            ${infoRow("Sales Person", g.salesPerson)}
            ${infoRow("Check In", g.checkIn)}
            ${infoRow("Check Out", g.checkOut)}
            ${infoRow("No. of Room", g.noRoom)}
            ${infoRow("Guarantee Check In", g.guarantee)}
          </table>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;border-top:1px solid #111;">
      <tr>
        <td style="width:60%;vertical-align:top;border-right:1px solid #111;padding:0;">
          <div style="text-align:center;font-weight:bold;background:#dbe5f1;border-bottom:1px solid #111;padding:2px;">ROOM ARRANGEMENT</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr style="background:#eef2f8;">
              <th style="${TH}">Room Type</th><th style="${TH}">Check In</th><th style="${TH}">Check Out</th>
              <th style="${TH}">Total Room</th><th style="${TH}">Night</th><th style="${TH}">Price</th><th style="${TH}">Total</th>
            </tr>
            ${roomRows}
            <tr><td colspan="6" style="${TDB};text-align:right;font-weight:bold;">GRAND TOTAL (Rp)</td><td style="${TDB};text-align:right;font-weight:bold;background:#fdf6e9;">${gt.toLocaleString("id-ID")}</td></tr>
            <tr><td colspan="6" style="${TDB};text-align:right;">DP ${esc(g.dpDate)} (Rp)</td><td style="${TDB};text-align:right;">${fmt(g.dpAmount)}</td></tr>
            <tr><td colspan="6" style="${TDB};text-align:right;font-weight:bold;">BALANCE (Rp)</td><td style="${TDB};text-align:right;font-weight:bold;">${balance.toLocaleString("id-ID")}</td></tr>
          </table>
          <div style="border-top:1px solid #111;padding:3px;"><b>REMARK :</b> ${esc(g.remark)}</div>
          <div style="border-top:1px solid #111;padding:3px;"><b>Breakdown :</b><br>${breakdownRows || "-"}</div>
        </td>
        <td style="width:40%;vertical-align:top;padding:0;">
          ${notaBox("FRONT OFFICE", g.notes.fo)}
          ${notaBox("HOUSEKEEPING", g.notes.hk)}
          ${notaBox("ENGINEERING", g.notes.eng)}
          ${notaBox("FINANCE", g.notes.fin)}
          ${notaBox("SECURITY & CONCIERGE", g.notes.sec)}
          ${notaBox("SIGN BOARD", g.notes.sign)}
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;border-top:1px solid #111;text-align:center;">
      <tr style="background:#eef2f8;font-weight:bold;">
        <td style="${TDB}">Prepared by,</td><td style="${TDB}" colspan="3">Acknowledged by,</td><td style="${TDB}">Approved by,</td>
      </tr>
      <tr style="height:46px;">${ttd.map((t) => `<td style="${TDB}">${t.img ? `<img src="${t.img}" style="max-height:42px;max-width:110px;display:block;margin:0 auto" />` : ""}</td>`).join("")}</tr>
      <tr style="font-weight:bold;">
        ${ttd.map((t) => `<td style="${TDB}">${esc(t.nama) || "&nbsp;"}<div style="font-weight:normal">${esc(t.jabatan)}</div>${t.waktu ? `<div style="font-weight:normal;font-size:6.5px;color:#555">Digitally signed · ${esc(t.waktu)}</div>` : ""}</td>`).join("")}
      </tr>
    </table>
    <div style="font-style:italic;font-weight:bold;font-size:8px;padding:3px;border-top:1px solid #111;">Distribution: GM, EAM, DOSM, FC, Chief Engineer, EHK, RBM, Chief Sec, HRM, AFOM, Reservation, Sales Admin, Ext. Chef, Outlet Rest.</div>
  </div>
  <div style="text-align:center;font-size:8px;color:#666;margin-top:4px;">${HOTEL.alamat}</div>
</div>`;
}

/**
 * Halaman terakhir PDF: audit trail dokumen — jenjang persetujuan
 * (siapa, kapan, catatan) dan seluruh riwayat aktivitas GEO ini.
 */
function buildAuditHTML(g, origin, ctx) {
  const T = "border:1px solid #111;padding:3px 4px;font-size:8px;vertical-align:top;";
  const TH2 = T + "background:#dbe5f1;font-weight:bold;text-align:center;";
  const next = tahapBerikut(ctx.info);
  const approvals = ctx.approvals || [];
  const audit = ctx.audit || [];

  const barisTahap = TAHAP_GEO.map((t, i) => {
    const a = approvals[i];
    const def = (g.ttd || [])[i] || {};
    const ket = a ? `<span style="color:#047857;font-weight:bold">&#10003; ${t.hasil}</span>`
      : i === next ? `<span style="color:#b45309;font-weight:bold">Menunggu</span>` : `<span style="color:#888">Belum</span>`;
    return `<tr>
      <td style="${T}text-align:center;">${i + 1}</td>
      <td style="${T}"><b>${esc(def.jabatan || t.jabatan)}</b><br><span style="color:#666">${t.kolom}</span></td>
      <td style="${T}">${a ? esc(a.nama) : def.nama ? esc(def.nama) + ` <span style="color:#888">(belum tanda tangan)</span>` : "-"}</td>
      <td style="${T}text-align:center;">${ket}</td>
      <td style="${T}text-align:center;white-space:nowrap;">${a ? esc(a.waktu) : ""}</td>
      <td style="${T}">${a ? esc(a.catatan) : ""}</td>
    </tr>`;
  }).join("");

  const barisAudit = audit.length
    ? audit.map((e, i) => `<tr>
        <td style="${T}text-align:center;">${i + 1}</td>
        <td style="${T}white-space:nowrap;">${esc(e.waktu)}</td>
        <td style="${T}"><b>${esc(e.aksi)}</b></td>
        <td style="${T}">${esc(e.oleh)}${e.role ? `<br><span style="color:#666">${esc(e.role)}</span>` : ""}</td>
        <td style="${T}">${esc(e.ket) || "-"}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="${T}text-align:center;color:#888;">Belum ada riwayat — dokumen belum disimpan (pratinjau).</td></tr>`;

  const warnaStatus = ctx.status === "disetujui" ? "#047857" : ctx.status === "ditolak" ? "#b91c1c" : "#b45309";

  return `<div style="page-break-before:always;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#111;width:100%;">
  <div style="border:1.5px solid #111;">
    <div style="text-align:center;padding:8px;"><img src="${origin}/aston-logo.png" style="height:36px;display:block;margin:0 auto;" onerror="this.style.display='none'"/></div>
    <div style="text-align:center;font-weight:bold;font-size:12px;border-top:1px solid #111;border-bottom:1px solid #111;padding:4px;background:#dbe5f1;">AUDIT TRAIL — GROUP EVENT ORDER</div>
    <table style="width:100%;border-collapse:collapse;">
      ${infoRow("GEO No", g.geoNo, true)}
      ${infoRow("Event Title", g.eventTitle)}
      ${infoRow("Company/Organizer", g.company)}
      ${infoRow("Sales Person", g.salesPerson)}
      <tr><td style="border:1px solid #111;padding:3px;font-weight:bold;width:42%;background:#f8fafc;">Status Dokumen</td><td style="border:1px solid #111;padding:3px;font-weight:bold;color:${warnaStatus}">${esc(labelStatus(ctx.status))}</td></tr>
    </table>

    <div style="text-align:center;font-weight:bold;background:#eef2f8;border-top:1px solid #111;border-bottom:1px solid #111;padding:3px;">JENJANG PERSETUJUAN</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="${TH2}width:4%">No</td><td style="${TH2}width:22%">Tahap / Jabatan</td><td style="${TH2}width:22%">Nama</td>
        <td style="${TH2}width:14%">Status</td><td style="${TH2}width:16%">Waktu</td><td style="${TH2}">Catatan</td>
      </tr>
      ${barisTahap}
    </table>

    <div style="text-align:center;font-weight:bold;background:#eef2f8;border-top:1px solid #111;border-bottom:1px solid #111;padding:3px;">RIWAYAT AKTIVITAS DOKUMEN</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="${TH2}width:4%">No</td><td style="${TH2}width:16%">Waktu</td><td style="${TH2}width:26%">Aktivitas</td>
        <td style="${TH2}width:20%">Oleh</td><td style="${TH2}">Keterangan</td>
      </tr>
      ${barisAudit}
    </table>

    <div style="font-size:7.5px;color:#444;padding:4px;border-top:1px solid #111;">
      Tanda tangan digital pada dokumen ini sah hanya untuk tahap yang tercatat pada jenjang persetujuan di atas.
      Setiap perubahan isi GEO setelah diajukan akan membatalkan seluruh persetujuan dan tercatat pada riwayat.
      Halaman ini dibuat otomatis oleh sistem CRM${ctx.dicetakOleh ? ` — diunduh oleh ${esc(ctx.dicetakOleh)}` : ""} pada ${esc(ctx.waktuCetak)}.
    </div>
  </div>
  <div style="text-align:center;font-size:8px;color:#666;margin-top:4px;">${HOTEL.nama} · ${HOTEL.alamat}</div>
</div>`;
}

const TH = "border:1px solid #111;padding:3px;text-align:center;font-size:8px;";
const TDB = "border:1px solid #111;padding:3px;";
function infoRow(label, val, bold) {
  return `<tr><td style="border:1px solid #111;padding:3px;font-weight:bold;width:42%;background:#f8fafc;">${label}</td><td style="border:1px solid #111;padding:3px;${bold ? "font-weight:bold;" : ""}">${esc(val)}</td></tr>`;
}
function notaBox(title, val) {
  return `<div style="border-bottom:1px solid #111;"><div style="text-align:center;font-weight:bold;background:#dbe5f1;padding:2px;font-size:8px;">${title}</div><div style="padding:3px;font-size:8px;min-height:20px;">${esc(val)}</div></div>`;
}

function waktuSekarang() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value || "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")} WIB`;
}

function BadgeStatus({ status }) {
  return <span className={"inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 " + (WARNA_STATUS[status] || WARNA_STATUS.draft)}>{labelStatus(status)}</span>;
}

function Stepper({ info }) {
  const next = tahapBerikut(info);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {TAHAP_GEO.map((t, i) => {
        const done = i < info.approvals.length;
        const cls = done ? "bg-emerald-100 text-emerald-700" : i === next ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300" : "bg-slate-100 text-slate-400";
        return <span key={t.key} title={t.jabatan + (done ? " — " + info.approvals[i].nama + " · " + info.approvals[i].waktu : "")} className={"text-[10px] font-semibold rounded-full px-1.5 py-0.5 " + cls}>{done ? "✓ " : ""}{t.pendek}</span>;
      })}
    </div>
  );
}

export default function GeoPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProfil, setModalProfil] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const [modalApvId, setModalApvId] = useState(null); // ID GEO yang dibuka di modal persetujuan
  const [apvCatatan, setApvCatatan] = useState("");
  const [apvBusy, setApvBusy] = useState(false);
  const [alertBusy, setAlertBusy] = useState(false);
  const bukaDariLink = useRef(false); // ?id=GEOxxx dari tautan di email alert -> buka modal persetujuan
  const [g, setG] = useState(GEO_KOSONG());
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState("");
  const [karyawan, setKaryawan] = useState([]);
  const [cari, setCari] = useState("");
  const [fSales, setFSales] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  // diam = true -> muat ulang tanpa menampilkan "Memuat data…" (dipakai setelah aksi kecil)
  const ambil = useCallback(async (diam) => {
    if (!diam) setLoading(true);
    try {
      const r = await fetch("/api/geo", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setList(r.data || []);
    } catch (e) {} finally { if (!diam) setLoading(false); }
    try {
      const k = await fetch("/api/karyawan", { cache: "no-store" }).then((x) => x.json());
      if (k.status === "ok") setKaryawan(k.data || []);
    } catch (e) {}
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  // Tautan dari email alert: /geo?id=GEOxxx -> langsung buka modal persetujuan GEO tersebut
  useEffect(() => {
    if (loading || bukaDariLink.current || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    bukaDariLink.current = true;
    if (list.some((r) => r.ID === id)) { setApvCatatan(""); setModalApvId(id); }
    try { window.history.replaceState(null, "", window.location.pathname); } catch (e) {}
  }, [loading, list]);

  // Nama penandatangan yang diharapkan per tahap diisi otomatis dari
  // anggota tim yang punya role tersebut (leader, fom, fc, gm). Tetap bisa diganti.
  const isiPenandatangan = useCallback((ttd) => ttd.map((t, i) => {
    if (i === 0 || t.nama) return t;
    const roleTahap = TAHAP_GEO[i].roles[0];
    const orang = karyawan.find((x) => low(x.Role) === roleTahap);
    return orang ? { ...t, nama: orang.Nama } : t;
  }), [karyawan]);

  // Prefill dari Leads (klik "📋 GEO" di kartu lead)
  useEffect(() => {
    if (!user || loading) return;
    let raw = null;
    try { raw = localStorage.getItem("crm_prefill_geo"); } catch (e) {}
    if (!raw) return;
    try { localStorage.removeItem("crm_prefill_geo"); } catch (e) {}
    try {
      const p = JSON.parse(raw);
      const k = GEO_KOSONG();
      k.salesPerson = p.salesPerson || user?.nama || "";
      k.ttd[0].nama = p.salesPerson || user?.nama || "";
      k.ttd = isiPenandatangan(k.ttd);
      const merged = normalisasiGeo({ ...k, ...p, notes: { ...DEFAULT_NOTES }, ttd: k.ttd, komponen: k.komponen });
      merged.nomor = String(nextNomor(list, new Date().getFullYear()));
      merged.kodeSales = user?.kode || inisial(p.salesPerson || user?.nama);
      merged.geoNo = rebuildNo(merged);
      setG(merged);
      setModalForm(true);
    } catch (e) {}
  }, [user, loading, list, isiPenandatangan]);

  // Gambar tanda tangan di form diturunkan dari nama + daftar karyawan
  // (hanya untuk keterangan "sudah/belum unggah TTD"; di PDF gambar
  // dicetak berdasarkan tahap yang sudah disetujui).
  useEffect(() => {
    if (!karyawan.length) return;
    setG((s) => {
      if (!s.ttd || !s.ttd.length) return s;
      let berubah = false;
      const ttd = s.ttd.map((t) => {
        const img = karyawan.find((x) => x.Nama === t.nama)?.Ttd || "";
        if ((t.img || "") === img) return t;
        berubah = true;
        return { ...t, img };
      });
      return berubah ? { ...s, ttd } : s;
    });
  }, [karyawan, g.ttd]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  function bukaBaru() {
    const k = GEO_KOSONG();
    k.salesPerson = user?.nama || "";
    k.ttd[0].nama = user?.nama || "";
    k.ttd = isiPenandatangan(k.ttd);
    k.nomor = String(nextNomor(list, new Date().getFullYear()));
    k.kodeSales = user?.kode || inisial(user?.nama);
    k.geoNo = rebuildNo(k);
    setG(k);
    setModalForm(true);
  }
  function bukaEdit(row) {
    const info = parseGeoRow(row);
    if (info.approvals.length > 0 && !confirm("GEO ini sudah masuk alur persetujuan. Bila Anda menyimpan perubahan, seluruh persetujuan yang ada akan direset dan GEO harus diajukan ulang dari awal. Lanjutkan?")) return;
    setG(normalisasiGeo({ ...GEO_KOSONG(), ...info.data, id: row.ID, notes: { ...DEFAULT_NOTES, ...(info.data.notes || {}) } }));
    setModalForm(true);
  }

  const set = (k, v) => setG((s) => ({ ...s, [k]: v }));
  const setAuto = (k, v) => setG((s) => {
    const n = { ...s, [k]: v };
    if (k === "issuedDate") {
      const oldY = s.issuedDate ? new Date(s.issuedDate).getFullYear() : null;
      const newY = v ? new Date(v).getFullYear() : new Date().getFullYear();
      if (oldY !== newY) n.nomor = String(nextNomor(list, newY));
    }
    return { ...n, geoNo: rebuildNo(n) };
  });
  const setNote = (k, v) => setG((s) => ({ ...s, notes: { ...s.notes, [k]: v } }));
  const setTtd = (i, k, v) => setG((s) => ({ ...s, ttd: (s.ttd || []).map((t, j) => (j === i ? { ...t, [k]: v } : t)) }));
  // Pilih nama -> gambar tanda tangan ikut terpasang (jabatan tetap bisa diedit manual)
  const pilihTtdNama = (i, nama) => setG((s) => {
    const k = karyawan.find((x) => x.Nama === nama);
    return {
      ...s,
      ttd: (s.ttd || []).map((t, j) => (j === i ? { ...t, nama, img: nama ? (k?.Ttd || "") : "" } : t)),
    };
  });
  const setRoom = (i, k, v) => setG((s) => ({ ...s, rooms: s.rooms.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRoom = () => setG((s) => ({ ...s, rooms: [...s.rooms, { type: "", checkIn: "", checkOut: "", totalRoom: "", day: "", price: "", bd: {} }] }));
  // Nilai satu komponen breakdown untuk satu tipe kamar
  const setBd = (i, kid, v) => setG((s) => ({
    ...s,
    rooms: s.rooms.map((r, j) => (j === i ? { ...r, bd: { ...(r.bd || {}), [kid]: v } } : r)),
  }));
  const addKomponen = () => setG((s) => ({ ...s, komponen: [...(s.komponen || []), { id: idBaru(), nama: "" }] }));
  const setKomponen = (i, nama) => setG((s) => ({ ...s, komponen: (s.komponen || []).map((k, j) => (j === i ? { ...k, nama } : k)) }));
  const delKomponen = (i) => setG((s) => {
    const k = (s.komponen || [])[i];
    if (!k) return s;
    return {
      ...s,
      komponen: s.komponen.filter((_, j) => j !== i),
      rooms: s.rooms.map((r) => { const bd = { ...(r.bd || {}) }; delete bd[k.id]; return { ...r, bd }; }),
    };
  });
  const delRoom = (i) => setG((s) => ({ ...s, rooms: s.rooms.filter((_, j) => j !== i) }));

  // Gambar tanda tangan TIDAK ikut disimpan ke database (ukurannya besar).
  // Saat GEO dibuka lagi, gambarnya diambil ulang dari data karyawan berdasarkan nama.
  const untukDisimpan = (x) => ({ ...x, ttd: (x.ttd || []).map(({ img, ...t }) => t) });

  // Pemanggil API GEO: identitas (email) selalu dikirim, role diverifikasi server.
  async function apiGeo(body) {
    const res = await fetch("/api/geo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, email: user?.email || "", oleh: user?.nama || user?.email || "" }),
    });
    return res.json();
  }

  // ajukan = true -> setelah disimpan langsung diajukan ke Sales Leader (tanda tangan sales tercatat)
  async function simpan(ajukan) {
    if (!g.geoNo.trim()) { alert("GEO No wajib diisi."); return; }
    setSaving(true);
    try {
      const d = await apiGeo({
        action: g.id ? "updateGeo" : "addGeo", id: g.id, geoNo: g.geoNo, eventTitle: g.eventTitle, company: g.company,
        data: JSON.stringify(untukDisimpan(g)), ajukan: !!ajukan,
      });
      if (d.status === "ok") {
        setModalForm(false);
        if (d.peringatan) alert("GEO tersimpan sebagai draft, tetapi belum bisa diajukan: " + d.peringatan);
        await ambil();
      } else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setSaving(false); }
  }

  async function hapus(row) {
    if (!confirm("Hapus GEO " + (row.GeoNo || "") + "?")) return;
    try {
      const d = await apiGeo({ action: "hapusGeo", id: row.ID });
      if (d.status === "ok") await ambil(); else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); }
  }

  // Ajukan / Acknowledge / Approve (mode "setuju") atau kembalikan ke sales (mode "tolak")
  async function tindak(row, mode) {
    const info = parseGeoRow(row);
    const i = tahapBerikut(info);
    if (i < 0) return;
    const t = TAHAP_GEO[i];
    const catatan = apvCatatan.trim();
    if (mode === "tolak" && !catatan) { alert("Tulis alasan pengembalian di kolom catatan."); return; }
    const tanya = mode === "tolak"
      ? `Kembalikan GEO ${row.GeoNo || ""} ke sales? Seluruh persetujuan yang ada akan dibatalkan.`
      : `${t.aksi} GEO ${row.GeoNo || ""} sebagai ${t.jabatan}? Tanda tangan digital Anda akan tercetak pada dokumen.`;
    if (!confirm(tanya)) return;
    setApvBusy(true);
    try {
      const d = await apiGeo(mode === "tolak" ? { action: "tolakGeo", id: row.ID, alasan: catatan } : { action: "setujuiGeo", id: row.ID, catatan });
      if (d.status === "ok") { setApvCatatan(""); await ambil(true); } else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setApvBusy(false); }
  }

  // Kirim ulang email alert sesuai status GEO sekarang (ke penyetuju berikutnya / sales / semua)
  async function kirimUlangAlert(row) {
    if (!confirm("Kirim ulang email alert untuk GEO " + (row.GeoNo || "") + "?")) return;
    setAlertBusy(true);
    try {
      const d = await apiGeo({ action: "kirimAlertGeo", id: row.ID });
      if (d.status === "ok") {
        const a = d.alert || {};
        alert("Alert terkirim.\nKe: " + (a.ke || []).join(", ") + (a.cc?.length ? "\nCC: " + a.cc.join(", ") : ""));
        await ambil(true);
      } else alert("Gagal mengirim alert: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setAlertBusy(false); }
  }

  /**
   * Unduh PDF: halaman GEO + halaman terakhir audit trail.
   * ctx berisi approvals/audit dari database (untuk GEO tersimpan) —
   * tanda tangan digital hanya dicetak untuk tahap yang sudah disetujui.
   */
  async function unduhPDF(data, key, ctx) {
    const origin = window.location.origin;
    const c = { approvals: [], audit: [], status: "draft", info: { status: "draft", approvals: [] }, karyawan, dicetakOleh: user?.nama || "", waktuCetak: waktuSekarang(), ...(ctx || {}) };
    const html = buildHTML(data, origin, c) + buildAuditHTML(data, origin, c);
    setPdfBusy(key || "form");
    try {
      await muatHtml2pdf();
      const cont = document.createElement("div");
      cont.style.width = "200mm";
      cont.style.background = "#fff";
      cont.style.padding = "0";
      cont.innerHTML = html;
      document.body.appendChild(cont);
      const prevScroll = window.scrollY;
      window.scrollTo(0, 0);
      // Tunggu logo & gambar tanda tangan selesai dimuat supaya tidak kosong di PDF
      await Promise.all(Array.from(cont.querySelectorAll("img")).map((im) => im.complete ? Promise.resolve() : new Promise((r) => {
        im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); setTimeout(r, 5000);
      })));
      await window.html2pdf().set({
        margin: 5, filename: "GEO-" + (data.geoNo || "dokumen").replace(/[^\w-]/g, "_") + ".pdf",
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(cont).save();
      document.body.removeChild(cont);
      window.scrollTo(0, prevScroll);
      // Catat pengunduhan di audit trail (hanya untuk GEO yang sudah tersimpan)
      if (ctx?.id) { try { await apiGeo({ action: "logUnduhGeo", id: ctx.id }); await ambil(true); } catch (e) {} }
    } catch (e) {
      const w = window.open("", "_blank");
      if (w) { w.document.open(); w.document.write("<html><head><title>GEO</title></head><body>" + html + "<scr" + "ipt>window.onload=function(){window.print()}</scr" + "ipt></body></html>"); w.document.close(); }
      else alert("Gagal membuat PDF. Izinkan popup atau cek koneksi internet.");
    } finally { setPdfBusy(""); }
  }

  function unduhPDFRow(row) {
    const info = parseGeoRow(row);
    const data = normalisasiGeo({ ...GEO_KOSONG(), ...info.data, notes: { ...DEFAULT_NOTES, ...(info.data.notes || {}) } });
    unduhPDF(data, row.ID, { id: row.ID, approvals: info.approvals, audit: info.audit, status: info.status, info });
  }

  const gt = useMemo(() => grandTotal(g), [g]);

  // Info ringkas tiap baris (sales, tanggal, status) diambil dari JSON Data
  const infoRow = useCallback((row) => {
    const info = parseGeoRow(row);
    const sales = String(info.data.salesPerson || row.CreatedBy || "").trim();
    const tgl = String(info.data.issuedDate || row.CreatedAt || "").slice(0, 10);
    return { sales, tgl, info };
  }, []);

  const salesOptions = useMemo(() => {
    const s = new Set();
    list.forEach((row) => { const n = infoRow(row).sales; if (n) s.add(n); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [list, infoRow]);

  const listTampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return list.filter((row) => {
      const i = infoRow(row);
      if (fSales && i.sales !== fSales) return false;
      if (fStatus === "giliran_saya" ? !bolehBertindak(user, i.info) : fStatus && i.info.status !== fStatus) return false;
      if ((dari || sampai) && !dalamRentang(i.tgl, dari, sampai)) return false;
      if (q) {
        const teks = [row.GeoNo, row.EventTitle, row.Company, i.sales].join(" ").toLowerCase();
        if (!teks.includes(q)) return false;
      }
      return true;
    });
  }, [list, cari, fSales, fStatus, dari, sampai, infoRow, user]);
  const adaFilter = !!(cari || fSales || fStatus || dari || sampai);
  const jumlahGiliran = useMemo(() => list.filter((row) => bolehBertindak(user, parseGeoRow(row))).length, [list, user]);

  const rowApv = modalApvId ? list.find((r) => r.ID === modalApvId) : null;

  if (!user) return null;

  return (
    <div className="min-h-screen md:pl-60">
      <Header active="geo" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Group Event Order (GEO)</h1>
            <p className="text-sm text-slate-500">Buat GEO, ajukan persetujuan berjenjang, lalu unduh PDF bertanda tangan digital.</p>
          </div>
          <button onClick={bukaBaru} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap">+ Buat GEO</button>
        </div>

        {jumlahGiliran > 0 && (
          <button onClick={() => setFStatus("giliran_saya")} className="w-full text-left mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
            ⏳ <b>{jumlahGiliran} GEO</b> menunggu tindakan Anda. Klik untuk menampilkan.
          </button>
        )}

        {/* Filter: cari, sales, status, periode */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-4">
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari no. GEO, event, company, sales…"
            className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]"
          />
          <select value={fSales} onChange={(e) => setFSales(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Semua Sales</option>
            {salesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Semua Status</option>
            <option value="giliran_saya">Menunggu tindakan saya</option>
            {Object.keys(STATUS_GEO).map((k) => <option key={k} value={k}>{STATUS_GEO[k]}</option>)}
          </select>
          <DateRange dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
          {adaFilter && (
            <button onClick={() => { setCari(""); setFSales(""); setFStatus(""); setDari(""); setSampai(""); }} className="text-sm text-slate-500 hover:text-slate-800 px-2 whitespace-nowrap">Reset filter</button>
          )}
        </div>
        {!loading && list.length > 0 && (
          <div className="text-xs text-slate-500 mb-3">Menampilkan {listTampil.length} dari {list.length} GEO{dari || sampai ? " · periode berdasarkan Issued Date" : ""}</div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : list.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">Belum ada GEO. Klik <b>“+ Buat GEO”</b>.</div>
        ) : listTampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">Tidak ada GEO yang cocok dengan filter.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {listTampil.map((row) => {
              const i = infoRow(row);
              const info = i.info;
              const next = tahapBerikut(info);
              const giliran = bolehBertindak(user, info);
              return (
                <div key={row.ID} className={"bg-white rounded-xl border p-4 " + (giliran ? "border-amber-300 shadow-sm" : "border-slate-200")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-[#12263a] break-all">{row.GeoNo || "(tanpa nomor)"}</div>
                    <BadgeStatus status={info.status} />
                  </div>
                  <div className="text-sm text-slate-600">{row.EventTitle || "-"}</div>
                  <div className="text-xs text-slate-400">{row.Company || ""} · dibuat {row.CreatedAt}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {i.sales && <span className="inline-block bg-slate-100 rounded px-1.5 py-0.5 mr-1">👤 {i.sales}</span>}
                    {i.tgl && <span className="inline-block bg-slate-100 rounded px-1.5 py-0.5">📅 {i.tgl}</span>}
                  </div>
                  <div className="mt-2"><Stepper info={info} /></div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {giliran && (
                      <button onClick={() => { setApvCatatan(""); setModalApvId(row.ID); }} className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-3 py-1.5">
                        {next === 0 ? "📤 Ajukan" : "✔ " + TAHAP_GEO[next].aksi}
                      </button>
                    )}
                    <button onClick={() => unduhPDFRow(row)} disabled={pdfBusy === row.ID} className="text-xs font-semibold bg-[#c8962c] text-white rounded-md px-3 py-1.5 disabled:opacity-60">{pdfBusy === row.ID ? "Membuat…" : "⬇ PDF"}</button>
                    <button onClick={() => { setApvCatatan(""); setModalApvId(row.ID); }} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Riwayat</button>
                    {bolehEdit(user, info) && <button onClick={() => bukaEdit(row)} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Edit</button>}
                    {bolehHapus(user, info) && <button onClick={() => hapus(row)} className="text-xs font-semibold border border-rose-300 text-rose-700 rounded-md px-3 py-1.5 hover:bg-rose-50">Hapus</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal persetujuan & riwayat */}
      {rowApv && (() => {
        const info = parseGeoRow(rowApv);
        const next = tahapBerikut(info);
        const giliran = bolehBertindak(user, info);
        return (
          <Modal title={"Persetujuan GEO " + (rowApv.GeoNo || "")} onClose={() => setModalApvId(null)}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <BadgeStatus status={info.status} />
                <span className="text-slate-600">{rowApv.EventTitle || "-"} · {rowApv.Company || "-"}</span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">JENJANG PERSETUJUAN</div>
                {TAHAP_GEO.map((t, i) => {
                  const a = info.approvals[i];
                  const def = (info.data.ttd || [])[i] || {};
                  return (
                    <div key={t.key} className="flex items-start gap-3 px-3 py-2 border-t border-slate-100 text-sm">
                      <span className={"mt-0.5 w-5 h-5 rounded-full text-[11px] flex items-center justify-center shrink-0 font-bold " + (a ? "bg-emerald-500 text-white" : i === next ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500")}>{a ? "✓" : i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-800">{def.jabatan || t.jabatan} <span className="text-slate-400 font-normal">· {t.kolom}</span></div>
                        {a ? (
                          <div className="text-xs text-slate-600">{t.hasil} oleh <b>{a.nama}</b> · {a.waktu}{a.catatan ? <span className="block italic text-slate-500">“{a.catatan}”</span> : null}</div>
                        ) : (
                          <div className="text-xs text-slate-400">{i === next ? "Menunggu" : "Belum"}{def.nama ? " · " + def.nama : ""}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {giliran ? (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <div className="text-sm font-semibold text-amber-800">Giliran Anda: {TAHAP_GEO[next].jabatan}</div>
                  <p className="text-xs text-amber-700">
                    {next === 0
                      ? "Dengan mengajukan, tanda tangan digital Anda tercetak di kolom Prepared by dan GEO diteruskan ke Sales Leader."
                      : "Dengan " + TAHAP_GEO[next].aksi.toLowerCase() + ", tanda tangan digital Anda tercetak pada dokumen dan GEO diteruskan ke tahap berikutnya."}
                    {" "}Semua tindakan tercatat di audit trail.
                  </p>
                  <textarea className={inp + " h-16 resize-none text-sm"} placeholder={next === 0 ? "Catatan (opsional)" : "Catatan (opsional; wajib diisi bila dikembalikan)"} value={apvCatatan} onChange={(e) => setApvCatatan(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={() => tindak(rowApv, "setuju")} disabled={apvBusy} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-2 text-sm disabled:opacity-60">{apvBusy ? "Memproses…" : (next === 0 ? "📤 Ajukan ke Sales Leader" : "✔ " + TAHAP_GEO[next].aksi)}</button>
                    {next > 0 && <button onClick={() => tindak(rowApv, "tolak")} disabled={apvBusy} className="border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold rounded-lg py-2 px-4 text-sm disabled:opacity-60">Kembalikan</button>}
                  </div>
                </div>
              ) : next >= 0 ? (
                <p className="text-sm text-slate-500">Menunggu tindakan <b>{TAHAP_GEO[next].jabatan}</b>{next === 0 ? " (sales pembuat GEO)" : ""}.</p>
              ) : (
                <p className="text-sm text-emerald-700 font-medium">✓ GEO sudah disetujui penuh. Semua tanda tangan digital tercetak pada PDF.</p>
              )}

              {info.status !== "draft" && (() => {
                let al = null;
                try { al = rowApv.AlertTerakhir ? JSON.parse(rowApv.AlertTerakhir) : null; } catch (e) {}
                return (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">NOTIFIKASI EMAIL</div>
                    <div className="px-3 py-2 text-xs text-slate-600 space-y-1">
                      {al ? (
                        <>
                          <div>
                            <span className={"inline-block rounded px-1.5 py-0.5 font-semibold mr-1 " + (al.hasil === "terkirim" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{al.hasil === "terkirim" ? "Terkirim" : "Gagal"}</span>
                            {al.waktu}{al.ulang ? " (kirim ulang" + (al.oleh ? " oleh " + al.oleh : "") + ")" : ""}
                          </div>
                          {al.ke?.length ? <div>Ke: {al.ke.join(", ")}</div> : null}
                          {al.cc?.length ? <div>CC: {al.cc.join(", ")}</div> : null}
                          {al.pesan && al.hasil !== "terkirim" ? <div className="text-rose-700 italic">{al.pesan}</div> : null}
                        </>
                      ) : (
                        <div className="text-slate-400">Belum ada alert email yang tercatat untuk GEO ini.</div>
                      )}
                      {bolehKirimAlert(user, info) && (
                        <button onClick={() => kirimUlangAlert(rowApv)} disabled={alertBusy} className="mt-1 text-xs font-semibold border border-sky-300 text-sky-700 hover:bg-sky-50 rounded-md px-3 py-1.5 disabled:opacity-60">
                          {alertBusy ? "Mengirim…" : "🔔 Kirim ulang alert email"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">RIWAYAT AKTIVITAS (AUDIT TRAIL)</div>
                {info.audit.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-400">Belum ada riwayat.</div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    {[...info.audit].reverse().map((e, i) => (
                      <div key={i} className="px-3 py-2 border-t border-slate-100 text-xs">
                        <div className="flex justify-between gap-2"><span className="font-semibold text-slate-800">{e.aksi}</span><span className="text-slate-400 whitespace-nowrap">{e.waktu}</span></div>
                        <div className="text-slate-600">{e.oleh}{e.role ? <span className="text-slate-400"> · {e.role}</span> : null}</div>
                        {e.ket && <div className="text-slate-500 italic">{e.ket}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => unduhPDFRow(rowApv)} disabled={pdfBusy === rowApv.ID} className="w-full border border-[#c8962c] text-[#a9781f] font-semibold rounded-lg py-2.5 text-sm disabled:opacity-60">{pdfBusy === rowApv.ID ? "Membuat…" : "⬇ Unduh PDF (dengan halaman audit trail)"}</button>
            </div>
          </Modal>
        );
      })()}

      {modalForm && (
        <Modal title={g.id ? "Edit GEO" : "Buat GEO"} onClose={() => setModalForm(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nomor"><input className={inp} inputMode="numeric" value={g.nomor} onChange={(e) => setAuto("nomor", e.target.value.replace(/[^\d]/g, ""))} /></Field>
              <Field label="Issued Date"><input type="date" className={inp} value={g.issuedDate} onChange={(e) => setAuto("issuedDate", e.target.value)} /></Field>
              <Field label="Kode Sales"><input className={inp} value={g.kodeSales} onChange={(e) => setAuto("kodeSales", e.target.value.toUpperCase())} placeholder="AS" /></Field>
              <Field label="GEO No (otomatis)"><input className={inp + " bg-slate-100 font-semibold"} value={g.geoNo} readOnly title="Nomor/Tanggal/Bulan/Tahun/SM/ACHCC/Kode Sales" /></Field>
              <Field label="Event Title"><input className={inp} value={g.eventTitle} onChange={(e) => set("eventTitle", e.target.value)} /></Field>
              <Field label="Company/Organizer"><input className={inp} value={g.company} onChange={(e) => set("company", e.target.value)} /></Field>
              <Field label="Contact Person"><input className={inp} value={g.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></Field>
              <Field label="Address"><input className={inp} value={g.address} onChange={(e) => set("address", e.target.value)} /></Field>
              <Field label="Phone"><input className={inp} value={g.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Email"><input className={inp} value={g.email} onChange={(e) => set("email", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sales Person"><input className={inp} value={g.salesPerson} onChange={(e) => set("salesPerson", e.target.value)} /></Field>
              <Field label="No. of Room"><input className={inp} value={g.noRoom} onChange={(e) => set("noRoom", e.target.value)} /></Field>
              <Field label="Check In"><input type="date" className={inp} value={g.checkIn} onChange={(e) => set("checkIn", e.target.value)} /></Field>
              <Field label="Check Out"><input type="date" className={inp} value={g.checkOut} onChange={(e) => set("checkOut", e.target.value)} /></Field>
              <Field label="Guarantee Check In"><select className={inp} value={g.guarantee} onChange={(e) => set("guarantee", e.target.value)}><option>YES</option><option>NO</option></select></Field>
            </div>

            {/* Room arrangement */}
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">ROOM ARRANGEMENT</span>
                <button onClick={addRoom} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Baris</button>
              </div>
              <div className="space-y-2">
                {g.rooms.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 items-center">
                    <input className={inp + " !py-1.5 text-xs col-span-3"} placeholder="Room Type" value={r.type} onChange={(e) => setRoom(i, "type", e.target.value)} />
                    <input type="date" className={inp + " !py-1.5 text-xs col-span-2"} value={r.checkIn} onChange={(e) => setRoom(i, "checkIn", e.target.value)} />
                    <input type="date" className={inp + " !py-1.5 text-xs col-span-2"} value={r.checkOut} onChange={(e) => setRoom(i, "checkOut", e.target.value)} />
                    <input className={inp + " !py-1.5 text-xs col-span-1"} placeholder="Rm" inputMode="numeric" value={r.totalRoom} onChange={(e) => setRoom(i, "totalRoom", e.target.value.replace(/[^\d]/g, ""))} />
                    <input className={inp + " !py-1.5 text-xs col-span-1 bg-slate-100 text-center"} title="Room Night = otomatis dari Check In/Out" value={hitungMalam(r.checkIn, r.checkOut)} readOnly />
                    <input className={inp + " !py-1.5 text-xs col-span-2"} placeholder="Price" inputMode="numeric" value={r.price ? fmt(r.price) : ""} onChange={(e) => setRoom(i, "price", e.target.value.replace(/[^\d]/g, ""))} />
                    <button onClick={() => delRoom(i)} className="text-rose-600 col-span-1 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-bold text-[#12263a] mt-2">Grand Total: Rp {gt.toLocaleString("id-ID")}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="DP (Rp)"><input className={inp} inputMode="numeric" value={g.dpAmount ? fmt(g.dpAmount) : ""} onChange={(e) => set("dpAmount", e.target.value.replace(/[^\d]/g, ""))} /></Field>
              <Field label="Tgl DP (teks)"><input className={inp} value={g.dpDate} onChange={(e) => set("dpDate", e.target.value)} placeholder="24 June 2026" /></Field>
            </div>
            <div className="text-sm text-slate-600">Balance: <b>Rp {(gt - angka(g.dpAmount)).toLocaleString("id-ID")}</b></div>

            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500">BREAKDOWN HARGA KAMAR</span>
                <button onClick={addKomponen} className="text-xs bg-[#12263a] text-white rounded px-2 py-1">+ Tambah komponen</button>
              </div>
              <p className="text-xs text-slate-400 mb-2">Lodging dihitung otomatis: Harga kamar dikurangi seluruh komponen di bawah.</p>

              {/* Nama komponen — bisa diganti & ditambah sesuai kebutuhan */}
              <div className="space-y-1 mb-3">
                {(g.komponen || []).map((k, i) => (
                  <div key={k.id} className="flex gap-1 items-center">
                    <input
                      className={inp + " !py-1.5 text-xs"}
                      placeholder={"Nama komponen " + (i + 1) + " (mis. Lunch, Coffee Break)"}
                      value={k.nama}
                      onChange={(e) => setKomponen(i, e.target.value)}
                    />
                    <button onClick={() => delKomponen(i)} title="Hapus komponen ini" className="text-rose-600 text-xs px-2 shrink-0">✕</button>
                  </div>
                ))}
                {(g.komponen || []).length === 0 && (
                  <p className="text-xs text-slate-400">Belum ada komponen. Seluruh harga kamar dihitung sebagai Lodging.</p>
                )}
              </div>

              {/* Nilai per tipe kamar */}
              <div className="space-y-3">
                {g.rooms.filter((r) => r.type).map((r) => {
                  const idx = g.rooms.indexOf(r);
                  const price = angka(r.price);
                  const komp = (g.komponen || []).filter((k) => String(k.nama || "").trim());
                  const totalKomp = komp.reduce((t, k) => t + angka((r.bd || {})[k.id]), 0);
                  const lodging = price - totalKomp;
                  return (
                    <div key={idx} className="text-xs">
                      <div className="font-semibold text-[#12263a]">{r.type} — Rp {price.toLocaleString("id-ID")}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
                        {komp.map((k) => (
                          <input
                            key={k.id}
                            className={inp + " !py-1.5 text-xs"}
                            placeholder={k.nama}
                            inputMode="numeric"
                            value={(r.bd || {})[k.id] ? fmt((r.bd || {})[k.id]) : ""}
                            onChange={(e) => setBd(idx, k.id, e.target.value.replace(/[^\d]/g, ""))}
                          />
                        ))}
                      </div>
                      <div className={"mt-1 " + (lodging < 0 ? "text-rose-600 font-semibold" : "text-slate-500")}>
                        Lodging (otomatis): <b className={lodging < 0 ? "text-rose-600" : "text-[#12263a]"}>Rp {lodging.toLocaleString("id-ID")}</b>
                        {lodging < 0 && <span> — jumlah komponen melebihi harga kamar</span>}
                      </div>
                    </div>
                  );
                })}
                {g.rooms.filter((r) => r.type).length === 0 && (
                  <p className="text-xs text-slate-400">Isi Room Type di bagian Room Arrangement dulu.</p>
                )}
              </div>
            </div>
            <Field label="Remark"><input className={inp} value={g.remark} onChange={(e) => set("remark", e.target.value)} /></Field>

            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-500">CATATAN DEPARTEMEN</div>
              <Field label="Front Office"><textarea className={inp + " h-16 resize-none"} value={g.notes.fo} onChange={(e) => setNote("fo", e.target.value)} /></Field>
              <Field label="Housekeeping"><textarea className={inp + " h-14 resize-none"} value={g.notes.hk} onChange={(e) => setNote("hk", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Engineering"><input className={inp} value={g.notes.eng} onChange={(e) => setNote("eng", e.target.value)} /></Field>
                <Field label="Finance"><input className={inp} value={g.notes.fin} onChange={(e) => setNote("fin", e.target.value)} /></Field>
              </div>
              <Field label="Security & Concierge"><textarea className={inp + " h-14 resize-none"} value={g.notes.sec} onChange={(e) => setNote("sec", e.target.value)} /></Field>
              <Field label="Sign Board"><input className={inp} value={g.notes.sign} onChange={(e) => setNote("sign", e.target.value)} /></Field>
            </div>

            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-500 mb-1">PENANDATANGAN (nama &amp; jabatan bisa disesuaikan)</div>
              <p className="text-xs text-slate-400 mb-2">
                Gambar tanda tangan <b>tidak</b> langsung tercetak. Tanda tangan digital baru muncul di PDF setelah tahapnya di-acknowledge oleh orang yang berwenang:
                Sales (ajukan) → Sales Leader → Front Office Manager → Financial Controller → General Manager.
              </p>
              <div className="space-y-2">
                {(g.ttd || []).map((t, i) => {
                  const st = statusTtd(t.nama, t.img, karyawan);
                  return (
                    <div key={i}>
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <select className={inp + " text-sm"} value={t.nama} onChange={(e) => pilihTtdNama(i, e.target.value)}>
                          <option value="">— pilih nama —</option>
                          {t.nama && !karyawan.some((k) => k.Nama === t.nama) && <option value={t.nama}>{t.nama}</option>}
                          {karyawan.map((k) => <option key={k.Nama} value={k.Nama}>{k.Nama}{k.Kode ? " (" + k.Kode + ")" : ""}</option>)}
                        </select>
                        <input className={inp + " text-sm"} value={t.jabatan} onChange={(e) => setTtd(i, "jabatan", e.target.value)} placeholder="Jabatan" />
                      </div>
                      {t.nama && <p className={"text-xs mt-0.5 " + st.warna}>{st.teks}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Batal</button>
            <button onClick={() => unduhPDF(g, "form")} disabled={pdfBusy === "form"} title="Pratinjau tanpa tanda tangan digital" className="flex-1 border border-[#c8962c] text-[#a9781f] font-semibold rounded-lg py-2.5 disabled:opacity-60">{pdfBusy === "form" ? "Membuat…" : "⬇ PDF pratinjau"}</button>
            <button onClick={() => simpan(false)} disabled={saving} className="flex-1 border border-[#12263a] text-[#12263a] font-semibold rounded-lg py-2.5 disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan draft"}</button>
            <button onClick={() => simpan(true)} disabled={saving} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan & Ajukan"}</button>
          </div>
        </Modal>
      )}

      {modalProfil && (
        <ProfilSaya user={user} onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => { const baru = { ...user, nama }; setUser(baru); localStorage.setItem("crm_user", JSON.stringify(baru)); }} />
      )}
    </div>
  );
}
