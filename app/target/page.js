"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ProfilSaya from "@/components/ProfilSaya";
import { Modal, Field, inp } from "@/components/Modal";
import { unduhCSV } from "@/components/exportUtil";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const ALL = "__ALL__";
const angka = (n) => Number(String(n ?? "").replace(/[^\d]/g, "")) || 0;
const rp = (n) => "Rp " + angka(n).toLocaleString("id-ID");
const rpK = (n) => { n = angka(n); return n >= 1e9 ? "Rp " + (n / 1e9).toFixed(1) + " M" : n >= 1e6 ? "Rp " + (n / 1e6).toFixed(0) + " jt" : "Rp " + n.toLocaleString("id-ID"); };
const pct = (r, t) => (angka(t) > 0 ? Math.round((angka(r) / angka(t)) * 100) : 0);
const bulanDari = (tgl) => { const d = new Date(tgl); return isNaN(d) ? null : d.getMonth(); };
const tahunDari = (tgl) => { const d = new Date(tgl); return isNaN(d) ? null : d.getFullYear(); };
function hariKerja(tahun, bulan1) { // Senin–Jumat
  let n = 0; const hari = new Date(tahun, bulan1, 0).getDate();
  for (let d = 1; d <= hari; d++) { const w = new Date(tahun, bulan1 - 1, d).getDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}

// Chart batang bulanan (Target vs Realisasi)
function BarBulan({ target, real, format }) {
  const max = Math.max(1, ...target, ...real);
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 min-w-[560px] h-40 px-1">
        {BULAN.map((b, i) => (
          <div key={b} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-0.5 h-32 w-full justify-center">
              <div className="w-2.5 rounded-t bg-slate-300" style={{ height: (target[i] / max) * 100 + "%" }} title={"Target: " + format(target[i])} />
              <div className="w-2.5 rounded-t bg-[#12263a]" style={{ height: (real[i] / max) * 100 + "%" }} title={"Realisasi: " + format(real[i])} />
            </div>
            <span className="text-[10px] text-slate-500">{b}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-slate-500 mt-2 px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-300 inline-block" /> Target</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#12263a] inline-block" /> Realisasi</span>
      </div>
    </div>
  );
}

export default function TargetPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [modalProfil, setModalProfil] = useState(false);
  const [targets, setTargets] = useState([]);
  const [leads, setLeads] = useState([]);
  const [akt, setAkt] = useState([]);
  const [karyawan, setKaryawan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalKelola, setModalKelola] = useState(false);

  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [sales, setSales] = useState(ALL);
  const [bulanFilter, setBulanFilter] = useState(0); // 0 = setahun, 1-12 = bulan tertentu

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    const u = JSON.parse(raw); setUser(u);
    if (u.role !== "admin") setSales(u.nama || ALL);
  }, [router]);

  const isAdmin = user?.role === "admin";

  const ambil = useCallback(async () => {
    setLoading(true);
    try {
      const [t, l, a, k] = await Promise.all([
        fetch("/api/target", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/leads", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/aktivitas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/karyawan", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (t.status === "ok") setTargets(t.data || []);
      if (l.status === "ok") setLeads(l.data || []);
      if (a.status === "ok") setAkt(a.data || []);
      if (k.status === "ok") setKaryawan(k.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  const salesList = useMemo(() => {
    const s = new Set();
    karyawan.forEach((k) => { if (String(k.Role) === "marketing" && k.Nama) s.add(k.Nama); });
    leads.forEach((l) => { if (l.PIC) s.add(l.PIC); });
    return Array.from(s).sort();
  }, [karyawan, leads]);

  const tahunList = useMemo(() => {
    const s = new Set([now.getFullYear()]);
    leads.forEach((l) => { const y = tahunDari(l.TanggalEvent || l.Tanggal); if (y) s.add(y); });
    targets.forEach((t) => s.add(Number(t.Tahun)));
    return Array.from(s).sort((a, b) => b - a);
  }, [leads, targets]);

  // Hitung 12 bulan
  const data = useMemo(() => {
    const tRoom = Array(12).fill(0), tBanq = Array(12).fill(0), tKunj = Array(12).fill(0);
    const rRoom = Array(12).fill(0), rBanq = Array(12).fill(0), rKunj = Array(12).fill(0);
    targets.forEach((t) => {
      if (Number(t.Tahun) !== Number(tahun)) return;
      if (sales !== ALL && t.SalesName !== sales) return;
      const m = Number(t.Bulan) - 1; if (m < 0 || m > 11) return;
      tRoom[m] += angka(t.TargetRoom); tBanq[m] += angka(t.TargetBanquet); tKunj[m] += angka(t.TargetKunjungan);
    });
    leads.forEach((l) => {
      if ((l.Status || "") !== "Definite") return;
      if (sales !== ALL && l.PIC !== sales) return;
      const tgl = l.TanggalEvent || l.Tanggal;
      if (tahunDari(tgl) !== Number(tahun)) return;
      const m = bulanDari(tgl); if (m === null) return;
      rRoom[m] += angka(l.RevenueRoom); rBanq[m] += angka(l.EstimasiNilai);
    });
    akt.forEach((a) => {
      if (sales !== ALL && a.SalesName !== sales) return;
      if (tahunDari(a.Date) !== Number(tahun)) return;
      const m = bulanDari(a.Date); if (m === null) return;
      rKunj[m] += 1;
    });
    const tKunjBulan = tKunj.map((d, i) => d * hariKerja(Number(tahun), i + 1));
    return { tRoom, tBanq, tKunj, tKunjBulan, rRoom, rBanq, rKunj };
  }, [targets, leads, akt, tahun, sales]);

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const tRevTot = data.tRoom.map((_, i) => data.tRoom[i] + data.tBanq[i]);
  const rRevTot = data.rRoom.map((_, i) => data.rRoom[i] + data.rBanq[i]);
  const annTarget = sum(tRevTot), ytdReal = sum(rRevTot);

  // Filter periode: 0 = semua bulan, else index bulan tertentu
  const idxTampil = bulanFilter ? [bulanFilter - 1] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const showTotal = bulanFilter === 0;
  const jum = (arr) => idxTampil.reduce((a, i) => a + arr[i], 0); // total sesuai periode
  const periodeLabel = bulanFilter ? BULAN_PANJANG[bulanFilter - 1] + " " + tahun : "Tahun " + tahun;
  const pTargetRev = jum(tRevTot), pRealRev = jum(rRevTot);
  const pTargetKunj = jum(data.tKunjBulan), pRealKunj = jum(data.rKunj);

  async function exportRev() {
    const rows = idxTampil.map((i) => ({
      Bulan: BULAN_PANJANG[i], "Target Room": data.tRoom[i], "Target Banquet": data.tBanq[i], "Target Total": tRevTot[i],
      "Realisasi Room": data.rRoom[i], "Realisasi Banquet": data.rBanq[i], "Realisasi Total": rRevTot[i], "Pencapaian %": pct(rRevTot[i], tRevTot[i]),
    }));
    unduhCSV("pencapaian-revenue-" + tahun + (bulanFilter ? "-" + BULAN[bulanFilter - 1] : "") + (sales !== ALL ? "-" + sales : ""), rows);
  }
  async function exportAct() {
    const rows = idxTampil.map((i) => ({
      Bulan: BULAN_PANJANG[i], "Target Harian": data.tKunj[i], "Target Bulan": data.tKunjBulan[i],
      "Realisasi Kunjungan": data.rKunj[i], "Pencapaian %": pct(data.rKunj[i], data.tKunjBulan[i]),
    }));
    unduhCSV("activity-vs-target-" + tahun + (bulanFilter ? "-" + BULAN[bulanFilter - 1] : "") + (sales !== ALL ? "-" + sales : ""), rows);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header active="target" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Target &amp; Pencapaian Sales</h1>
            <p className="text-sm text-slate-500">Target bulanan Room &amp; Banquet, kunjungan, dan tracing tahunan.</p>
          </div>
          {isAdmin && <button onClick={() => setModalKelola(true)} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap">Kelola Target</button>}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            {tahunList.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={sales} onChange={(e) => setSales(e.target.value)} disabled={!isAdmin} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white disabled:bg-slate-100">
            {isAdmin && <option value={ALL}>Semua Sales</option>}
            {salesList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={bulanFilter} onChange={(e) => setBulanFilter(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
            <option value={0}>Setahun (semua bulan)</option>
            {BULAN_PANJANG.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-16">Memuat data…</div>
        ) : (
          <>
            {/* Ringkasan */}
            <div className="text-sm text-slate-500 mb-2">Periode: <b className="text-[#12263a]">{periodeLabel}</b>{sales !== ALL ? " · " + sales : ""}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <Kartu label={bulanFilter ? "Target Bulan" : "Target Tahunan"} nilai={rpK(pTargetRev)} />
              <Kartu label={bulanFilter ? "Realisasi" : "Realisasi YTD"} nilai={rpK(pRealRev)} emas />
              <Kartu label="Pencapaian" nilai={pct(pRealRev, pTargetRev) + "%"} />
              <Kartu label="Kunjungan" nilai={pRealKunj + " / " + pTargetKunj} />
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#12263a]">Pencapaian Revenue (Target vs Realisasi)</h2>
                <button onClick={exportRev} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Export CSV</button>
              </div>
              <BarBulan target={tRevTot} real={rRevTot} format={rpK} />
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="border border-slate-200 p-2 text-left">Bulan</th>
                      <th className="border border-slate-200 p-2">Target Room</th><th className="border border-slate-200 p-2">Target Banquet</th>
                      <th className="border border-slate-200 p-2">Real. Room</th><th className="border border-slate-200 p-2">Real. Banquet</th>
                      <th className="border border-slate-200 p-2">Total Real.</th><th className="border border-slate-200 p-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idxTampil.map((i) => {
                      const b = BULAN[i];
                      const p = pct(rRevTot[i], tRevTot[i]);
                      return (
                        <tr key={b} className={i === now.getMonth() && Number(tahun) === now.getFullYear() ? "bg-amber-50" : ""}>
                          <td className="border border-slate-200 p-2 font-medium">{b}</td>
                          <td className="border border-slate-200 p-2 text-right">{rpK(data.tRoom[i])}</td>
                          <td className="border border-slate-200 p-2 text-right">{rpK(data.tBanq[i])}</td>
                          <td className="border border-slate-200 p-2 text-right">{rpK(data.rRoom[i])}</td>
                          <td className="border border-slate-200 p-2 text-right">{rpK(data.rBanq[i])}</td>
                          <td className="border border-slate-200 p-2 text-right font-semibold">{rpK(rRevTot[i])}</td>
                          <td className={"border border-slate-200 p-2 text-center font-semibold " + (p >= 100 ? "text-emerald-600" : p >= 60 ? "text-amber-600" : "text-slate-500")}>{p}%</td>
                        </tr>
                      );
                    })}
                    {showTotal && (
                      <tr className="bg-[#12263a] text-white font-bold">
                        <td className="border border-slate-600 p-2">TAHUNAN</td>
                        <td className="border border-slate-600 p-2 text-right">{rpK(sum(data.tRoom))}</td>
                        <td className="border border-slate-600 p-2 text-right">{rpK(sum(data.tBanq))}</td>
                        <td className="border border-slate-600 p-2 text-right">{rpK(sum(data.rRoom))}</td>
                        <td className="border border-slate-600 p-2 text-right">{rpK(sum(data.rBanq))}</td>
                        <td className="border border-slate-600 p-2 text-right">{rpK(ytdReal)}</td>
                        <td className="border border-slate-600 p-2 text-center">{pct(ytdReal, annTarget)}%</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity vs target kunjungan */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#12263a]">Activity Record vs Target Kunjungan</h2>
                <button onClick={exportAct} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Export CSV</button>
              </div>
              <BarBulan target={data.tKunjBulan} real={data.rKunj} format={(n) => String(Math.round(n))} />
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs border-collapse min-w-[420px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="border border-slate-200 p-2 text-left">Bulan</th>
                      <th className="border border-slate-200 p-2">Target Harian</th>
                      <th className="border border-slate-200 p-2">Target Bulan</th>
                      <th className="border border-slate-200 p-2">Realisasi</th>
                      <th className="border border-slate-200 p-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idxTampil.map((i) => {
                      const b = BULAN[i];
                      const p = pct(data.rKunj[i], data.tKunjBulan[i]);
                      return (
                        <tr key={b} className={i === now.getMonth() && Number(tahun) === now.getFullYear() ? "bg-amber-50" : ""}>
                          <td className="border border-slate-200 p-2 font-medium">{b}</td>
                          <td className="border border-slate-200 p-2 text-center">{data.tKunj[i] || "-"}</td>
                          <td className="border border-slate-200 p-2 text-center">{data.tKunjBulan[i] || "-"}</td>
                          <td className="border border-slate-200 p-2 text-center font-semibold">{data.rKunj[i]}</td>
                          <td className={"border border-slate-200 p-2 text-center font-semibold " + (p >= 100 ? "text-emerald-600" : p >= 60 ? "text-amber-600" : "text-slate-500")}>{p}%</td>
                        </tr>
                      );
                    })}
                    {showTotal && (
                      <tr className="bg-[#12263a] text-white font-bold">
                        <td className="border border-slate-600 p-2">TAHUNAN</td>
                        <td className="border border-slate-600 p-2 text-center">-</td>
                        <td className="border border-slate-600 p-2 text-center">{sum(data.tKunjBulan)}</td>
                        <td className="border border-slate-600 p-2 text-center">{sum(data.rKunj)}</td>
                        <td className="border border-slate-600 p-2 text-center">{pct(sum(data.rKunj), sum(data.tKunjBulan))}%</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-2">Target bulan = target kunjungan harian × jumlah hari kerja (Senin–Jumat).</p>
            </div>
          </>
        )}
      </main>

      {modalKelola && <KelolaTarget salesList={salesList} tahun={tahun} onClose={() => setModalKelola(false)} onSaved={ambil} existing={targets} />}
      {modalProfil && (
        <ProfilSaya user={user} onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => { const baru = { ...user, nama }; setUser(baru); localStorage.setItem("crm_user", JSON.stringify(baru)); }} />
      )}
    </div>
  );
}

function Kartu({ label, nilai, emas }) {
  return (
    <div className={"rounded-2xl border p-4 " + (emas ? "border-[#e7d3a1] bg-[#fdf6e9]" : "border-slate-200 bg-white")}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={"text-lg font-extrabold mt-1 " + (emas ? "text-[#a9781f]" : "text-[#12263a]")}>{nilai}</div>
    </div>
  );
}

function KelolaTarget({ salesList, tahun, onClose, onSaved, existing }) {
  const now = new Date();
  const [f, setF] = useState({ salesName: salesList[0] || "", tahun: tahun, bulan: now.getMonth() + 1, targetRoom: "", targetBanquet: "", targetKunjungan: "" });
  const [saving, setSaving] = useState(false);
  const [pesan, setPesan] = useState("");

  // Prefill jika sudah ada
  useEffect(() => {
    const ada = existing.find((t) => t.SalesName === f.salesName && Number(t.Tahun) === Number(f.tahun) && Number(t.Bulan) === Number(f.bulan));
    setF((s) => ({ ...s, targetRoom: ada ? String(ada.TargetRoom || "") : "", targetBanquet: ada ? String(ada.TargetBanquet || "") : "", targetKunjungan: ada ? String(ada.TargetKunjungan || "") : "" }));
  }, [f.salesName, f.tahun, f.bulan]); // eslint-disable-line

  async function simpan() {
    if (!f.salesName) { setPesan("Pilih sales dulu."); return; }
    setSaving(true); setPesan("");
    try {
      const res = await fetch("/api/target", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setTarget", ...f, targetRoom: (f.targetRoom || "0").replace(/[^\d]/g, ""), targetBanquet: (f.targetBanquet || "0").replace(/[^\d]/g, ""), targetKunjungan: (f.targetKunjungan || "0").replace(/[^\d]/g, "") }) });
      const d = await res.json();
      if (d.status === "ok") { setPesan("✓ Target tersimpan."); onSaved(); } else setPesan("Gagal: " + (d.message || ""));
    } catch (e) { setPesan("Tidak bisa terhubung ke server."); } finally { setSaving(false); }
  }

  const B = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return (
    <Modal title="Kelola Target Sales (per bulan)" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Sales">
            <select className={inp} value={f.salesName} onChange={(e) => setF({ ...f, salesName: e.target.value })}>
              {salesList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Tahun"><input className={inp} inputMode="numeric" value={f.tahun} onChange={(e) => setF({ ...f, tahun: e.target.value.replace(/[^\d]/g, "") })} /></Field>
          <Field label="Bulan">
            <select className={inp} value={f.bulan} onChange={(e) => setF({ ...f, bulan: Number(e.target.value) })}>
              {B.slice(1).map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Target Room (Rp)"><input className={inp} inputMode="numeric" value={f.targetRoom ? angka(f.targetRoom).toLocaleString("id-ID") : ""} onChange={(e) => setF({ ...f, targetRoom: e.target.value.replace(/[^\d]/g, "") })} placeholder="mis. 100.000.000" /></Field>
        <Field label="Target Banquet (Rp)"><input className={inp} inputMode="numeric" value={f.targetBanquet ? angka(f.targetBanquet).toLocaleString("id-ID") : ""} onChange={(e) => setF({ ...f, targetBanquet: e.target.value.replace(/[^\d]/g, "") })} placeholder="mis. 150.000.000" /></Field>
        <Field label="Target Kunjungan / Hari"><input className={inp} inputMode="numeric" value={f.targetKunjungan} onChange={(e) => setF({ ...f, targetKunjungan: e.target.value.replace(/[^\d]/g, "") })} placeholder="mis. 4" /></Field>
        {pesan && <div className="text-sm text-slate-600">{pesan}</div>}
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Tutup</button>
        <button onClick={simpan} disabled={saving} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{saving ? "Menyimpan…" : "Simpan Target"}</button>
      </div>
    </Modal>
  );
}
