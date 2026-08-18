"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import Header from "@/components/Header";
import Pager from "@/components/Pager";
import DateRange, { dalamRentang } from "@/components/DateRange";
import { unduhCSV, namaFileTanggal } from "@/components/exportUtil";

const PER_HAL = 25;

function gcalUrl(lead, tgl, tindak) {
  if (!tgl) return "";
  const d = String(tgl).replace(/-/g, "");
  const start = d + "T100000";
  const end = d + "T110000";
  const judul = "Visit: " + (lead.Nama || "") + (lead.Instansi ? " - " + lead.Instansi : "");
  const detail =
    "Tindak lanjut: " + (tindak || "-") +
    "\nEvent: " + (lead.JenisEvent || "-") + (lead.TanggalEvent ? " (" + lead.TanggalEvent + ")" : "") +
    "\nNo HP: " + (lead.NoHP || "-") +
    "\nPIC: " + (lead.PIC || "-");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: judul,
    dates: start + "/" + end,
    details: detail,
    location: lead.Instansi || "",
    ctz: "Asia/Jakarta",
  });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}

export default function TindakLanjutPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProfil, setModalProfil] = useState(false);
  const [cari, setCari] = useState("");
  const [fSales, setFSales] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [draft, setDraft] = useState({}); // id -> {tindak, tgl}
  const [saving, setSaving] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  const ambil = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/leads", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setLeads(r.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  const salesOptions = useMemo(() => {
    const s = new Set();
    leads.forEach((l) => { if ((l.Status || "Tentative") === "Tentative" && l.PIC) s.add(l.PIC); });
    return Array.from(s).sort();
  }, [leads]);

  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return leads
      .filter((l) => (l.Status || "Tentative") === "Tentative")
      .filter((l) => (!fSales ? true : l.PIC === fSales))
      .filter((l) => dalamRentang(l.TanggalTindakLanjut || l.UpdatedAt, dari, sampai))
      .filter((l) => !q || [l.Nama, l.Instansi, l.NoHP, l.PIC, l.TindakLanjut].join(" ").toLowerCase().includes(q))
      .sort((a, b) => String(a.TanggalTindakLanjut || "9999").localeCompare(String(b.TanggalTindakLanjut || "9999")));
  }, [leads, cari, fSales, dari, sampai]);

  useEffect(() => { setPage(1); }, [cari, fSales, dari, sampai]);
  const totalHal = Math.max(1, Math.ceil(tampil.length / PER_HAL));
  const paged = tampil.slice((page - 1) * PER_HAL, page * PER_HAL);

  function nilaiDraft(l, k) {
    const d = draft[l.ID] || {};
    if (k === "tindak") return d.tindak !== undefined ? d.tindak : (l.TindakLanjut || "");
    return d.tgl !== undefined ? d.tgl : (l.TanggalTindakLanjut || "");
  }
  function setD(id, k, v) { setDraft((s) => ({ ...s, [id]: { ...s[id], [k]: v } })); }

  async function simpan(l) {
    setSaving(l.ID);
    try {
      const res = await fetch("/api/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateLead", id: l.ID, tindakLanjut: nilaiDraft(l, "tindak"), tanggalTindakLanjut: nilaiDraft(l, "tgl"), oleh: user?.nama || user?.email || "" }),
      });
      const d = await res.json();
      if (d.status === "ok") { await ambil(); setDraft((s) => { const n = { ...s }; delete n[l.ID]; return n; }); }
      else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setSaving(""); }
  }

  function exportCSV() {
    const header = ["Nama", "Instansi", "No HP", "PIC", "Jenis Event", "Tgl Event", "Tindakan Selanjutnya", "Tgl Tindak Lanjut", "Last Updated"];
    const rows = tampil.map((l) => [l.Nama, l.Instansi, l.NoHP, l.PIC, l.JenisEvent, l.TanggalEvent, l.TindakLanjut, l.TanggalTindakLanjut, l.UpdatedAt]);
    unduhCSV(namaFileTanggal("tindak-lanjut"), [header, ...rows]);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header active="tindaklanjut" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Tindak Lanjut (Tentative)</h1>
            <p className="text-sm text-slate-500">{tampil.length} prospek tentative menunggu tindakan selanjutnya.</p>
          </div>
          <button onClick={exportCSV} disabled={tampil.length === 0} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50">⬇ Export</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, instansi, PIC…" className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]" />
          <select value={fSales} onChange={(e) => setFSales(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Semua Sales</option>
            {salesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <DateRange dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">Tidak ada lead berstatus Tentative. 🎉</div>
        ) : (
          <div className="grid gap-3">
            {paged.map((l) => {
              const url = gcalUrl(l, nilaiDraft(l, "tgl"), nilaiDraft(l, "tindak"));
              const berubah = !!draft[l.ID];
              return (
                <div key={l.ID} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-[#12263a]">{l.Nama}</div>
                      {l.Instansi && <div className="text-xs text-slate-500">{l.Instansi}</div>}
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">Tentative</span>
                  </div>

                  <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    <span>📅 {l.JenisEvent || "-"}</span>
                    {l.TanggalEvent && <span>🗓 {l.TanggalEvent}</span>}
                    {l.PIC && <span>👤 {l.PIC}</span>}
                    {l.NoHP && (
                      <a href={"https://wa.me/" + String(l.NoHP).replace(/[^\d]/g, "").replace(/^0/, "62")} target="_blank" rel="noreferrer" className="text-emerald-700 font-medium">💬 WA</a>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1">🕒 Last updated: {l.UpdatedAt || "-"}{l.UpdatedBy ? " · oleh " + l.UpdatedBy : ""}</div>

                  <div className="mt-3 grid sm:grid-cols-[1fr_170px] gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Tindakan selanjutnya</label>
                      <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#c8962c]" placeholder="mis. Follow up penawaran / kunjungi kembali" value={nilaiDraft(l, "tindak")} onChange={(e) => setD(l.ID, "tindak", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Tgl tindak lanjut / visit</label>
                      <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#c8962c]" value={nilaiDraft(l, "tgl")} onChange={(e) => setD(l.ID, "tgl", e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => simpan(l)} disabled={saving === l.ID || !berubah} className="text-xs font-semibold bg-[#12263a] text-white rounded-md px-3 py-1.5 disabled:opacity-50">
                      {saving === l.ID ? "Menyimpan…" : "Simpan"}
                    </button>
                    <a
                      href={url || undefined}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => { if (!url) { e.preventDefault(); alert("Isi dulu 'Tgl tindak lanjut / visit' untuk menambahkan ke Calendar."); } }}
                      className={"text-xs font-semibold rounded-md px-3 py-1.5 " + (url ? "border border-blue-300 text-blue-700 hover:bg-blue-50" : "border border-slate-200 text-slate-400 cursor-not-allowed")}
                    >
                      📅 Add to Google Calendar
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loading && tampil.length > 0 && (
          <Pager page={page} total={totalHal} per={PER_HAL} count={tampil.length} onChange={setPage} />
        )}
      </main>

      {modalProfil && (
        <ProfilSaya user={user} onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => { const baru = { ...user, nama }; setUser(baru); localStorage.setItem("crm_user", JSON.stringify(baru)); }} />
      )}
    </div>
  );
}
