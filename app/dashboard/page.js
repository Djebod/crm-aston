"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

const STATUS = ["Baru", "Follow Up", "Penawaran", "Negosiasi", "Deal", "Batal"];
const STATUS_STYLE = {
  Baru: "bg-slate-100 text-slate-700",
  "Follow Up": "bg-amber-100 text-amber-800",
  Penawaran: "bg-blue-100 text-blue-800",
  Negosiasi: "bg-violet-100 text-violet-800",
  Deal: "bg-emerald-100 text-emerald-800",
  Batal: "bg-rose-100 text-rose-700",
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
  sumber: "Walk-in",
  status: "Baru",
  pic: "",
  catatan: "",
  dokumenBase64: "",
  dokumenNama: "",
  LinkDokumen: "",
};

function rupiah(n) {
  const angka = Number(String(n).replace(/[^\d]/g, ""));
  if (!angka) return "Rp 0";
  return "Rp " + angka.toLocaleString("id-ID");
}

function fileKeBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");

  const [modalForm, setModalForm] = useState(false);
  const [form, setForm] = useState(FORM_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [modalUser, setModalUser] = useState(false);
  const [modalProfil, setModalProfil] = useState(false);

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
    if (user) ambilLeads();
  }, [user, ambilLeads]);

  function logout() {
    localStorage.removeItem("crm_user");
    router.replace("/");
  }

  // Ringkasan
  const ringkasan = useMemo(() => {
    const perStatus = {};
    STATUS.forEach((s) => (perStatus[s] = 0));
    let nilaiPipeline = 0;
    let nilaiDeal = 0;
    leads.forEach((l) => {
      const s = l.Status || "Baru";
      if (perStatus[s] !== undefined) perStatus[s]++;
      const nilai = Number(String(l.EstimasiNilai).replace(/[^\d]/g, "")) || 0;
      if (s === "Deal") nilaiDeal += nilai;
      else if (s !== "Batal") nilaiPipeline += nilai;
    });
    return { perStatus, nilaiPipeline, nilaiDeal, total: leads.length };
  }, [leads]);

  // Filter + cari
  const leadsTampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return leads
      .filter((l) => (filterStatus === "Semua" ? true : (l.Status || "Baru") === filterStatus))
      .filter((l) => {
        if (!q) return true;
        return [l.Nama, l.Instansi, l.NoHP, l.Email, l.PIC, l.JenisEvent]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .reverse(); // terbaru di atas
  }, [leads, cari, filterStatus]);

  function bukaTambah() {
    setForm({ ...FORM_KOSONG, pic: user?.nama || "" });
    setModalForm(true);
  }

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
      sumber: l.Sumber || "Walk-in",
      status: l.Status || "Baru",
      pic: l.PIC || "",
      catatan: l.Catatan || "",
      dokumenBase64: "",
      dokumenNama: "",
      LinkDokumen: l.LinkDokumen || "",
    });
    setModalForm(true);
  }

  async function pilihFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileKeBase64(file);
    setForm((f) => ({ ...f, dokumenBase64: base64, dokumenNama: file.name }));
  }

  async function simpan() {
    if (!form.nama || !form.nohp) {
      alert("Nama prospek dan No. HP wajib diisi.");
      return;
    }
    setMenyimpan(true);
    try {
      const payload = {
        action: form.id ? "updateLead" : "addLead",
        ...form,
        estimasiNilai: Number(String(form.estimasiNilai).replace(/[^\d]/g, "")) || 0,
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
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateLead", id: l.ID, status }),
      });
      await ambilLeads();
    } catch (e) {
      alert("Gagal mengubah status.");
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-[#12263a] text-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-white rounded-lg px-2 py-1 flex items-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aston-logo.png" alt="Aston Cirebon" className="h-7 w-auto object-contain" />
            </span>
            <nav className="flex items-center gap-1 text-sm">
              <a href="/dashboard" className="px-3 py-1.5 rounded-lg bg-white/15 font-semibold">Leads</a>
              <a href="/aktivitas" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition">Activity</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <button
                onClick={() => setModalUser(true)}
                className="text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition"
              >
                Kelola Tim
              </button>
            )}
            <button
              onClick={() => setModalProfil(true)}
              className="text-right leading-tight bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition"
              title="Profil saya"
            >
              <div className="text-sm font-semibold">{user.nama}</div>
              <div className="text-xs text-slate-300 capitalize">{user.role}</div>
            </button>
            <button
              onClick={logout}
              className="text-sm bg-[#c8962c] hover:brightness-95 text-[#12263a] font-semibold rounded-lg px-3 py-1.5 transition"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5">
        {/* Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Kartu label="Total Prospek" nilai={ringkasan.total} />
          <Kartu label="Sedang Proses" nilai={ringkasan.total - (ringkasan.perStatus["Deal"] + ringkasan.perStatus["Batal"])} />
          <Kartu label="Nilai Pipeline" nilai={rupiah(ringkasan.nilaiPipeline)} kecil />
          <Kartu label="Nilai Deal" nilai={rupiah(ringkasan.nilaiDeal)} kecil emas />
        </div>

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
          <button
            onClick={bukaTambah}
            className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 transition whitespace-nowrap"
          >
            + Tambah Prospek
          </button>
        </div>

        {/* Daftar leads */}
        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : leadsTampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada prospek. Klik <span className="font-semibold">“+ Tambah Prospek”</span> untuk mulai.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {leadsTampil.map((l) => (
              <LeadCard
                key={l.ID}
                lead={l}
                onEdit={() => bukaEdit(l)}
                onStatus={(s) => ubahStatusCepat(l, s)}
              />
            ))}
          </div>
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
              <input className={inp} value={form.nohp} onChange={(e) => setForm({ ...form, nohp: e.target.value })} />
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
              <input type="date" className={inp} value={form.tanggalEvent} onChange={(e) => setForm({ ...form, tanggalEvent: e.target.value })} />
            </Field>
            <Field label="Jumlah Tamu / Kamar">
              <input className={inp} value={form.jumlahPax} onChange={(e) => setForm({ ...form, jumlahPax: e.target.value })} />
            </Field>
            <Field label="Estimasi Nilai (Rp)">
              <input
                className={inp}
                value={form.estimasiNilai ? Number(String(form.estimasiNilai).replace(/[^\d]/g, "")).toLocaleString("id-ID") : ""}
                onChange={(e) => setForm({ ...form, estimasiNilai: e.target.value.replace(/[^\d]/g, "") })}
                placeholder="mis. 25.000.000"
                inputMode="numeric"
              />
            </Field>
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
            <Field label="Dokumen (KTP / foto / file)">
              <input type="file" accept="image/*,application/pdf" onChange={pilihFile} className="text-sm w-full" />
              {form.dokumenNama && <p className="text-xs text-emerald-700 mt-1">Siap unggah: {form.dokumenNama}</p>}
              {!form.dokumenNama && form.LinkDokumen && (
                <a href={form.LinkDokumen} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline mt-1 inline-block">
                  Lihat dokumen tersimpan
                </a>
              )}
            </Field>
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

function LeadCard({ lead, onEdit, onStatus }) {
  const nilai = Number(String(lead.EstimasiNilai).replace(/[^\d]/g, "")) || 0;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-[#12263a]">{lead.Nama}</div>
          {lead.Instansi && <div className="text-xs text-slate-500">{lead.Instansi}</div>}
        </div>
        <span className={"text-xs font-semibold px-2 py-1 rounded-full " + (STATUS_STYLE[lead.Status] || STATUS_STYLE.Baru)}>
          {lead.Status || "Baru"}
        </span>
      </div>

      <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
        <span>📅 {lead.JenisEvent || "-"}</span>
        {lead.TanggalEvent && <span>🗓 {lead.TanggalEvent}</span>}
        {lead.JumlahPax && <span>👥 {lead.JumlahPax}</span>}
      </div>

      {nilai > 0 && <div className="text-sm font-semibold text-[#a9781f]">Rp {nilai.toLocaleString("id-ID")}</div>}

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

      <div className="flex items-center gap-2 mt-1 pt-2 border-t border-slate-100">
        <select
          value={lead.Status || "Baru"}
          onChange={(e) => onStatus(e.target.value)}
          className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white flex-1"
        >
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
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
