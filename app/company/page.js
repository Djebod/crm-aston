"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import { Modal, Field, inp } from "@/components/Modal";
import { Donut, BarList, ChartCard, hitungPer, beriWarna, topN } from "@/components/Charts";
import { unduhCSV, namaFileTanggal } from "@/components/exportUtil";
import Pager from "@/components/Pager";
import Header from "@/components/Header";

const PER_HAL = 25;

const SEGMENTS = [
  "Online Travel Agent", "Company", "Government", "Tour & Travel",
  "University / School", "Event Organizer", "Wedding Organizer", "Social Event", "Personal",
];

// ---- CSV helper untuk import ----
function splitCsvLine(line) {
  const out = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
  }
  out.push(cur);
  return out;
}
function parseCSV(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (i === 0 && /company/i.test(cols[0] || "")) continue;
    const companyName = (cols[0] || "").trim();
    const segmentation = (cols[1] || "").trim();
    const alamat = (cols[2] || "").trim();
    if (companyName) rows.push({ companyName, segmentation, alamat });
  }
  return rows;
}

const FORM_KOSONG = { companyName: "", segmentation: "Company", alamat: "", isEdit: false };

export default function CompanyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [modalProfil, setModalProfil] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const [modalImport, setModalImport] = useState(false);
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
      const r = await fetch("/api/companies", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setCompanies(r.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  function bukaTambah() { setForm({ ...FORM_KOSONG }); setModalForm(true); }
  function bukaEdit(c) {
    setForm({ companyName: c.CompanyName, segmentation: c.Segmentation || "Company", alamat: c.Alamat || "", isEdit: true });
    setModalForm(true);
  }

  async function simpan() {
    if (!form.companyName.trim()) { alert("Nama company wajib diisi."); return; }
    if (!form.alamat.trim()) { alert("Alamat Lengkap wajib diisi."); return; }
    setMenyimpan(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: form.isEdit ? "updateCompany" : "addCompany",
          companyName: form.companyName.trim(),
          segmentation: form.segmentation,
          alamat: form.alamat.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "ok") { setModalForm(false); await ambil(); }
      else alert("Gagal: " + (data.message || "coba lagi"));
    } catch (e) { alert("Tidak bisa terhubung ke server."); }
    finally { setMenyimpan(false); }
  }

  const perSegmen = useMemo(
    () => beriWarna(topN(hitungPer(companies, (c) => c.Segmentation || "(tanpa segmen)"), 10)),
    [companies]
  );

  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return companies.filter((c) =>
      !q || String(c.CompanyName).toLowerCase().includes(q)
        || String(c.Segmentation).toLowerCase().includes(q)
        || String(c.Alamat).toLowerCase().includes(q)
    );
  }, [companies, cari]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [cari]);
  const totalHal = Math.max(1, Math.ceil(tampil.length / PER_HAL));
  const paged = tampil.slice((page - 1) * PER_HAL, page * PER_HAL);

  function exportCSV() {
    const header = ["CompanyName", "Segmentation", "Alamat"];
    const rows = tampil.map((c) => [c.CompanyName, c.Segmentation, c.Alamat]);
    unduhCSV(namaFileTanggal("company"), [header, ...rows]);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header active="company" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Data Company</h1>
            <p className="text-sm text-slate-500">Total {companies.length} perusahaan.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} disabled={tampil.length === 0} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50">
              ⬇ Export
            </button>
            <button onClick={() => setModalImport(true)} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap">
              Import CSV
            </button>
            <button onClick={bukaTambah} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 transition whitespace-nowrap">
              + Tambah Company
            </button>
          </div>
        </div>

        {/* Chart */}
        {!loading && companies.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <ChartCard title="Jumlah company per Market Segment"><Donut data={perSegmen} /></ChartCard>
            <ChartCard title="Perbandingan segmen"><BarList data={perSegmen} /></ChartCard>
          </div>
        )}

        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari company / segmen / alamat…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-[#c8962c]"
        />

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada company. Klik <span className="font-semibold">“+ Tambah Company”</span> atau Import CSV.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {/* header tabel */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[#12263a] text-white text-xs font-semibold">
              <div className="flex-1">NAMA COMPANY</div>
              <div className="w-40">SEGMENT</div>
              <div className="flex-1">ALAMAT</div>
              <div className="w-16 text-right">AKSI</div>
            </div>
            {paged.map((c, i) => (
              <div
                key={c.CompanyName}
                className={"flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-4 py-3 " + (i % 2 === 0 ? "bg-white" : "bg-slate-50")}
              >
                <div className="flex-1 font-bold text-[#12263a] uppercase">{c.CompanyName}</div>
                <div className="w-40">
                  {c.Segmentation && <span className="text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1">{c.Segmentation}</span>}
                </div>
                <div className="flex-1 text-sm text-slate-600">{c.Alamat || <span className="text-slate-300">— belum diisi —</span>}</div>
                <div className="w-full sm:w-16 sm:text-right">
                  <button onClick={() => bukaEdit(c)} className="text-xs font-semibold text-[#12263a] border border-slate-300 rounded-md px-3 py-1.5 hover:bg-white">Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && tampil.length > 0 && (
          <Pager page={page} total={totalHal} per={PER_HAL} count={tampil.length} onChange={setPage} />
        )}
      </main>

      {/* Modal tambah/edit */}
      {modalForm && (
        <Modal title={form.isEdit ? "Edit Company" : "Tambah Company"} onClose={() => setModalForm(false)}>
          <div className="space-y-3">
            <Field label="Nama Company *">
              <input
                className={inp + (form.isEdit ? " bg-slate-100 text-slate-500" : "")}
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                readOnly={form.isEdit}
                placeholder="mis. PT Contoh Sejahtera"
              />
              {form.isEdit && <p className="text-xs text-slate-400 mt-1">Nama company tidak bisa diubah (jadi kunci unik).</p>}
            </Field>
            <Field label="Market Segment">
              <select className={inp} value={form.segmentation} onChange={(e) => setForm({ ...form, segmentation: e.target.value })}>
                {SEGMENTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Alamat Lengkap *">
              <textarea
                className={inp + " h-20 resize-none"}
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                placeholder="Jalan, nomor, kelurahan, kota…"
              />
            </Field>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Batal</button>
            <button onClick={simpan} disabled={menyimpan} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">
              {menyimpan ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal import */}
      {modalImport && <DatabaseCompany companies={companies} onClose={() => setModalImport(false)} onImported={ambil} />}

      {modalProfil && (
        <ProfilSaya user={user} onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => { const baru = { ...user, nama }; setUser(baru); localStorage.setItem("crm_user", JSON.stringify(baru)); }} />
      )}
    </div>
  );
}

function DatabaseCompany({ companies, onClose, onImported }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState("");

  function unduhTemplate() {
    const isi = "CompanyName,Segmentation,Alamat\nPT Contoh Sejahtera,Company,Jl. Merdeka No. 1 Cirebon\nDinas Pariwisata Kota,Government,Jl. Siliwangi No. 10 Cirebon\n";
    const blob = new Blob([isi], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-company.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function pilihFile(e) {
    setPesan("");
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length === 0) { setPesan("File kosong / format tidak sesuai template."); setRows(null); return; }
    setRows(parsed);
    setPesan(parsed.length + " baris terbaca. Klik Import untuk menyimpan.");
  }

  async function importData() {
    if (!rows || rows.length === 0) return;
    setBusy(true); setPesan("");
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "importCompanies", rows }),
      });
      const data = await res.json();
      if (data.status === "ok") { setPesan("✓ " + (data.ditambah || 0) + " company baru ditambahkan (duplikat dilewati)."); setRows(null); await onImported(); }
      else setPesan("Gagal: " + (data.message || "coba lagi"));
    } catch (e) { setPesan("Tidak bisa terhubung ke server."); }
    finally { setBusy(false); }
  }

  return (
    <Modal title="Import Database Company" onClose={onClose}>
      <p className="text-sm text-slate-600 mb-3">
        <b>Unduh template</b> dulu, isi kolom <code>CompanyName</code>, <code>Segmentation</code>, <code>Alamat</code>, lalu upload. Nama yang sudah ada otomatis dilewati (tidak dobel).
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <button onClick={unduhTemplate} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg py-2.5 px-4 hover:bg-slate-50">⬇ Unduh Template (CSV)</button>
        <label className="flex-1">
          <span className="block text-sm font-medium mb-1 text-slate-700">Upload file CSV terisi</span>
          <input type="file" accept=".csv,text/csv" onChange={pilihFile} className="text-sm w-full" />
        </label>
      </div>
      {pesan && <p className="text-sm mb-3">{pesan}</p>}
      <button onClick={importData} disabled={busy || !rows} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 px-4 disabled:opacity-60">
        {busy ? "Mengimport…" : "Import"}
      </button>
      <div className="mt-4 text-sm text-slate-500">Company tersimpan saat ini: {companies.length}</div>
    </Modal>
  );
}
