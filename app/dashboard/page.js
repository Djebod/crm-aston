"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";
import { Donut, BarList, ChartCard, hitungPer, beriWarna, topN } from "@/components/Charts";
import { unduhCSV, namaFileTanggal } from "@/components/exportUtil";
import Pager from "@/components/Pager";
import Header from "@/components/Header";
import DateRange, { dalamRentang } from "@/components/DateRange";
import { normalizeWA, validWA } from "@/lib/phone";
import OfferingLetter from "@/components/OfferingLetter";

const PER_HAL = 25;

const STATUS_HEX = { Tentative: "#f59e0b", Definite: "#10b981", Cancel: "#f43f5e" };

const STATUS = ["Tentative", "Definite", "Cancel"];
const STATUS_STYLE = {
  Tentative: "bg-amber-100 text-amber-800",
  Definite: "bg-emerald-100 text-emerald-800",
  Cancel: "bg-rose-100 text-rose-700",
};
const JENIS_EVENT = ["Wedding", "Meeting / Rapat", "Gathering", "Ulang Tahun", "Menginap / Kamar", "Lainnya"];
const SUMBER = ["Walk-in", "WhatsApp", "Instagram", "Telepon", "Referral", "OTA", "Lainnya"];

const FORM_KOSONG = {
  id: "",
  nama: "",
  instansi: "",
  nohp: "",
  email: "",
  jenisEvent: "Wedding",
  tanggalEvent: "",
  jumlahPax: "",
  estimasiNilai: "",
  perluKamar: false,
  jumlahKamar: "",
  revenueRoom: "",
  sumber: "Walk-in",
  status: "Tentative",
  pic: "",
  catatan: "",
  alasanCancel: "",
  dokumenBase64: "",
  dokumenNama: "",
  LinkDokumen: "",
};

