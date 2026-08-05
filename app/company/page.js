"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import { Donut, BarList, ChartCard, hitungPer, beriWarna } from "@/components/Charts";

export default function CompanyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [modalProfil, setModalProfil] = useState(false);

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

  const perSegmen = useMemo(
    () => beriWarna(hitungPer(companies, (c) => c.Segmentation || "(tanpa segmen)")),
    [companies]
  );

  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return [...companies]
      .sort((a, b) => String(a.CompanyName).localeCompare(String(b.CompanyName)))
      .filter((c) => !q || String(c.CompanyName).toLowerCase().includes(q) || String(c.Segmentation).toLowerCase().includes(q));
  }, [companies, cari]);

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
              <a href="/aktivitas" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition">Activity</a>
              <a href="/company" className="px-3 py-1.5 rounded-lg bg-white/15 font-semibold">Company</a>
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
        <div className="mb-4">
          <h1 className="text-xl font-extrabold text-[#12263a]">Data Company</h1>
          <p className="text-sm text-slate-500">Total {companies.length} perusahaan. Data dikelola dari menu Activity (Database Company).</p>
        </div>

        {/* Chart */}
        <div className="grid md:grid-cols-2 gap-3 mb-5">
          <ChartCard title="Jumlah company per Market Segment">
            <Donut data={perSegmen} />
          </ChartCard>
          <ChartCard title="Perbandingan segmen">
            <BarList data={perSegmen} />
          </ChartCard>
        </div>

        {/* Cari */}
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari company / segmen…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-[#c8962c]"
        />

        {/* Daftar */}
        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada company. Tambah lewat menu <span className="font-semibold">Activity → Database Company</span>.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {tampil.map((c) => (
              <div key={c.CompanyName} className="p-3 flex items-center justify-between gap-2">
                <span className="font-medium text-[#12263a] truncate">{c.CompanyName}</span>
                {c.Segmentation && (
                  <span className="text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1 shrink-0">{c.Segmentation}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {modalProfil && (
        <ProfilSaya user={user} onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => { const baru = { ...user, nama }; setUser(baru); localStorage.setItem("crm_user", JSON.stringify(baru)); }} />
      )}
    </div>
  );
}
