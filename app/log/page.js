"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import { unduhCSV, namaFileTanggal } from "@/components/exportUtil";

const STATUS_STYLE = {
  Tentative: "bg-amber-100 text-amber-800",
  Definite: "bg-emerald-100 text-emerald-800",
  Cancel: "bg-rose-100 text-rose-700",
};
function badge(s) {
  if (!s || s === "-") return "bg-slate-100 text-slate-500";
  return STATUS_STYLE[s] || "bg-slate-100 text-slate-700";
}

export default function LogPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
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
      const r = await fetch("/api/log", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setList(r.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return list.filter((x) =>
      !q || [x.Nama, x.Oleh, x.StatusLama, x.StatusBaru, x.AlasanCancel].join(" ").toLowerCase().includes(q)
    );
  }, [list, cari]);

  function exportCSV() {
    const header = ["Waktu", "Lead", "Status Lama", "Status Baru", "Alasan Cancel", "Oleh"];
    const rows = tampil.map((x) => [x.Waktu, x.Nama, x.StatusLama, x.StatusBaru, x.AlasanCancel, x.Oleh]);
    unduhCSV(namaFileTanggal("log-perubahan"), [header, ...rows]);
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
              <a href="/aktivitas" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition whitespace-nowrap">Activity</a>
              <a href="/company" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition whitespace-nowrap">Company</a>
              <a href="/log" className="px-3 py-1.5 rounded-lg bg-white/15 font-semibold whitespace-nowrap">Log</a>
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
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Log Perubahan Status</h1>
            <p className="text-sm text-slate-500">Riwayat perubahan status lead — {list.length} catatan.</p>
          </div>
          <button onClick={exportCSV} disabled={tampil.length === 0} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap disabled:opacity-50">
            ⬇ Export
          </button>
        </div>

        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama lead / oleh / status…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-[#c8962c]"
        />

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada catatan perubahan status.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-[#12263a] text-white text-xs font-semibold">
              <div className="w-32">WAKTU</div>
              <div className="flex-1">LEAD</div>
              <div className="w-56">PERUBAHAN</div>
              <div className="w-32">OLEH</div>
            </div>
            {tampil.map((x, i) => (
              <div key={i} className={"flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-4 py-3 " + (i % 2 === 0 ? "bg-white" : "bg-slate-50")}>
                <div className="w-32 text-xs text-slate-500">{x.Waktu}</div>
                <div className="flex-1 font-medium text-[#12263a]">{x.Nama || "-"}</div>
                <div className="w-56 flex items-center gap-2 text-xs">
                  <span className={"px-2 py-0.5 rounded-full " + badge(x.StatusLama)}>{x.StatusLama || "-"}</span>
                  <span className="text-slate-400">→</span>
                  <span className={"px-2 py-0.5 rounded-full font-semibold " + badge(x.StatusBaru)}>{x.StatusBaru || "-"}</span>
                </div>
                <div className="w-32 text-sm text-slate-600">{x.Oleh || "-"}</div>
                {x.StatusBaru === "Cancel" && x.AlasanCancel && (
                  <div className="w-full text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1 sm:ml-0">
                    Alasan: {x.AlasanCancel}
                  </div>
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
