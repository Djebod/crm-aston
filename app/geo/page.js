"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import Header from "@/components/Header";
import { Modal, Field, inp } from "@/components/Modal";

const HOTEL = {
  nama: "ASTON CIREBON HOTEL & CONVENTION CENTER",
  alamat: "Jl. Brigjen Dharsono Bypass No.12C, Kertawinangun, Kedawung, Kota Cirebon, Jawa Barat 45132",
};
const angka = (n) => Number(String(n).replace(/[^\d]/g, "")) || 0;
const fmt = (n) => angka(n).toLocaleString("id-ID");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

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

const GEO_KOSONG = () => ({
  id: "", geoNo: "", nomor: "", kodeSales: "", issuedDate: new Date().toISOString().slice(0, 10),
  eventTitle: "", company: "", contactPerson: "", address: "", phone: "", email: "",
  salesPerson: "", checkIn: "", checkOut: "", noRoom: "", guarantee: "YES",
  rooms: [{ type: "Superior", checkIn: "", checkOut: "", totalRoom: "", day: "", price: "", bfast: "", dinner: "", others: "" }],
  dpAmount: "", dpDate: "", remark: "",
  notes: { ...DEFAULT_NOTES },
  ttd: [
    { nama: "", jabatan: "Sales Person" },
    { nama: "", jabatan: "Sales Leader" },
    { nama: "", jabatan: "Front Office Manager" },
    { nama: "", jabatan: "Financial Controller" },
    { nama: "", jabatan: "General Manager" },
  ],
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

function buildHTML(g, origin) {
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

  // Breakdown otomatis per tipe kamar: Lodging = Price − (Breakfast + Dinner + Others)
  const breakdownRows = (g.rooms || []).filter((r) => r.type && angka(r.price) > 0).map((r) => {
    const price = angka(r.price), bf = angka(r.bfast), dn = angka(r.dinner), ot = angka(r.others);
    const lodging = price - bf - dn - ot;
    const bagian = [`Lodging Rp ${lodging.toLocaleString("id-ID")}`];
    if (bf) bagian.push(`Breakfast Rp ${bf.toLocaleString("id-ID")}`);
    if (dn) bagian.push(`Dinner Rp ${dn.toLocaleString("id-ID")}`);
    if (ot) bagian.push(`Others Rp ${ot.toLocaleString("id-ID")}`);
    return `<div><b>${esc(r.type)}</b> (Rp ${price.toLocaleString("id-ID")}): ${bagian.join(" · ")}</div>`;
  }).join("");

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
      <tr style="height:46px;">${(g.ttd || []).map(() => `<td style="${TDB}"></td>`).join("")}</tr>
      <tr style="font-weight:bold;">
        ${(g.ttd || []).map((t) => `<td style="${TDB}">${esc(t.nama) || "&nbsp;"}<div style="font-weight:normal">${esc(t.jabatan)}</div></td>`).join("")}
      </tr>
    </table>
    <div style="font-style:italic;font-weight:bold;font-size:8px;padding:3px;border-top:1px solid #111;">Distribution: GM, EAM, DOSM, FC, Chief Engineer, EHK, RBM, Chief Sec, HRM, AFOM, Reservation, Sales Admin, Ext. Chef, Outlet Rest.</div>
  </div>
  <div style="text-align:center;font-size:8px;color:#666;margin-top:4px;">${HOTEL.alamat}</div>
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

export default function GeoPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProfil, setModalProfil] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const [g, setG] = useState(GEO_KOSONG());
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState("");
  const [karyawan, setKaryawan] = useState([]);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  const ambil = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/geo", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setList(r.data || []);
    } catch (e) {} finally { setLoading(false); }
    try {
      const k = await fetch("/api/karyawan", { cache: "no-store" }).then((x) => x.json());
      if (k.status === "ok") setKaryawan(k.data || []);
    } catch (e) {}
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

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
      const merged = { ...k, ...p, notes: { ...DEFAULT_NOTES }, ttd: k.ttd };
      merged.nomor = String(nextNomor(list, new Date().getFullYear()));
      merged.kodeSales = user?.kode || inisial(p.salesPerson || user?.nama);
      merged.geoNo = rebuildNo(merged);
      setG(merged);
      setModalForm(true);
    } catch (e) {}
  }, [user, loading, list]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  function bukaBaru() {
    const k = GEO_KOSONG();
    k.salesPerson = user?.nama || "";
    k.ttd[0].nama = user?.nama || "";
    k.nomor = String(nextNomor(list, new Date().getFullYear()));
    k.kodeSales = user?.kode || inisial(user?.nama);
    k.geoNo = rebuildNo(k);
    setG(k);
    setModalForm(true);
  }
  function bukaEdit(row) {
    let d = {};
    try { d = JSON.parse(row.Data || "{}"); } catch (e) {}
    setG({ ...GEO_KOSONG(), ...d, id: row.ID, notes: { ...DEFAULT_NOTES, ...(d.notes || {}) } });
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
  const setRoom = (i, k, v) => setG((s) => ({ ...s, rooms: s.rooms.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRoom = () => setG((s) => ({ ...s, rooms: [...s.rooms, { type: "", checkIn: "", checkOut: "", totalRoom: "", day: "", price: "" }] }));
  const delRoom = (i) => setG((s) => ({ ...s, rooms: s.rooms.filter((_, j) => j !== i) }));

  async function simpan() {
    if (!g.geoNo.trim()) { alert("GEO No wajib diisi."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/geo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: g.id ? "updateGeo" : "addGeo", id: g.id, geoNo: g.geoNo, eventTitle: g.eventTitle, company: g.company, data: JSON.stringify(g), oleh: user?.nama || user?.email || "" }),
      });
      const d = await res.json();
      if (d.status === "ok") { setModalForm(false); await ambil(); } else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setSaving(false); }
  }

  async function hapus(row) {
    if (!confirm("Hapus GEO " + (row.GeoNo || "") + "?")) return;
    try {
      const res = await fetch("/api/geo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hapusGeo", id: row.ID }) });
      const d = await res.json();
      if (d.status === "ok") await ambil(); else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); }
  }

  async function unduhPDF(data, key) {
    const origin = window.location.origin;
    const html = buildHTML(data, origin);
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
      await window.html2pdf().set({
        margin: 5, filename: "GEO-" + (data.geoNo || "dokumen").replace(/[^\w-]/g, "_") + ".pdf",
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      }).from(cont).save();
      document.body.removeChild(cont);
      window.scrollTo(0, prevScroll);
    } catch (e) {
      const w = window.open("", "_blank");
      if (w) { w.document.open(); w.document.write("<html><head><title>GEO</title></head><body>" + html + "<scr" + "ipt>window.onload=function(){window.print()}</scr" + "ipt></body></html>"); w.document.close(); }
      else alert("Gagal membuat PDF. Izinkan popup atau cek koneksi internet.");
    } finally { setPdfBusy(""); }
  }

  const gt = useMemo(() => grandTotal(g), [g]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header active="geo" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Group Event Order (GEO)</h1>
            <p className="text-sm text-slate-500">Buat &amp; unduh GEO dalam bentuk PDF.</p>
          </div>
          <button onClick={bukaBaru} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap">+ Buat GEO</button>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : list.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">Belum ada GEO. Klik <b>“+ Buat GEO”</b>.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((row) => (
              <div key={row.ID} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="font-bold text-[#12263a]">{row.GeoNo || "(tanpa nomor)"}</div>
                <div className="text-sm text-slate-600">{row.EventTitle || "-"}</div>
                <div className="text-xs text-slate-400">{row.Company || ""} · dibuat {row.CreatedAt}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => { let d = {}; try { d = JSON.parse(row.Data || "{}"); } catch (e) {} unduhPDF({ ...GEO_KOSONG(), ...d }, row.ID); }} disabled={pdfBusy === row.ID} className="text-xs font-semibold bg-[#c8962c] text-white rounded-md px-3 py-1.5 disabled:opacity-60">{pdfBusy === row.ID ? "Membuat…" : "⬇ PDF"}</button>
                  <button onClick={() => bukaEdit(row)} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Edit</button>
                  <button onClick={() => hapus(row)} className="text-xs font-semibold border border-rose-300 text-rose-700 rounded-md px-3 py-1.5 hover:bg-rose-50">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
              <div className="text-xs font-semibold text-slate-500 mb-2">BREAKDOWN HARGA KAMAR (Lodging dihitung otomatis)</div>
              <div className="space-y-2">
                {g.rooms.filter((r) => r.type).map((r, i) => {
                  const idx = g.rooms.indexOf(r);
                  const price = angka(r.price), lodging = price - angka(r.bfast) - angka(r.dinner) - angka(r.others);
                  return (
                    <div key={idx} className="text-xs">
                      <div className="font-semibold text-[#12263a]">{r.type} — Rp {price.toLocaleString("id-ID")}</div>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <input className={inp + " !py-1.5 text-xs"} placeholder="Breakfast" inputMode="numeric" value={r.bfast ? fmt(r.bfast) : ""} onChange={(e) => setRoom(idx, "bfast", e.target.value.replace(/[^\d]/g, ""))} />
                        <input className={inp + " !py-1.5 text-xs"} placeholder="Dinner" inputMode="numeric" value={r.dinner ? fmt(r.dinner) : ""} onChange={(e) => setRoom(idx, "dinner", e.target.value.replace(/[^\d]/g, ""))} />
                        <input className={inp + " !py-1.5 text-xs"} placeholder="Others" inputMode="numeric" value={r.others ? fmt(r.others) : ""} onChange={(e) => setRoom(idx, "others", e.target.value.replace(/[^\d]/g, ""))} />
                      </div>
                      <div className="text-slate-500 mt-1">Lodging (otomatis): <b className="text-[#12263a]">Rp {lodging.toLocaleString("id-ID")}</b></div>
                    </div>
                  );
                })}
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
              <div className="text-xs font-semibold text-slate-500 mb-2">TANDA TANGAN (nama &amp; jabatan bisa disesuaikan)</div>
              <div className="space-y-2">
                {(g.ttd || []).map((t, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 items-center">
                    <select className={inp + " text-sm"} value={t.nama} onChange={(e) => setTtd(i, "nama", e.target.value)}>
                      <option value="">— pilih nama —</option>
                      {t.nama && !karyawan.some((k) => k.Nama === t.nama) && <option value={t.nama}>{t.nama}</option>}
                      {karyawan.map((k) => <option key={k.Nama} value={k.Nama}>{k.Nama}{k.Kode ? " (" + k.Kode + ")" : ""}</option>)}
                    </select>
                    <input className={inp + " text-sm"} value={t.jabatan} onChange={(e) => setTtd(i, "jabatan", e.target.value)} placeholder="Jabatan" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Batal</button>
            <button onClick={() => unduhPDF(g, "form")} disabled={pdfBusy === "form"} className="flex-1 border border-[#c8962c] text-[#a9781f] font-semibold rounded-lg py-2.5 disabled:opacity-60">{pdfBusy === "form" ? "Membuat…" : "⬇ PDF"}</button>
            <button onClick={simpan} disabled={saving} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan"}</button>
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
