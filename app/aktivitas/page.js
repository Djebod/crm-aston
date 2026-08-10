"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal, Field, inp } from "@/components/Modal";
import ProfilSaya from "@/components/ProfilSaya";
import { Donut, BarList, ChartCard, hitungPer, beriWarna, topN } from "@/components/Charts";
import { unduhCSV, namaFileTanggal } from "@/components/exportUtil";
import Pager from "@/components/Pager";

const PER_HAL = 25;

const ACTIVITIES = ["Sales Call", "Site Inspection", "Telemarketing"];
const SEGMENTS = [
  "Online Travel Agent", "Company", "Government", "Tour & Travel",
  "University / School", "Event Organizer", "Wedding Organizer", "Social Event", "Personal",
];

// pilihan untuk form leads
const JENIS_EVENT = ["Wedding", "Meeting / Rapat", "Gathering", "Ulang Tahun", "Menginap / Kamar", "Lainnya"];
const SUMBER = ["Sales Call", "Site Inspection", "Telemarketing", "Referral", "Walk-in", "Lainnya"];
const STATUS = ["Tentative", "Definite", "Cancel"];

const SEG_STYLE = "bg-slate-100 text-slate-700";
const ACT_STYLE = {
  "Sales Call": "bg-blue-100 text-blue-800",
  "Site Inspection": "bg-amber-100 text-amber-800",
  Telemarketing: "bg-violet-100 text-violet-800",
};

function today() { return new Date().toISOString().slice(0, 10); }
function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

const FORM_KOSONG = {
  date: today(), time: nowTime(), salesName: "", companyName: "", segmentation: "",
  picName: "", position: "", phone: "", description: "", activity: "",
  fotoBase64: "", fotoNama: "", potensiLead: "Tidak",
};

const LEAD_KOSONG = {
  nama: "", instansi: "", nohp: "", email: "", jenisEvent: "Wedding", tanggalEvent: "",
  jumlahPax: "", estimasiNilai: "", sumber: "Sales Call", status: "Tentative", pic: "", catatan: "",
  alasanCancel: "",
};

function fileKeBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AktivitasPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cari, setCari] = useState("");
  const [fActivity, setFActivity] = useState("");
  const [fSeg, setFSeg] = useState("");
  const [fSales, setFSales] = useState("");

  const [modalForm, setModalForm] = useState(false);
  const [form, setForm] = useState(FORM_KOSONG);
  const [lead, setLead] = useState(LEAD_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [modalProfil, setModalProfil] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  const ambil = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        fetch("/api/aktivitas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/companies", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (a.status === "ok") setList(a.data || []);
      if (c.status === "ok") setCompanies(c.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  function bukaTambah() {
    setForm({ ...FORM_KOSONG, date: today(), time: nowTime(), salesName: user?.nama || "" });
    setLead(LEAD_KOSONG);
    setModalForm(true);
  }

  function isiCompany(nilai) {
    const ada = companies.find((c) => String(c.CompanyName).trim().toLowerCase() === nilai.trim().toLowerCase());
    setForm((f) => ({ ...f, companyName: nilai, segmentation: ada ? ada.Segmentation || f.segmentation : f.segmentation }));
  }

  function togglePotensi(val) {
    setForm((f) => ({ ...f, potensiLead: val }));
    if (val === "Ya") {
      // prefill dari data aktivitas
      setLead((l) => ({
        ...l,
        nama: l.nama || form.picName || "",
        instansi: l.instansi || form.companyName || "",
        nohp: l.nohp || form.phone || "",
        pic: l.pic || form.salesName || user?.nama || "",
      }));
    }
  }

  async function pilihFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileKeBase64(file);
    setForm((f) => ({ ...f, fotoBase64: base64, fotoNama: file.name }));
  }

  async function simpan() {
    if (!form.activity) { alert("Pilih jenis Activity."); return; }
    if (!form.segmentation) { alert("Pilih Market Segment."); return; }
    if (!form.picName.trim()) { alert("PIC Name wajib diisi."); return; }
    if (!form.phone.trim()) { alert("Phone Number wajib diisi."); return; }
    if (!form.fotoBase64) { alert("Foto kegiatan wajib diunggah."); return; }
    if (form.potensiLead === "Ya" && (!lead.nama.trim() || !lead.nohp.trim())) {
      alert("Karena ada potensi lead, isi minimal Nama Prospek dan No. HP pada form Leads.");
      return;
    }
    if (form.potensiLead === "Ya" && lead.status === "Cancel" && !lead.alasanCancel.trim()) {
      alert("Status Cancel wajib disertai Alasan Cancel.");
      return;
    }
    setMenyimpan(true);
    try {
      const compMatch = companies.find((c) => String(c.CompanyName).trim().toLowerCase() === form.companyName.trim().toLowerCase());
      const alamat = form.companyName.trim() && compMatch ? (compMatch.Alamat || "") : "";
      const resA = await fetch("/api/aktivitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addActivity", ...form, alamat }),
      });
      const dataA = await resA.json();
      if (dataA.status !== "ok") { alert("Gagal menyimpan aktivitas: " + (dataA.message || "coba lagi")); setMenyimpan(false); return; }

      if (form.potensiLead === "Ya") {
        const resL = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "addLead",
            ...lead,
            estimasiNilai: Number(String(lead.estimasiNilai).replace(/[^\d]/g, "")) || 0,
            alasanCancel: lead.status === "Cancel" ? lead.alasanCancel.trim() : "",
            oleh: form.salesName || user?.nama || user?.email || "",
          }),
        });
        const dataL = await resL.json();
        if (dataL.status !== "ok") { alert("Aktivitas tersimpan, tapi lead gagal: " + (dataL.message || "coba lagi")); }
      }

      setModalForm(false);
      await ambil();
    } catch (e) {
      alert("Tidak bisa terhubung ke server.");
    } finally {
      setMenyimpan(false);
    }
  }

  const salesOptions = useMemo(() => {
    const set = new Set();
    list.forEach((x) => { if (x.SalesName) set.add(x.SalesName); });
    return Array.from(set);
  }, [list]);

  const chartActivity = useMemo(() => beriWarna(hitungPer(list, (x) => x.Activity || "(kosong)")), [list]);
  const chartSegmen = useMemo(() => beriWarna(topN(hitungPer(list, (x) => x.Segmentation || "(kosong)"), 10)), [list]);
  const chartSales = useMemo(() => beriWarna(topN(hitungPer(list, (x) => x.SalesName || "(kosong)"), 10)), [list]);

  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return list
      .filter((x) => (!fActivity ? true : x.Activity === fActivity))
      .filter((x) => (!fSeg ? true : x.Segmentation === fSeg))
      .filter((x) => (!fSales ? true : x.SalesName === fSales))
      .filter((x) => {
        if (!q) return true;
        return [x.CompanyName, x.PICName, x.SalesName, x.PhoneNumber, x.Position].join(" ").toLowerCase().includes(q);
      })
      .reverse();
  }, [list, cari, fActivity, fSeg, fSales]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [cari, fActivity, fSeg, fSales]);
  const totalHal = Math.max(1, Math.ceil(tampil.length / PER_HAL));
  const paged = tampil.slice((page - 1) * PER_HAL, page * PER_HAL);

  const companyMatch = companies.find(
    (c) => String(c.CompanyName).trim().toLowerCase() === form.companyName.trim().toLowerCase()
  );
  const companyTerpilih = !!(form.companyName.trim() && companyMatch);
  const alamatCompany = companyTerpilih ? (companyMatch.Alamat || "") : "";

  function exportCSV() {
    const header = ["Tanggal", "Jam", "Sales", "Company", "Alamat", "Market Segment", "PIC Name", "Position", "Phone Number", "Activity", "Hasil Meeting", "Foto"];
    const rows = tampil.map((x) => [
      x.Date, x.Time, x.SalesName, x.CompanyName, x.Alamat || "", x.Segmentation,
      x.PICName, x.Position, x.PhoneNumber, x.Activity, x.Description, x.Photo,
    ]);
    unduhCSV(namaFileTanggal("aktivitas"), [header, ...rows]);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="bg-[#12263a] text-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-white rounded-lg px-2 py-1 flex items-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aston-logo.png" alt="Aston Cirebon" className="h-7 w-auto object-contain" />
            </span>
            <nav className="flex items-center gap-0.5 text-sm overflow-x-auto">
              <a href="/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition whitespace-nowrap">Leads</a>
              <a href="/aktivitas" className="px-3 py-1.5 rounded-lg bg-white/15 font-semibold whitespace-nowrap">Activity</a>
              <a href="/company" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition whitespace-nowrap">Company</a>
              <a href="/log" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition whitespace-nowrap">Log</a>
            </nav>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setModalProfil(true)} className="text-right leading-tight bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition hidden sm:block" title="Profil saya">
              <div className="text-sm font-semibold">{user.nama}</div>
              <div className="text-xs text-slate-300 capitalize">{user.role}</div>
            </button>
            <button onClick={() => setModalProfil(true)} className="sm:hidden bg-white/10 rounded-lg px-3 py-1.5 text-sm">Profil</button>
            <button onClick={logout} className="text-sm bg-[#c8962c] hover:brightness-95 text-[#12263a] font-semibold rounded-lg px-3 py-1.5 transition">Keluar</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Sales Activity</h1>
            <p className="text-sm text-slate-500">Catatan kunjungan &amp; aktivitas sales.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} disabled={tampil.length === 0} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50">
              ⬇ Export
            </button>
            <button onClick={bukaTambah} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 transition whitespace-nowrap">
              + Tambah Aktivitas
            </button>
          </div>
        </div>

        {/* Filter pull-down */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 mb-4">
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari…" className="col-span-2 sm:flex-1 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]" />
          <select value={fActivity} onChange={(e) => setFActivity(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Activity</option>
            {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={fSeg} onChange={(e) => setFSeg(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Market Segment</option>
            {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fSales} onChange={(e) => setFSales(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">By Sales</option>
            {salesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Chart */}
        {!loading && list.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <ChartCard title="Aktivitas per Jenis">
              <Donut data={chartActivity} />
            </ChartCard>
            <ChartCard title="Aktivitas per Market Segment">
              <BarList data={chartSegmen} />
            </ChartCard>
            <ChartCard title="Aktivitas per Sales">
              <BarList data={chartSales} />
            </ChartCard>
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada aktivitas. Klik <span className="font-semibold">“+ Tambah Aktivitas”</span>.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {paged.map((x) => <ActivityCard key={x.ID} x={x} />)}
          </div>
        )}
        {!loading && tampil.length > 0 && (
          <Pager page={page} total={totalHal} per={PER_HAL} count={tampil.length} onChange={setPage} />
        )}
      </main>

      {/* Modal Form Aktivitas */}
      {modalForm && (
        <Modal title="Tambah Aktivitas" onClose={() => setModalForm(false)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tanggal"><input type="date" className={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Jam"><input type="time" className={inp} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></Field>
            <Field label="Sales Name"><input className={inp} value={form.salesName} onChange={(e) => setForm({ ...form, salesName: e.target.value })} /></Field>
            <Field label="Company Name">
              <input className={inp} list="daftar-company" value={form.companyName} onChange={(e) => isiCompany(e.target.value)} placeholder="opsional — kosongkan jika perorangan" />
              <datalist id="daftar-company">
                {companies.map((c) => <option key={c.CompanyName} value={c.CompanyName} />)}
              </datalist>
              <p className="text-xs text-slate-400 mt-1">Boleh dikosongkan (kunjungan perorangan). Kalau sudah ada, pilih dari daftar.</p>
            </Field>
            {companyTerpilih && (
              <div className="sm:col-span-2">
                <Field label="Alamat (dari database company)">
                  <textarea
                    className={inp + " h-16 resize-none bg-slate-100 text-slate-500"}
                    value={alamatCompany || "— alamat belum diisi di database company —"}
                    readOnly
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="mt-3">
            <span className="block text-sm font-medium mb-1 text-slate-700">Market Segment *</span>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => <Chip key={s} active={form.segmentation === s} onClick={() => setForm({ ...form, segmentation: s })}>{s}</Chip>)}
            </div>
          </div>

          <div className="mt-3">
            <span className="block text-sm font-medium mb-1 text-slate-700">Activity *</span>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => <Chip key={a} active={form.activity === a} onClick={() => setForm({ ...form, activity: a })}>{a}</Chip>)}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Field label="PIC Name *"><input className={inp} value={form.picName} onChange={(e) => setForm({ ...form, picName: e.target.value })} /></Field>
            <Field label="Position"><input className={inp} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
            <Field label="Phone Number *"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" /></Field>
            <Field label="Foto kegiatan *">
              <input type="file" accept="image/*" onChange={pilihFoto} className="text-sm w-full" />
              {form.fotoNama && <p className="text-xs text-emerald-700 mt-1">Siap unggah: {form.fotoNama}</p>}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Hasil meeting"><textarea className={inp + " h-20 resize-none"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
          </div>

          {/* Potensi lead */}
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="block text-sm font-semibold mb-2 text-slate-700">Apakah ada potensi lead?</span>
            <div className="flex gap-2">
              <Chip active={form.potensiLead === "Ya"} onClick={() => togglePotensi("Ya")}>Ya</Chip>
              <Chip active={form.potensiLead === "Tidak"} onClick={() => togglePotensi("Tidak")}>Tidak</Chip>
            </div>
          </div>

          {/* Form lead lanjutan (tanpa upload foto) */}
          {form.potensiLead === "Ya" && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <h3 className="font-semibold text-[#12263a] mb-3">Form Leads</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Nama Prospek *"><input className={inp} value={lead.nama} onChange={(e) => setLead({ ...lead, nama: e.target.value })} /></Field>
                <Field label="Instansi / Perusahaan"><input className={inp} value={lead.instansi} onChange={(e) => setLead({ ...lead, instansi: e.target.value })} /></Field>
                <Field label="No. HP / WA *"><input className={inp} value={lead.nohp} onChange={(e) => setLead({ ...lead, nohp: e.target.value })} /></Field>
                <Field label="Email"><input className={inp} value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} /></Field>
                <Field label="Jenis Event">
                  <select className={inp} value={lead.jenisEvent} onChange={(e) => setLead({ ...lead, jenisEvent: e.target.value })}>
                    {JENIS_EVENT.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="Tanggal Event"><input type="date" className={inp} value={lead.tanggalEvent} onChange={(e) => setLead({ ...lead, tanggalEvent: e.target.value })} /></Field>
                <Field label="Jumlah Tamu / Kamar"><input className={inp} value={lead.jumlahPax} onChange={(e) => setLead({ ...lead, jumlahPax: e.target.value })} /></Field>
                <Field label="Estimasi Nilai (Rp)">
                  <input className={inp} inputMode="numeric"
                    value={lead.estimasiNilai ? Number(String(lead.estimasiNilai).replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                    onChange={(e) => setLead({ ...lead, estimasiNilai: e.target.value.replace(/[^\d]/g, "") })} placeholder="mis. 25.000.000" />
                </Field>
                <Field label="Sumber">
                  <select className={inp} value={lead.sumber} onChange={(e) => setLead({ ...lead, sumber: e.target.value })}>
                    {SUMBER.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={inp} value={lead.status} onChange={(e) => setLead({ ...lead, status: e.target.value })}>
                    {STATUS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Field>
                <Field label="PIC (penanggung jawab)"><input className={inp} value={lead.pic} onChange={(e) => setLead({ ...lead, pic: e.target.value })} /></Field>
                {lead.status === "Cancel" && (
                  <div className="sm:col-span-2">
                    <Field label="Alasan Cancel *">
                      <textarea className={inp + " h-16 resize-none border-rose-300"} value={lead.alasanCancel}
                        onChange={(e) => setLead({ ...lead, alasanCancel: e.target.value })} placeholder="Wajib diisi jika status Cancel" />
                    </Field>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Field label="Catatan"><textarea className={inp + " h-16 resize-none"} value={lead.catatan} onChange={(e) => setLead({ ...lead, catatan: e.target.value })} /></Field>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Batal</button>
            <button onClick={simpan} disabled={menyimpan} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">
              {menyimpan ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Profil */}
      {modalProfil && (
        <ProfilSaya user={user} onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => { const baru = { ...user, nama }; setUser(baru); localStorage.setItem("crm_user", JSON.stringify(baru)); }} />
      )}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={"text-sm rounded-lg px-3 py-2 border transition " + (active ? "bg-[#12263a] text-white border-[#12263a]" : "bg-white text-slate-700 border-slate-300 hover:border-[#c8962c]")}>
      {children}
    </button>
  );
}

function ActivityCard({ x }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-[#12263a] truncate">{x.CompanyName}</div>
          <div className="text-xs text-slate-500">{x.Date} · {x.Time} · {x.SalesName}</div>
        </div>
        {x.Activity && <span className={"text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap " + (ACT_STYLE[x.Activity] || "bg-slate-100 text-slate-700")}>{x.Activity}</span>}
      </div>
      {x.Segmentation && <span className={"self-start text-xs font-medium px-2 py-0.5 rounded-full " + SEG_STYLE}>{x.Segmentation}</span>}
      <div className="text-sm text-slate-600">
        {(x.PICName || x.Position) && <div>👤 {x.PICName}{x.Position ? " — " + x.Position : ""}</div>}
        {x.Alamat && <div className="text-slate-500">📍 {x.Alamat}</div>}
      </div>
      {x.Description && <p className="text-sm text-slate-600"><span className="text-slate-400">Hasil: </span>{x.Description}</p>}
      <div className="flex flex-wrap items-center gap-3 text-xs mt-1">
        {x.PhoneNumber && (
          <a href={"https://wa.me/" + String(x.PhoneNumber).replace(/[^\d]/g, "").replace(/^0/, "62")} target="_blank" rel="noreferrer" className="text-emerald-700 font-medium">💬 {x.PhoneNumber}</a>
        )}
        {x.Photo && <a href={x.Photo} target="_blank" rel="noreferrer" className="text-blue-700 font-medium">📷 Foto</a>}
      </div>
    </div>
  );
}
