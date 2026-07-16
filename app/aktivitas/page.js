"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Modal, Field, inp } from "@/components/Modal";
import ProfilSaya from "@/components/ProfilSaya";

const ACTIVITIES = [
  "Sales Call", "Presentation", "Site Inspection", "Client Gathering",
  "Contract Discussion", "Complaint Handling", "Entertainment",
];
const SEGMENTS = [
  "Online Travel Agent", "Company", "Government", "Tour & Travel",
  "University / School", "Event Organizer", "Wedding Organizer", "Social Event", "Personal",
];

const SEG_STYLE = "bg-slate-100 text-slate-700";
const ACT_STYLE = {
  "Sales Call": "bg-blue-100 text-blue-800",
  Presentation: "bg-violet-100 text-violet-800",
  "Site Inspection": "bg-amber-100 text-amber-800",
  "Client Gathering": "bg-emerald-100 text-emerald-800",
  "Contract Discussion": "bg-indigo-100 text-indigo-800",
  "Complaint Handling": "bg-rose-100 text-rose-700",
  Entertainment: "bg-pink-100 text-pink-800",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

const FORM_KOSONG = {
  date: today(),
  time: nowTime(),
  salesName: "",
  companyName: "",
  segmentation: "",
  picName: "",
  position: "",
  phone: "",
  description: "",
  activity: "",
  fotoBase64: "",
  fotoNama: "",
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
  const [fActivity, setFActivity] = useState("Semua");
  const [fSeg, setFSeg] = useState("Semua");

  const [modalForm, setModalForm] = useState(false);
  const [form, setForm] = useState(FORM_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [modalProfil, setModalProfil] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) {
      router.replace("/");
      return;
    }
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
    } catch (e) {
      // biarkan
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) ambil();
  }, [user, ambil]);

  function logout() {
    localStorage.removeItem("crm_user");
    router.replace("/");
  }

  function bukaTambah() {
    setForm({ ...FORM_KOSONG, date: today(), time: nowTime(), salesName: user?.nama || "" });
    setModalForm(true);
  }

  // Prefill segmentation kalau company sudah ada di master
  function isiCompany(nilai) {
    const ada = companies.find((c) => String(c.CompanyName).trim().toLowerCase() === nilai.trim().toLowerCase());
    setForm((f) => ({ ...f, companyName: nilai, segmentation: ada ? ada.Segmentation || f.segmentation : f.segmentation }));
  }

  async function pilihFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileKeBase64(file);
    setForm((f) => ({ ...f, fotoBase64: base64, fotoNama: file.name }));
  }

  async function simpan() {
    if (!form.companyName.trim()) { alert("Company Name wajib diisi."); return; }
    if (!form.activity) { alert("Pilih jenis Activity."); return; }
    setMenyimpan(true);
    try {
      const res = await fetch("/api/aktivitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addActivity", ...form }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setModalForm(false);
        await ambil();
      } else {
        alert("Gagal menyimpan: " + (data.message || "coba lagi"));
      }
    } catch (e) {
      alert("Tidak bisa terhubung ke server.");
    } finally {
      setMenyimpan(false);
    }
  }

  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return list
      .filter((x) => (fActivity === "Semua" ? true : x.Activity === fActivity))
      .filter((x) => (fSeg === "Semua" ? true : x.Segmentation === fSeg))
      .filter((x) => {
        if (!q) return true;
        return [x.CompanyName, x.PICName, x.SalesName, x.PhoneNumber, x.Position]
          .join(" ").toLowerCase().includes(q);
      })
      .reverse();
  }, [list, cari, fActivity, fSeg]);

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
            <nav className="flex items-center gap-1 text-sm">
              <a href="/dashboard" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition">Leads</a>
              <a href="/aktivitas" className="px-3 py-1.5 rounded-lg bg-white/15 font-semibold">Activity</a>
            </nav>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModalProfil(true)}
              className="text-right leading-tight bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition hidden sm:block"
              title="Profil saya"
            >
              <div className="text-sm font-semibold">{user.nama}</div>
              <div className="text-xs text-slate-300 capitalize">{user.role}</div>
            </button>
            <button onClick={() => setModalProfil(true)} className="sm:hidden bg-white/10 rounded-lg px-3 py-1.5 text-sm">Profil</button>
            <button onClick={logout} className="text-sm bg-[#c8962c] hover:brightness-95 text-[#12263a] font-semibold rounded-lg px-3 py-1.5 transition">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Sales Activity</h1>
            <p className="text-sm text-slate-500">Catatan kunjungan & aktivitas sales.</p>
          </div>
          <button
            onClick={bukaTambah}
            className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 transition whitespace-nowrap"
          >
            + Tambah Aktivitas
          </button>
        </div>

        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari company, PIC, sales, no HP…"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]"
          />
          <select value={fActivity} onChange={(e) => setFActivity(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option>Semua</option>
            {ACTIVITIES.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={fSeg} onChange={(e) => setFSeg(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option>Semua</option>
            {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada aktivitas. Klik <span className="font-semibold">“+ Tambah Aktivitas”</span>.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tampil.map((x) => <ActivityCard key={x.ID} x={x} />)}
          </div>
        )}
      </main>

      {/* Modal Form */}
      {modalForm && (
        <Modal title="Tambah Aktivitas" onClose={() => setModalForm(false)}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input type="date" className={inp} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Jam">
              <input type="time" className={inp} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
            <Field label="Sales Name">
              <input className={inp} value={form.salesName} onChange={(e) => setForm({ ...form, salesName: e.target.value })} />
            </Field>
            <Field label="Company Name *">
              <input
                className={inp}
                list="daftar-company"
                value={form.companyName}
                onChange={(e) => isiCompany(e.target.value)}
                placeholder="ketik / pilih perusahaan"
              />
              <datalist id="daftar-company">
                {companies.map((c) => <option key={c.CompanyName} value={c.CompanyName} />)}
              </datalist>
              <p className="text-xs text-slate-400 mt-1">Nama company unik. Kalau sudah ada, pilih dari daftar (tidak dobel).</p>
            </Field>
          </div>

          <div className="mt-3">
            <span className="block text-sm font-medium mb-1 text-slate-700">Segmentation</span>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <Chip key={s} active={form.segmentation === s} onClick={() => setForm({ ...form, segmentation: s })}>{s}</Chip>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <span className="block text-sm font-medium mb-1 text-slate-700">Activity *</span>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => (
                <Chip key={a} active={form.activity === a} onClick={() => setForm({ ...form, activity: a })}>{a}</Chip>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Field label="PIC Name">
              <input className={inp} value={form.picName} onChange={(e) => setForm({ ...form, picName: e.target.value })} />
            </Field>
            <Field label="Position">
              <input className={inp} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </Field>
            <Field label="Phone Number">
              <input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
            </Field>
            <Field label="Foto kegiatan">
              <input type="file" accept="image/*" onChange={pilihFoto} className="text-sm w-full" />
              {form.fotoNama && <p className="text-xs text-emerald-700 mt-1">Siap unggah: {form.fotoNama}</p>}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea className={inp + " h-20 resize-none"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-sm rounded-lg px-3 py-2 border transition " +
        (active
          ? "bg-[#12263a] text-white border-[#12263a]"
          : "bg-white text-slate-700 border-slate-300 hover:border-[#c8962c]")
      }
    >
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
        {x.Activity && (
          <span className={"text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap " + (ACT_STYLE[x.Activity] || "bg-slate-100 text-slate-700")}>
            {x.Activity}
          </span>
        )}
      </div>

      {x.Segmentation && (
        <span className={"self-start text-xs font-medium px-2 py-0.5 rounded-full " + SEG_STYLE}>{x.Segmentation}</span>
      )}

      <div className="text-sm text-slate-600">
        {(x.PICName || x.Position) && (
          <div>👤 {x.PICName}{x.Position ? " — " + x.Position : ""}</div>
        )}
      </div>

      {x.Description && <p className="text-sm text-slate-600">{x.Description}</p>}

      <div className="flex flex-wrap items-center gap-3 text-xs mt-1">
        {x.PhoneNumber && (
          <a
            href={"https://wa.me/" + String(x.PhoneNumber).replace(/[^\d]/g, "").replace(/^0/, "62")}
            target="_blank" rel="noreferrer" className="text-emerald-700 font-medium"
          >
            💬 {x.PhoneNumber}
          </a>
        )}
        {x.Photo && (
          <a href={x.Photo} target="_blank" rel="noreferrer" className="text-blue-700 font-medium">📷 Foto</a>
        )}
      </div>
    </div>
  );
}
