"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import { Modal, Field, inp } from "@/components/Modal";
import CompanyPicker from "@/components/CompanyPicker";
import { Donut, BarList, ChartCard, hitungPer, beriWarna, topN } from "@/components/Charts";
import { unduhCSV, namaFileTanggal } from "@/components/exportUtil";
import Pager from "@/components/Pager";
import Header from "@/components/Header";
import DateRange, { dalamRentang } from "@/components/DateRange";
import { normalizeWA } from "@/lib/phone";
import { ambilCompanies } from "@/lib/companiesCache";

const PER_HAL = 25;
const STATUS_HEX = { Plan: "#f59e0b", Realisasi: "#10b981", Batal: "#f43f5e" };
const STATUS_STYLE = { Plan: "bg-amber-100 text-amber-800", Realisasi: "bg-emerald-100 text-emerald-800", Batal: "bg-rose-100 text-rose-700" };
const hariIni = () => new Date().toISOString().slice(0, 10);
const FORM_KOSONG = { id: "", tanggalRencana: "", salesName: "", companyName: "", picName: "", phone: "", tujuan: "", isEdit: false };

export default function CallPlanPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProfil, setModalProfil] = useState(false);

  const [cari, setCari] = useState("");
  const [fSales, setFSales] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  const [modalForm, setModalForm] = useState(false);
  const [form, setForm] = useState(FORM_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  const ambil = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetch("/api/callplan", { cache: "no-store" }).then((x) => x.json());
      if (p.status === "ok") setList(p.data || []);
    } catch (e) {} finally { setLoading(false); }
    ambilCompanies().then(setCompanies).catch(() => {}); // company di latar belakang (cache)
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  const salesOptions = useMemo(() => {
    const s = new Set();
    list.forEach((x) => { if (x.SalesName) s.add(x.SalesName); });
    return Array.from(s);
  }, [list]);

  const isAdmin = user?.role === "admin";
  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    const namaU = String(user?.nama || "").toLowerCase();
    const emailU = String(user?.email || "").toLowerCase();
    return list
      .filter((x) => isAdmin || String(x.SalesName || "").toLowerCase() === namaU || String(x.CreatedBy || "").toLowerCase() === namaU || String(x.CreatedBy || "").toLowerCase() === emailU)
      .filter((x) => (!fSales ? true : x.SalesName === fSales))
      .filter((x) => (!fStatus ? true : x.Status === fStatus))
      .filter((x) => dalamRentang(x.TanggalRencana, dari, sampai))
      .filter((x) => !q || [x.CompanyName, x.PICName, x.SalesName, x.Phone, x.Tujuan].join(" ").toLowerCase().includes(q));
  }, [list, cari, fSales, fStatus, dari, sampai, isAdmin, user]);

  const stat = useMemo(() => {
    let plan = 0, real = 0, batal = 0;
    tampil.forEach((x) => { if (x.Status === "Realisasi") real++; else if (x.Status === "Batal") batal++; else plan++; });
    const dasar = real + batal; // dari rencana yang sudah selesai (realisasi/batal)
    return { total: tampil.length, plan, real, batal, persen: dasar ? Math.round((real / dasar) * 100) : 0 };
  }, [tampil]);

  const chartStatus = useMemo(() => beriWarna(hitungPer(tampil, (x) => x.Status || "Plan"), STATUS_HEX), [tampil]);
  const chartSales = useMemo(() => beriWarna(topN(hitungPer(tampil, (x) => x.SalesName || "(kosong)"), 10)), [tampil]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [cari, fSales, fStatus, dari, sampai]);
  const totalHal = Math.max(1, Math.ceil(tampil.length / PER_HAL));
  const paged = tampil.slice((page - 1) * PER_HAL, page * PER_HAL);

  function bukaTambah() { setForm({ ...FORM_KOSONG, tanggalRencana: hariIni(), salesName: user?.nama || "" }); setModalForm(true); }
  function bukaEdit(x) {
    setForm({ id: x.ID, tanggalRencana: x.TanggalRencana || "", salesName: x.SalesName || "", companyName: x.CompanyName || "", picName: x.PICName || "", phone: x.Phone || "", tujuan: x.Tujuan || "", isEdit: true });
    setModalForm(true);
  }

  async function simpan() {
    if (!form.tanggalRencana) { alert("Tanggal rencana wajib diisi."); return; }
    if (!form.salesName.trim()) { alert("Sales wajib diisi."); return; }
    if (!form.isEdit) {
      const now = new Date();
      const day = now.getDay(); // 0=Min..6=Sab
      const sat = new Date(now);
      sat.setDate(now.getDate() + (day === 0 ? -1 : (6 - day)));
      sat.setHours(12, 0, 0, 0);
      if (now > sat) {
        alert("Batas input Sales Call Plan minggu ini sudah lewat (Sabtu 12:00 siang). Input untuk minggu berikutnya dibuka lagi hari Senin.");
        return;
      }
    }
    setMenyimpan(true);
    try {
      const res = await fetch("/api/callplan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: form.isEdit ? "updatePlan" : "addPlan", ...form, phone: form.phone ? normalizeWA(form.phone) : "", oleh: user?.nama || user?.email || "" }),
      });
      const data = await res.json();
      if (data.status === "ok") { setModalForm(false); await ambil(); }
      else alert("Gagal: " + (data.message || "coba lagi"));
    } catch (e) { alert("Tidak bisa terhubung ke server."); }
    finally { setMenyimpan(false); }
  }

  function bukaRealisasi(x) {
    // Bawa data plan ke form Sales Activity (Type otomatis "Sales Call"),
    // lalu tandai plan realisasi setelah aktivitas tersimpan.
    const prefill = {
      planId: x.ID,
      companyName: x.CompanyName || "",
      picName: x.PICName || "",
      phone: x.Phone || "",
      salesName: x.SalesName || "",
      activity: "Sales Call",
    };
    try { localStorage.setItem("crm_prefill_activity", JSON.stringify(prefill)); } catch (e) {}
    router.push("/aktivitas");
  }

  async function batalkan(x) {
    const alasan = window.prompt("Alasan batal (opsional):", "") || "";
    try {
      const res = await fetch("/api/callplan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batal", id: x.ID, hasil: alasan }),
      });
      const data = await res.json();
      if (data.status === "ok") await ambil(); else alert("Gagal: " + (data.message || "coba lagi"));
    } catch (e) { alert("Tidak bisa terhubung ke server."); }
  }

  function exportCSV() {
    const header = ["Tanggal Rencana", "Sales", "Company", "PIC", "Phone", "Tujuan", "Status", "Tanggal Realisasi", "Hasil"];
    const rows = tampil.map((x) => [x.TanggalRencana, x.SalesName, x.CompanyName, x.PICName, x.Phone, x.Tujuan, x.Status, x.TanggalRealisasi, x.Hasil]);
    unduhCSV(namaFileTanggal("call-plan"), [header, ...rows]);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header active="callplan" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Sales Call Plan &amp; Realisasi</h1>
            <p className="text-sm text-slate-500">Rencana kunjungan/telepon sales dan realisasinya.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} disabled={tampil.length === 0} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50">⬇ Export</button>
            <button onClick={bukaTambah} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 transition whitespace-nowrap">+ Tambah Plan</button>
          </div>
        </div>

        {/* Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <Kartu label="Total Plan" nilai={stat.total} />
          <Kartu label="Terealisasi" nilai={stat.real} warna="text-emerald-700" />
          <Kartu label="Batal" nilai={stat.batal} warna="text-rose-700" />
          <Kartu label="Belum (Plan)" nilai={stat.plan} warna="text-amber-700" />
          <Kartu label="% Realisasi" nilai={stat.persen + "%"} warna="text-[#c8962c]" highlight />
        </div>

        {/* Chart */}
        {!loading && tampil.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <ChartCard title="Status Plan"><Donut data={chartStatus} /></ChartCard>
            <ChartCard title="Plan per Sales"><BarList data={chartSales} /></ChartCard>
          </div>
        )}

        {/* Filter */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 mb-4">
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari…" className="col-span-2 sm:flex-1 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]" />
          {isAdmin && (
            <select value={fSales} onChange={(e) => setFSales(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
              <option value="">Semua Sales</option>
              {salesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Semua Status</option>
            <option>Plan</option><option>Realisasi</option><option>Batal</option>
          </select>
          <DateRange className="col-span-2 sm:col-span-1" dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
        </div>

        {/* Daftar */}
        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada plan. Klik <span className="font-semibold">“+ Tambah Plan”</span>.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {paged.map((x) => (
              <div key={x.ID} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[#12263a] truncate uppercase">{x.CompanyName || "(tanpa company)"}</div>
                    <div className="text-xs text-slate-500">📅 Rencana: {x.TanggalRencana} · {x.SalesName}</div>
                  </div>
                  <span className={"text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap " + (STATUS_STYLE[x.Status] || "bg-slate-100 text-slate-700")}>{x.Status}</span>
                </div>
                {(x.PICName || x.Phone) && <div className="text-sm text-slate-600">👤 {x.PICName}{x.Phone ? " · " + x.Phone : ""}</div>}
                {x.Tujuan && <div className="text-sm text-slate-600"><span className="text-slate-400">Tujuan: </span>{x.Tujuan}</div>}
                {x.Status === "Realisasi" && (
                  <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
                    ✓ Realisasi {x.TanggalRealisasi}{x.Hasil ? " — " + x.Hasil : ""}
                  </div>
                )}
                {x.Status === "Batal" && x.Hasil && (
                  <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">Batal — {x.Hasil}</div>
                )}
                <div className="flex flex-wrap gap-2 mt-1">
                  {x.Status === "Plan" && (
                    <>
                      <button onClick={() => bukaRealisasi(x)} title="Isi Sales Activity (Sales Call)" className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-3 py-1.5">✓ Realisasi → Activity</button>
                      <button onClick={() => batalkan(x)} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Batal</button>
                      <button onClick={() => bukaEdit(x)} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Edit</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && tampil.length > 0 && (
          <Pager page={page} total={totalHal} per={PER_HAL} count={tampil.length} onChange={setPage} />
        )}
      </main>

      {/* Modal tambah/edit plan */}
      {modalForm && (
        <Modal title={form.isEdit ? "Edit Plan" : "Tambah Call Plan"} onClose={() => setModalForm(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tanggal Rencana *"><input type="date" className={inp} value={form.tanggalRencana} onChange={(e) => setForm({ ...form, tanggalRencana: e.target.value })} /></Field>
              <Field label="Sales *"><input className={inp} value={form.salesName} onChange={(e) => setForm({ ...form, salesName: e.target.value })} /></Field>
            </div>
            <Field label="Company">
              <CompanyPicker value={form.companyName} companies={companies} onChange={(v) => setForm({ ...form, companyName: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="PIC Name"><input className={inp} value={form.picName} onChange={(e) => setForm({ ...form, picName: e.target.value })} /></Field>
              <Field label="Phone"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></Field>
            </div>
            <Field label="Tujuan"><textarea className={inp + " h-20 resize-none"} value={form.tujuan} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} placeholder="mis. penawaran paket meeting, follow up quotation…" /></Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Batal</button>
            <button onClick={simpan} disabled={menyimpan} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{menyimpan ? "Menyimpan…" : "Simpan"}</button>
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

function Kartu({ label, nilai, warna, highlight }) {
  return (
    <div className={"rounded-xl border p-4 " + (highlight ? "bg-[#fdf6e9] border-[#e7d3a1]" : "bg-white border-slate-200")}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={"text-2xl font-extrabold " + (warna || "text-[#12263a]")}>{nilai}</div>
    </div>
  );
}