function rupiah(n) {
  const angka = Number(String(n).replace(/[^\d]/g, ""));
  if (!angka) return "Rp 0";
  return "Rp " + angka.toLocaleString("id-ID");
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [fSales, setFSales] = useState("");

  const [modalForm, setModalForm] = useState(false);
  const [form, setForm] = useState(FORM_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [modalUser, setModalUser] = useState(false);
  const [modalProfil, setModalProfil] = useState(false);
  const [modalTarget, setModalTarget] = useState(false);
  const [offeringLead, setOfferingLead] = useState(null);
  const [targets, setTargets] = useState([]);
  const isAdmin = user?.role === "admin";

  const ambilTargets = useCallback(async () => {
    try {
      const r = await fetch("/api/target", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setTargets(r.data || []);
    } catch (e) {}
  }, []);

  const [teamUsers, setTeamUsers] = useState([]);
  const ambilTeam = useCallback(async () => {
    if (!user?.email) return;
    try {
      const r = await fetch("/api/users", { headers: { "x-user-email": user.email } }).then((x) => x.json());
      if (r.status === "ok") setTeamUsers(r.data || []);
    } catch (e) {}
  }, [user]);

  // Cek login
  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) {
      router.replace("/");
      return;
    }
    setUser(JSON.parse(raw));
  }, [router]);

  const ambilLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") setLeads(data.data || []);
    } catch (e) {
      // biarkan kosong
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) { ambilLeads(); ambilTargets(); }
  }, [user, ambilLeads, ambilTargets]);

  useEffect(() => {
    if (user?.role === "admin") ambilTeam();
  }, [user, ambilTeam]);

  const marketingNames = useMemo(
    () => teamUsers.filter((u) => String(u.Role) === "marketing").map((u) => u.Nama).filter(Boolean),
    [teamUsers]
  );

  const tindakLanjut = useMemo(() => {
    const h = new Date().toISOString().slice(0, 10);
    let dueToday = 0, overdue = 0;
    leads.forEach((l) => {
      if ((l.Status || "Tentative") !== "Tentative") return;
      const t = l.TanggalTindakLanjut;
      if (!t) return;
      if (t === h) dueToday++;
      else if (t < h) overdue++;
    });
    return { dueToday, overdue };
  }, [leads]);

  function logout() {
    localStorage.removeItem("crm_user");
    router.replace("/");
  }

  const salesOptions = useMemo(() => {
    const s = new Set();
    leads.forEach((l) => { if (l.PIC) s.add(l.PIC); });
    return Array.from(s);
  }, [leads]);

  // Filter (dipakai untuk chart, ringkasan, dan daftar)
  const leadsTampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return leads
      .filter((l) => (filterStatus === "Semua" ? true : (l.Status || "Tentative") === filterStatus))
      .filter((l) => (!fSales ? true : l.PIC === fSales))
      .filter((l) => dalamRentang(l.Tanggal, dari, sampai))
      .filter((l) => {
        if (!q) return true;
        return [l.Nama, l.Instansi, l.NoHP, l.Email, l.PIC, l.JenisEvent].join(" ").toLowerCase().includes(q);
      })
      .reverse(); // terbaru di atas
  }, [leads, cari, filterStatus, fSales, dari, sampai]);

  const nilaiTotal = (l) =>
    (Number(String(l.EstimasiNilai).replace(/[^\d]/g, "")) || 0) +
    (Number(String(l.RevenueRoom).replace(/[^\d]/g, "")) || 0);

  // Ringkasan (mengikuti filter) — nilai = revenue pax + revenue room
  const ringkasan = useMemo(() => {
    const perStatus = {};
    STATUS.forEach((s) => (perStatus[s] = 0));
    let nilaiPipeline = 0;
    let nilaiDefinite = 0;
    leadsTampil.forEach((l) => {
      const s = l.Status || "Tentative";
      if (perStatus[s] !== undefined) perStatus[s]++;
      const nilai = nilaiTotal(l);
      if (s === "Definite") nilaiDefinite += nilai;
      else if (s !== "Cancel") nilaiPipeline += nilai;
    });
    return { perStatus, nilaiPipeline, nilaiDefinite, total: leadsTampil.length };
  }, [leadsTampil]);

  // Data chart (mengikuti filter)
  const chartStatus = useMemo(
    () => beriWarna(hitungPer(leadsTampil, (l) => l.Status || "Tentative"), STATUS_HEX),
    [leadsTampil]
  );
  const chartSumber = useMemo(
    () => beriWarna(topN(hitungPer(leadsTampil, (l) => l.Sumber || "(kosong)"), 10)),
    [leadsTampil]
  );

  // Target vs realisasi Definite per sales (PIC)
  const targetVs = useMemo(() => {
    const ach = {};
    leadsTampil.forEach((l) => {
      if ((l.Status || "") === "Definite") {
        const pic = l.PIC || "(tanpa PIC)";
        ach[pic] = (ach[pic] || 0) + nilaiTotal(l);
      }
    });
    let arr = targets.map((t) => {
      const target = Number(String(t.TargetRevenue).replace(/[^\d]/g, "")) || 0;
      const achieved = ach[t.SalesName] || 0;
      return { sales: t.SalesName, target, achieved, persen: target ? Math.round((achieved / target) * 100) : 0 };
    });
    if (!isAdmin) arr = arr.filter((r) => r.sales === user?.nama);
    return arr.sort((a, b) => b.achieved - a.achieved);
  }, [targets, leadsTampil, isAdmin, user]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [cari, filterStatus, fSales, dari, sampai]);
  const totalHal = Math.max(1, Math.ceil(leadsTampil.length / PER_HAL));
  const pagedLeads = leadsTampil.slice((page - 1) * PER_HAL, page * PER_HAL);

  function bukaEdit(l) {
    setForm({
      id: l.ID,
      nama: l.Nama || "",
      instansi: l.Instansi || "",
      nohp: l.NoHP || "",
      email: l.Email || "",
      jenisEvent: l.JenisEvent || "Wedding",
      tanggalEvent: l.TanggalEvent || "",
      jumlahPax: l.JumlahPax || "",
      estimasiNilai: String(l.EstimasiNilai || "").replace(/[^\d]/g, ""),
      perluKamar: !!(l.PerluKamar === "Ya" || l.RevenueRoom || l.JumlahKamar),
      jumlahKamar: l.JumlahKamar || "",
      revenueRoom: String(l.RevenueRoom || "").replace(/[^\d]/g, ""),
      sumber: l.Sumber || "Walk-in",
      status: l.Status || "Tentative",
      pic: l.PIC || "",
      catatan: l.Catatan || "",
      alasanCancel: l.AlasanCancel || "",
      dokumenBase64: "",
      dokumenNama: "",
      LinkDokumen: l.LinkDokumen || "",
    });
    setModalForm(true);
  }

  async function simpan() {
    if (!form.nama || !form.nohp) {
      alert("Nama prospek dan No. HP wajib diisi.");
      return;
    }
    if (!validWA(form.nohp)) {
      alert("Nomor WA belum benar. Gunakan format 08xx / 62xx (mis. 081234567890).");
      return;
    }
    if (form.tanggalEvent && form.tanggalEvent < new Date().toISOString().slice(0, 10)) {
      alert("Tanggal Event tidak boleh sebelum hari ini.");
      return;
    }
    if (form.status === "Cancel" && !form.alasanCancel.trim()) {
      alert("Status Cancel wajib disertai Alasan Cancel.");
      return;
    }
    setMenyimpan(true);
    try {
      const payload = {
        action: form.id ? "updateLead" : "addLead",
        ...form,
        nohp: normalizeWA(form.nohp),
        estimasiNilai: Number(String(form.estimasiNilai).replace(/[^\d]/g, "")) || 0,
        perluKamar: form.perluKamar ? "Ya" : "Tidak",
        jumlahKamar: form.perluKamar ? (Number(String(form.jumlahKamar).replace(/[^\d]/g, "")) || 0) : 0,
        revenueRoom: form.perluKamar ? (Number(String(form.revenueRoom).replace(/[^\d]/g, "")) || 0) : 0,
        alasanCancel: form.status === "Cancel" ? form.alasanCancel.trim() : "",
        oleh: user?.nama || user?.email || "",
      };
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setModalForm(false);
        await ambilLeads();
      } else {
        alert("Gagal menyimpan: " + (data.message || "coba lagi"));
      }
    } catch (e) {
      alert("Tidak bisa terhubung ke server.");
    } finally {
      setMenyimpan(false);
    }
  }

  // Ubah status cepat dari kartu
  async function ubahStatusCepat(l, status) {
    let alasanCancel = "";
    if (status === "Cancel") {
      alasanCancel = (window.prompt("Alasan Cancel (wajib diisi):", "") || "").trim();
      if (!alasanCancel) return; // batal kalau alasan kosong
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLead",
          id: l.ID,
          nama: l.Nama || "",
          status,
          alasanCancel,
          oleh: user?.nama || user?.email || "",
        }),
      });
      const data = await res.json();
      if (data.status !== "ok") {
        alert("Gagal mengubah status: " + (data.message || "coba lagi"));
      }
      await ambilLeads();
    } catch (e) {
      alert("Gagal mengubah status.");
    }
  }

  function exportCSV() {
    const header = ["Tanggal", "Nama", "Instansi", "NoHP", "Email", "Jenis Event", "Tanggal Event", "Jumlah Pax", "Estimasi Revenue Pax", "Perlu Kamar", "Jumlah Kamar", "Revenue Room", "Total Revenue", "Sumber", "Status", "PIC", "Alasan Cancel", "Update", "Oleh", "Catatan"];
    const rows = leadsTampil.map((l) => [
      l.Tanggal, l.Nama, l.Instansi, l.NoHP, l.Email, l.JenisEvent, l.TanggalEvent, l.JumlahPax,
      l.EstimasiNilai, l.PerluKamar, l.JumlahKamar, l.RevenueRoom, nilaiTotal(l),
      l.Sumber, l.Status, l.PIC, l.AlasanCancel, l.UpdatedAt, l.UpdatedBy, l.Catatan,
    ]);
    unduhCSV(namaFileTanggal("leads"), [header, ...rows]);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header active="leads" user={user}
        onKelolaTim={() => setModalUser(true)}
        onProfil={() => setModalProfil(true)}
        onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        {(tindakLanjut.dueToday > 0 || tindakLanjut.overdue > 0) && (
          <a href="/tindaklanjut" className="flex items-center justify-between gap-3 mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition">
            <span className="text-sm text-amber-900 font-medium">
              🔔 Tindak lanjut: <b>{tindakLanjut.dueToday}</b> jatuh tempo hari ini
              {tindakLanjut.overdue > 0 && <> · <b>{tindakLanjut.overdue}</b> terlewat</>}
            </span>
            <span className="text-xs font-semibold text-amber-800 whitespace-nowrap">Buka →</span>
          </a>
        )}
        {/* Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Kartu label="Total Prospek" nilai={ringkasan.total} />
          <Kartu label="Sedang Proses" nilai={ringkasan.perStatus["Tentative"]} />
          <Kartu label="Nilai Pipeline" nilai={rupiah(ringkasan.nilaiPipeline)} kecil />
          <Kartu label="Nilai Definite" nilai={rupiah(ringkasan.nilaiDefinite)} kecil emas />
        </div>

        {/* Chart */}
        {!loading && leads.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <ChartCard title="Lead per Status">
              <Donut data={chartStatus} />
            </ChartCard>
            <ChartCard title="Lead per Sumber">
              <BarList data={chartSumber} />
            </ChartCard>
          </div>
        )}

        {/* Target vs Definite */}
        {targetVs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-slate-700">🎯 Target vs Realisasi (Definite)</h3>
              {isAdmin && <button onClick={() => setModalTarget(true)} className="text-xs font-semibold text-[#12263a] border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Kelola Target</button>}
            </div>
            <div className="space-y-3">
              {targetVs.map((r) => (
                <div key={r.sales} className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-[#12263a]">{r.sales}</span>
                    <span className="text-slate-500">Rp {r.achieved.toLocaleString("id-ID")} / {r.target.toLocaleString("id-ID")} <b className={r.persen >= 100 ? "text-emerald-700" : "text-amber-700"}>({r.persen}%)</b></span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: Math.min(100, r.persen) + "%", background: r.persen >= 100 ? "#10b981" : "#c8962c" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {targetVs.length === 0 && isAdmin && (
          <div className="mb-4">
            <button onClick={() => setModalTarget(true)} className="text-sm font-semibold text-[#12263a] border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50">🎯 Atur Target Sales</button>
          </div>
        )}

        {/* Baris aksi */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama, instansi, no HP…"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white"
          >
            <option>Semua</option>
            {STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select value={fSales} onChange={(e) => setFSales(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Semua Sales</option>
            {salesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <DateRange dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
          <button onClick={exportCSV} disabled={leadsTampil.length === 0} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50">
            ⬇ Export
          </button>
        </div>

        {/* Daftar leads */}
        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : leadsTampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada lead yang disubmit. Lead dibuat dari menu <span className="font-semibold">Activity</span> saat ada potensi lead.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {pagedLeads.map((l) => (
              <LeadCard
                key={l.ID}
                lead={l}
                onEdit={() => bukaEdit(l)}
                onStatus={(s) => ubahStatusCepat(l, s)}
                onOffering={() => setOfferingLead(l)}
              />
            ))}
          </div>
        )}
        {!loading && leadsTampil.length > 0 && (
          <Pager page={page} total={totalHal} per={PER_HAL} count={leadsTampil.length} onChange={setPage} />
        )}
      </main>

      {/* Modal Form Prospek */}
      {modalForm && (
        <Modal onClose={() => setModalForm(false)} title={form.id ? "Edit Prospek" : "Tambah Prospek"}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nama Prospek *">
              <input className={inp} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </Field>
            <Field label="Instansi / Perusahaan">
              <input className={inp} value={form.instansi} onChange={(e) => setForm({ ...form, instansi: e.target.value })} />
            </Field>
            <Field label="No. HP / WA *">
              <input className={inp} value={form.nohp}
                onChange={(e) => setForm({ ...form, nohp: e.target.value })}
                onBlur={(e) => { const v = e.target.value.trim(); if (v) setForm((f) => ({ ...f, nohp: normalizeWA(v) })); }}
                inputMode="tel" placeholder="mis. 081234567890" />
              <p className="text-xs text-slate-400 mt-1">Otomatis dirapikan ke format 62… (mis. 6281234567890).</p>
            </Field>
            <Field label="Email">
              <input className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Jenis Event">
              <select className={inp} value={form.jenisEvent} onChange={(e) => setForm({ ...form, jenisEvent: e.target.value })}>
                {JENIS_EVENT.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Tanggal Event">
              <input type="date" min={new Date().toISOString().slice(0, 10)} className={inp} value={form.tanggalEvent} onChange={(e) => setForm({ ...form, tanggalEvent: e.target.value })} />
            </Field>
            <Field label="Jumlah Tamu / Pax">
              <input className={inp} value={form.jumlahPax} onChange={(e) => setForm({ ...form, jumlahPax: e.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Estimasi Revenue Pax (Rp)">
              <input
                className={inp}
                value={form.estimasiNilai ? Number(String(form.estimasiNilai).replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                onChange={(e) => setForm({ ...form, estimasiNilai: e.target.value.replace(/[^\d]/g, "") })}
                placeholder="mis. 25.000.000"
                inputMode="numeric"
              />
            </Field>

            {/* Arrangement kamar */}
            <div className="sm:col-span-2 rounded-lg border border-slate-200 p-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.perluKamar} onChange={(e) => setForm({ ...form, perluKamar: e.target.checked })} className="w-4 h-4 accent-[#12263a]" />
                <span className="text-sm font-medium text-slate-700">Perlu arrangement kamar?</span>
              </label>
              {form.perluKamar && (
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <Field label="Jumlah Kamar">
                    <input className={inp} value={form.jumlahKamar} onChange={(e) => setForm({ ...form, jumlahKamar: e.target.value.replace(/[^\d]/g, "") })} inputMode="numeric" placeholder="mis. 20" />
                  </Field>
                  <Field label="Estimasi Revenue Room (Rp)">
                    <input
                      className={inp}
                      value={form.revenueRoom ? Number(String(form.revenueRoom).replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                      onChange={(e) => setForm({ ...form, revenueRoom: e.target.value.replace(/[^\d]/g, "") })}
                      placeholder="mis. 15.000.000"
                      inputMode="numeric"
                    />
                  </Field>
                </div>
              )}
              <div className="mt-3 text-sm bg-[#fdf6e9] border border-[#e7d3a1] rounded-md px-3 py-2 flex justify-between">
                <span className="text-slate-600">Total Revenue Projection</span>
                <span className="font-bold text-[#12263a]">
                  Rp {((Number(String(form.estimasiNilai).replace(/[^\d]/g, "")) || 0) + (form.perluKamar ? (Number(String(form.revenueRoom).replace(/[^\d]/g, "")) || 0) : 0)).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
            <Field label="Sumber">
              <select className={inp} value={form.sumber} onChange={(e) => setForm({ ...form, sumber: e.target.value })}>
                {SUMBER.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="PIC (penanggung jawab)">
              <input className={inp} value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} />
            </Field>
            {form.status === "Cancel" && (
              <div className="sm:col-span-2">
                <Field label="Alasan Cancel *">
                  <textarea
                    className={inp + " h-16 resize-none border-rose-300"}
                    value={form.alasanCancel}
                    onChange={(e) => setForm({ ...form, alasanCancel: e.target.value })}
                    placeholder="Wajib diisi jika status Cancel"
                  />
                </Field>
              </div>
            )}
            <div className="sm:col-span-2">
              <Field label="Catatan">
                <textarea className={inp + " h-20 resize-none"} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">
              Batal
            </button>
            <button onClick={simpan} disabled={menyimpan} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">
              {menyimpan ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Kelola Tim */}
      {modalUser && <KelolaTim user={user} onClose={() => setModalUser(false)} />}
      {modalTarget && <KelolaTarget targets={targets} salesOptions={marketingNames} onClose={() => setModalTarget(false)} onSaved={ambilTargets} />}
      {offeringLead && <OfferingLetter lead={offeringLead} user={user} onClose={() => setOfferingLead(null)} />}

      {/* Modal Profil Saya */}
      {modalProfil && (
        <ProfilSaya
          user={user}
          onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => {
            const baru = { ...user, nama };
            setUser(baru);
            localStorage.setItem("crm_user", JSON.stringify(baru));
          }}
        />
      )}
    </div>
  );
}

const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#c8962c] bg-white";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1 text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Kartu({ label, nilai, kecil, emas }) {
  return (
    <div className={"rounded-xl p-3.5 border " + (emas ? "bg-[#fff8ec] border-[#e7cf9a]" : "bg-white border-slate-200")}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={"font-extrabold mt-1 " + (kecil ? "text-lg" : "text-2xl") + (emas ? " text-[#a9781f]" : " text-[#12263a]")}>
        {nilai}
      </div>
    </div>
  );
}

function LeadCard({ lead, onEdit, onStatus, onOffering }) {
  const pax = Number(String(lead.EstimasiNilai).replace(/[^\d]/g, "")) || 0;
  const room = Number(String(lead.RevenueRoom).replace(/[^\d]/g, "")) || 0;
  const total = pax + room;
  const adaKamar = lead.PerluKamar === "Ya" || room > 0 || (Number(String(lead.JumlahKamar).replace(/[^\d]/g, "")) || 0) > 0;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-[#12263a]">{lead.Nama}</div>
          {lead.Instansi && <div className="text-xs text-slate-500">{lead.Instansi}</div>}
        </div>
        <span className={"text-xs font-semibold px-2 py-1 rounded-full " + (STATUS_STYLE[lead.Status] || STATUS_STYLE.Tentative)}>
          {lead.Status || "Tentative"}
        </span>
      </div>

      <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
        <span>📅 {lead.JenisEvent || "-"}</span>
        {lead.TanggalEvent && <span>🗓 {lead.TanggalEvent}</span>}
        {lead.JumlahPax && <span>👥 {lead.JumlahPax}</span>}
        {adaKamar && lead.JumlahKamar && <span>🛏 {lead.JumlahKamar} kamar</span>}
      </div>

      {total > 0 && (
        <div className="text-sm font-semibold text-[#a9781f]">
          Rp {total.toLocaleString("id-ID")}
          {adaKamar && room > 0 && <span className="text-xs font-normal text-slate-400"> (Pax {pax.toLocaleString("id-ID")} + Room {room.toLocaleString("id-ID")})</span>}
        </div>
      )}

      {lead.Status === "Cancel" && lead.AlasanCancel && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">
          Alasan cancel: {lead.AlasanCancel}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {lead.NoHP && (
          <a
            href={"https://wa.me/" + String(lead.NoHP).replace(/[^\d]/g, "").replace(/^0/, "62")}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 font-medium"
          >
            💬 WA
          </a>
        )}
        {lead.LinkDokumen && (
          <a href={lead.LinkDokumen} target="_blank" rel="noreferrer" className="text-blue-700 font-medium">
            📎 Dokumen
          </a>
        )}
        {lead.PIC && <span>PIC: {lead.PIC}</span>}
      </div>

      {(lead.UpdatedAt || lead.UpdatedBy) && (
        <div className="text-[11px] text-slate-400">
          Update: {lead.UpdatedAt || "-"}{lead.UpdatedBy ? " · oleh " + lead.UpdatedBy : ""}
        </div>
      )}

      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100">
        <select
          value={lead.Status || "Tentative"}
          onChange={(e) => onStatus(e.target.value)}
          className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white flex-1"
        >
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={onOffering} className="text-xs font-semibold text-white bg-[#c8962c] hover:brightness-95 rounded-md px-3 py-1.5">
          📄 Offering
        </button>
        <button onClick={onEdit} className="text-xs font-semibold text-[#12263a] border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">
          Edit
        </button>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <h2 className="font-bold text-[#12263a]">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function KelolaTarget({ targets, salesOptions, onClose, onSaved }) {
  const awal = {};
  const nama = new Set();
  targets.forEach((t) => { nama.add(t.SalesName); awal[t.SalesName] = { rev: String(t.TargetRevenue || ""), day: String(t.TargetActivityDay || "5") }; });
  salesOptions.forEach((s) => nama.add(s));
  const daftar = Array.from(nama).filter(Boolean).sort();
  const [rows, setRows] = useState(() => daftar.map((s) => ({ sales: s, rev: awal[s]?.rev || "", day: awal[s]?.day || "5" })));
  const [tambah, setTambah] = useState("");
  const [busy, setBusy] = useState(false);

  async function simpanSatu(r) {
    setBusy(true);
    try {
      const res = await fetch("/api/target", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setTarget", salesName: r.sales, targetRevenue: r.rev, targetActivityDay: r.day }) });
      const d = await res.json();
      if (d.status === "ok") { await onSaved(); } else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setBusy(false); }
  }

  return (
    <Modal title="Kelola Target Sales" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">Daftar sales diambil dari pengguna bertipe <b>Marketing</b> (Kelola Tim). Target revenue (Definite) &amp; target aktivitas per hari (default 5 company).</p>
      <div className="flex gap-2 mb-3">
        <input value={tambah} onChange={(e) => setTambah(e.target.value)} placeholder="Tambah nama sales…" className={inp} />
        <button onClick={() => { const s = tambah.trim(); if (s && !rows.find((r) => r.sales === s)) { setRows([...rows, { sales: s, rev: "", day: "5" }]); setTambah(""); } }} className="bg-[#12263a] text-white rounded-lg px-4 font-semibold">+</button>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {rows.length === 0 && <div className="text-sm text-slate-400">Belum ada sales. Tambahkan di atas.</div>}
        {rows.map((r, i) => (
          <div key={r.sales} className="border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-[#12263a] text-sm mb-2">{r.sales}</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-slate-500">Target Revenue (Rp)</span>
                <input className={inp} inputMode="numeric" value={r.rev ? Number(String(r.rev).replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                  onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); setRows(rows.map((x, j) => j === i ? { ...x, rev: v } : x)); }} placeholder="mis. 100.000.000" />
              </div>
              <div>
                <span className="text-xs text-slate-500">Target Aktivitas/hari</span>
                <input className={inp} inputMode="numeric" value={r.day}
                  onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); setRows(rows.map((x, j) => j === i ? { ...x, day: v } : x)); }} placeholder="5" />
              </div>
            </div>
            <button onClick={() => simpanSatu(r)} disabled={busy} className="mt-2 text-xs font-semibold bg-[#12263a] text-white rounded-md px-3 py-1.5 disabled:opacity-60">Simpan</button>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-4 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Tutup</button>
    </Modal>
  );
}

function KelolaTim({ user, onClose }) {
  const [daftar, setDaftar] = useState([]);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("marketing");
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState("");
  const [editing, setEditing] = useState(null); // email user yang sedang diedit

  const muat = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { headers: { "x-user-email": user.email } });
      const data = await res.json();
      if (data.status === "ok") setDaftar(data.data || []);
    } catch (e) {}
  }, [user.email]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function tambah() {
    setPesan("");
    if (!nama || !email || !password) {
      setPesan("Nama, email, dan password wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addUser", requesterEmail: user.email, nama, email, password, role }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setPesan("✓ User berhasil ditambahkan.");
        setNama(""); setEmail(""); setPassword(""); setRole("marketing");
        await muat();
      } else {
        setPesan("Gagal: " + (data.message || "coba lagi"));
      }
    } catch (e) {
      setPesan("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Kelola Tim" onClose={onClose}>
      {/* Tambah user baru */}
      <h3 className="font-semibold text-sm text-slate-700 mb-2">Tambah anggota</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nama"><input className={inp} value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
        <Field label="Email"><input className={inp} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password awal">
          <PasswordInput className={inp} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Role">
          <select className={inp} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="marketing">marketing</option>
            <option value="admin">admin</option>
          </select>
        </Field>
      </div>
      {pesan && <p className="text-sm mt-3">{pesan}</p>}
      <button onClick={tambah} disabled={loading} className="mt-4 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 px-4 disabled:opacity-60">
        {loading ? "Menyimpan..." : "Tambah User"}
      </button>

      {/* Daftar anggota + aksi */}
      <div className="mt-6">
        <h3 className="font-semibold text-sm text-slate-700 mb-2">Anggota tim</h3>
        <div className="space-y-2">
          {daftar.length === 0 && (
            <div className="p-3 text-sm text-slate-500 border border-slate-200 rounded-lg">Belum ada anggota tim.</div>
          )}
          {daftar.map((u) => (
            <BarisUser
              key={u.Email}
              u={u}
              requester={user.email}
              expanded={editing === u.Email}
              onToggle={() => setEditing(editing === u.Email ? null : u.Email)}
              onSaved={muat}
            />
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Catatan: super admin (env) tidak muncul di daftar ini dan tidak diedit dari sini.
        </p>
      </div>
    </Modal>
  );
}

function BarisUser({ u, requester, expanded, onToggle, onSaved }) {
  const [nama, setNama] = useState(u.Nama || "");
  const [role, setRole] = useState(u.Role || "marketing");
  const [aktif, setAktif] = useState(String(u.Aktif).toLowerCase() !== "false");
  const [pwBaru, setPwBaru] = useState("");
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState("");

  async function kirim(payloadTambahan, pesanSukses) {
    setBusy(true);
    setPesan("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateUser", requesterEmail: requester, email: u.Email, ...payloadTambahan }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setPesan(pesanSukses);
        setPwBaru("");
        await onSaved();
      } else {
        setPesan("Gagal: " + (data.message || "coba lagi"));
      }
    } catch (e) {
      setPesan("Tidak bisa terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  const nonaktif = String(u.Aktif).toLowerCase() === "false";

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="p-3 flex items-center justify-between text-sm">
        <div className="min-w-0">
          <div className="font-medium truncate">
            {u.Nama || u.Email} {nonaktif && <span className="text-rose-600 text-xs">(non-aktif)</span>}
          </div>
          <div className="text-xs text-slate-500 truncate">{u.Email}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5 capitalize">{u.Role}</span>
          <button onClick={onToggle} className="text-xs font-semibold text-[#12263a] border border-slate-300 rounded-md px-2.5 py-1 hover:bg-slate-50">
            {expanded ? "Tutup" : "Kelola"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-3 bg-slate-50/60">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nama"><input className={inp} value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
            <Field label="Role">
              <select className={inp} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="marketing">marketing</option>
                <option value="admin">admin</option>
              </select>
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input id={"aktif-" + u.Email} type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
            <label htmlFor={"aktif-" + u.Email} className="text-sm text-slate-700">Akun aktif (boleh login)</label>
          </div>
          <button
            onClick={() => kirim({ nama, role, aktif }, "✓ Perubahan disimpan.")}
            disabled={busy}
            className="mt-3 bg-[#12263a] hover:bg-[#0e1f33] text-white text-sm font-semibold rounded-lg py-2 px-4 disabled:opacity-60"
          >
            {busy ? "Menyimpan..." : "Simpan perubahan"}
          </button>

          <div className="mt-4 pt-3 border-t border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-1">Reset password</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <PasswordInput
                className={inp}
                value={pwBaru}
                onChange={(e) => setPwBaru(e.target.value)}
                placeholder="Password baru (min. 6 karakter)"
              />
              <button
                onClick={() => {
                  if (pwBaru.length < 6) { setPesan("Password minimal 6 karakter."); return; }
                  kirim({ password: pwBaru }, "✓ Password direset.");
                }}
                disabled={busy}
                className="bg-[#c8962c] hover:brightness-95 text-[#12263a] text-sm font-semibold rounded-lg py-2 px-4 whitespace-nowrap disabled:opacity-60"
              >
                Reset
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Beritahu password baru ini ke anggota, atau minta mereka pakai fitur "Lupa password".</p>
          </div>

          {pesan && <p className="text-sm mt-3">{pesan}</p>}
        </div>
      )}
    </div>
  );
}

function ProfilSaya({ user, onClose, onProfileUpdate }) {
  const [nama, setNama] = useState(user.nama || "");
  const [busyProfil, setBusyProfil] = useState(false);
  const [pesanProfil, setPesanProfil] = useState("");

  const [pwLama, setPwLama] = useState("");
  const [pwBaru, setPwBaru] = useState("");
  const [pwBaru2, setPwBaru2] = useState("");
  const [busyPw, setBusyPw] = useState(false);
  const [pesanPw, setPesanPw] = useState("");

  async function simpanProfil() {
    setPesanProfil("");
    if (!nama.trim()) {
      setPesanProfil("Nama tidak boleh kosong.");
      return;
    }
    setBusyProfil(true);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateProfile", email: user.email, nama: nama.trim() }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        onProfileUpdate(nama.trim());
        setPesanProfil("✓ Profil diperbarui.");
      } else {
        setPesanProfil(data.message || "Gagal memperbarui profil.");
      }
    } catch (e) {
      setPesanProfil("Tidak bisa terhubung ke server.");
    } finally {
      setBusyProfil(false);
    }
  }

  async function gantiPassword() {
    setPesanPw("");
    if (!pwLama) { setPesanPw("Isi password lama."); return; }
    if (pwBaru.length < 6) { setPesanPw("Password baru minimal 6 karakter."); return; }
    if (pwBaru !== pwBaru2) { setPesanPw("Konfirmasi password baru tidak sama."); return; }
    setBusyPw(true);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changePassword",
          email: user.email,
          currentPassword: pwLama,
          newPassword: pwBaru,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setPesanPw("✓ Password berhasil diganti.");
        setPwLama(""); setPwBaru(""); setPwBaru2("");
      } else {
        setPesanPw(data.message || "Gagal mengganti password.");
      }
    } catch (e) {
      setPesanPw("Tidak bisa terhubung ke server.");
    } finally {
      setBusyPw(false);
    }
  }

  return (
    <Modal title="Profil Saya" onClose={onClose}>
      {/* Ubah profil */}
      <h3 className="font-semibold text-sm text-slate-700 mb-2">Data profil</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nama"><input className={inp} value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
        <Field label="Email (tidak bisa diubah)">
          <input className={inp + " bg-slate-100 text-slate-500"} value={user.email} readOnly />
        </Field>
      </div>
      {pesanProfil && <p className="text-sm mt-3">{pesanProfil}</p>}
      <button onClick={simpanProfil} disabled={busyProfil} className="mt-3 bg-[#12263a] hover:bg-[#0e1f33] text-white text-sm font-semibold rounded-lg py-2 px-4 disabled:opacity-60">
        {busyProfil ? "Menyimpan..." : "Simpan profil"}
      </button>

      {/* Ganti password */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        <h3 className="font-semibold text-sm text-slate-700 mb-2">Ganti password</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Password lama">
            <PasswordInput className={inp} value={pwLama} onChange={(e) => setPwLama(e.target.value)} placeholder="password sekarang" />
          </Field>
          <div className="hidden sm:block" />
          <Field label="Password baru">
            <PasswordInput className={inp} value={pwBaru} onChange={(e) => setPwBaru(e.target.value)} placeholder="min. 6 karakter" />
          </Field>
          <Field label="Ulangi password baru">
            <PasswordInput className={inp} value={pwBaru2} onChange={(e) => setPwBaru2(e.target.value)} placeholder="ketik ulang" />
          </Field>
        </div>
        {pesanPw && <p className="text-sm mt-3">{pesanPw}</p>}
        <button onClick={gantiPassword} disabled={busyPw} className="mt-3 bg-[#c8962c] hover:brightness-95 text-[#12263a] text-sm font-semibold rounded-lg py-2 px-4 disabled:opacity-60">
          {busyPw ? "Menyimpan..." : "Ganti password"}
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-5">
        Catatan: akun super admin dikelola lewat Environment Variable, jadi ubah profil/password di sini hanya untuk akun tim.
      </p>
    </Modal>
  );
}
