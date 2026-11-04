"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import Header from "@/components/Header";
import DateRange, { dalamRentang } from "@/components/DateRange";
import { STATUS_GEO, WARNA_STATUS, labelStatus, parseGeoRow } from "@/lib/geoApproval";
import { hitungSp, normalisasiSp, rp } from "@/lib/geoMemo";
import { buatMemo } from "@/lib/geoMemoPdf";

// Bentuk data GEO untuk perhitungan memo (kolom lama tanpa sp tetap aman)
const dataGeo = (info) => ({ ...info.data, sp: normalisasiSp(info.data?.sp) });

export default function SpecialInquiryPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [karyawan, setKaryawan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProfil, setModalProfil] = useState(false);
  const [cari, setCari] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  const ambil = useCallback(async (diam) => {
    if (!diam) setLoading(true);
    try {
      const r = await fetch("/api/geo", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setList(r.data || []);
    } catch (e) {} finally { if (!diam) setLoading(false); }
    try {
      const k = await fetch("/api/karyawan", { cache: "no-store" }).then((x) => x.json());
      if (k.status === "ok") setKaryawan(k.data || []);
    } catch (e) {}
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  // Hanya GEO yang ditandai Special Inquiry
  const semua = useMemo(() => list.map((row) => ({ row, info: parseGeoRow(row) })).filter((x) => x.info.data?.sp?.aktif), [list]);

  const tampil = useMemo(() => {
    const q = cari.toLowerCase().trim();
    return semua.filter(({ row, info }) => {
      if (fStatus && info.status !== fStatus) return false;
      const tgl = String(info.data.issuedDate || row.CreatedAt || "").slice(0, 10);
      if ((dari || sampai) && !dalamRentang(tgl, dari, sampai)) return false;
      if (q) {
        const teks = [row.GeoNo, row.EventTitle, row.Company, info.data.salesPerson, info.data.sp?.memoNo].join(" ").toLowerCase();
        if (!teks.includes(q)) return false;
      }
      return true;
    });
  }, [semua, cari, fStatus, dari, sampai]);

  const totalNett = useMemo(() => tampil.reduce((t, { info }) => t + hitungSp(dataGeo(info)).nett, 0), [tampil]);

  async function unduhMemo(row, info) {
    setBusy(row.ID);
    try {
      await buatMemo({ geoId: row.ID, g: dataGeo(info), approvals: info.approvals, karyawan, email: user?.email || "" });
      await ambil(true);
    } catch (e) { alert(e?.message || "Gagal membuat memo."); } finally { setBusy(""); }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen md:pl-60">
      <Header active="specialinquiry" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="mb-4">
          <h1 className="text-xl font-extrabold text-[#12263a]">Event With Special Inquiry</h1>
          <p className="text-sm text-slate-500">Daftar GEO yang ditandai Special Inquiry (Discount Allowance). Buat atau unduh Interoffice Memo dari sini. Untuk mengubah isinya, buka GEO terkait.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-4">
          <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari no. GEO, event, company, sales, no. memo…"
            className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]" />
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value="">Semua Status</option>
            {Object.keys(STATUS_GEO).map((k) => <option key={k} value={k}>{STATUS_GEO[k]}</option>)}
          </select>
          <DateRange dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
        </div>

        {!loading && semua.length > 0 && (
          <div className="text-xs text-slate-500 mb-3">
            Menampilkan {tampil.length} dari {semua.length} event · Total Nett DA (tampilan ini): <b className="text-amber-700">Rp {rp(totalNett)}</b>
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : semua.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">
            Belum ada GEO Special Inquiry. Di form GEO, centang <b>Special Inquiry</b> pada bagian breakdown harga kamar.
          </div>
        ) : tampil.length === 0 ? (
          <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">Tidak ada yang cocok dengan filter.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tampil.map(({ row, info }) => {
              const h = hitungSp(dataGeo(info));
              const d = info.data;
              return (
                <div key={row.ID} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-[#12263a] break-all">{row.GeoNo || "(tanpa nomor)"}</div>
                    <span className={"inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 " + (WARNA_STATUS[info.status] || WARNA_STATUS.draft)}>{labelStatus(info.status)}</span>
                  </div>
                  <div className="text-sm text-slate-600">{row.EventTitle || "-"}</div>
                  <div className="text-xs text-slate-400">{row.Company || ""}{d.checkIn ? " · " + d.checkIn + (d.checkOut ? " → " + d.checkOut : "") : ""}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {d.salesPerson && <span className="inline-block bg-slate-100 rounded px-1.5 py-0.5 mr-1">👤 {d.salesPerson}</span>}
                    {d.sp?.memoNo
                      ? <span className="inline-block bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 font-semibold">{d.sp.memoNo}</span>
                      : <span className="inline-block bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">Memo belum dibuat</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-slate-50 rounded-lg py-1.5"><div className="text-[10px] text-slate-500">SENTEC</div><div className="text-xs font-semibold">{rp(h.sentecTotal)}</div></div>
                    <div className="bg-slate-50 rounded-lg py-1.5"><div className="text-[10px] text-slate-500">ACTUAL</div><div className="text-xs font-semibold">{rp(h.actualTotal)}</div></div>
                    <div className="bg-amber-50 rounded-lg py-1.5"><div className="text-[10px] text-amber-700">Nett DA ({h.persen.toFixed(2)}%)</div><div className="text-xs font-bold text-amber-800">{rp(h.nett)}</div></div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={() => unduhMemo(row, info)} disabled={busy === row.ID} className="text-xs font-semibold bg-[#c8962c] text-white rounded-md px-3 py-1.5 disabled:opacity-60">
                      {busy === row.ID ? "Membuat…" : d.sp?.memoNo ? "📄 Unduh Memo" : "📄 Buat Memo"}
                    </button>
                    <a href={"/geo?id=" + encodeURIComponent(row.ID)} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Buka GEO</a>
                  </div>
                </div>
              );
            })}
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
