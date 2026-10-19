"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import Header from "@/components/Header";
import { Modal, Field, inp } from "@/components/Modal";
import { isAdmin } from "@/lib/akses";
import { resetCacheRuangan } from "@/lib/ruangan";

const KOSONG = () => ({
  id: "", nama: "", lantai: "", dimensi: "", cap_theater: "", cap_class: "", cap_round: "", cap_ushape: "", cap_hollow: "",
  fasilitas: "", deskripsi: "", foto: "", fotoBase64: "", fotoNama: "", tampil_publik: false, booking_langsung: false, urutan: 0, aktif: true,
  per_jam: "", half_day: "", full_day: "", weekend_pct: "", catatan_harga: "belum termasuk pajak & F&B",
});
const rp = (n) => (n ? "Rp " + Number(n).toLocaleString("id-ID") : "-");
const parseFas = (s) => { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return String(s || "").split(",").map((x) => x.trim()).filter(Boolean); } };

function fileKeBase64(file) {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
}
async function kompresFoto(file, maxDim = 1600, quality = 0.75) {
  try {
    const dataUrl = await fileKeBase64(file);
    if (!String(file.type).startsWith("image/")) return dataUrl;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    let w = img.width, h = img.height;
    if (w > maxDim || h > maxDim) { const r = Math.min(maxDim / w, maxDim / h); w = Math.round(w * r); h = Math.round(h * r); }
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", quality);
  } catch { return await fileKeBase64(file); }
}

export default function RuangHargaPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("ruang"); // ruang | pengaturan
  const [rooms, setRooms] = useState([]);
  const [setting, setSetting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProfil, setModalProfil] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const [f, setF] = useState(KOSONG());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    const u = JSON.parse(raw);
    if (!isAdmin(u)) { router.replace("/dashboard"); return; }
    setUser(u);
  }, [router]);

  const ambil = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        fetch("/api/rooms", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/pengaturan", { cache: "no-store" }).then((x) => x.json()),
      ]);
      if (r.status === "ok") setRooms(r.data || []);
      if (p.status === "ok") setSetting(p.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  function bukaBaru() { setF({ ...KOSONG(), urutan: rooms.length + 1 }); setModalForm(true); }
  function bukaEdit(r) {
    setF({
      ...KOSONG(), id: r.id, nama: r.nama || "", lantai: r.lantai || "", dimensi: r.dimensi || "",
      cap_theater: r.cap_theater ?? "", cap_class: r.cap_class ?? "", cap_round: r.cap_round ?? "", cap_ushape: r.cap_ushape ?? "", cap_hollow: r.cap_hollow ?? "",
      fasilitas: parseFas(r.fasilitas).join(", "), deskripsi: r.deskripsi || "", foto: r.foto || "",
      tampil_publik: !!r.tampil_publik, booking_langsung: !!r.booking_langsung, urutan: r.urutan ?? 0, aktif: r.aktif !== false,
      per_jam: r.per_jam ?? "", half_day: r.half_day ?? "", full_day: r.full_day ?? "", weekend_pct: r.weekend_pct ?? "", catatan_harga: r.catatan_harga || "belum termasuk pajak & F&B",
    });
    setModalForm(true);
  }
  async function pilihFoto(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setF((x) => ({ ...x, fotoNama: "memproses foto…" }));
    const base64 = await kompresFoto(file);
    setF((x) => ({ ...x, fotoBase64: base64, fotoNama: file.name }));
  }

  async function simpan() {
    if (!f.nama.trim()) { alert("Nama ruangan wajib diisi."); return; }
    if (f.booking_langsung && !f.per_jam && !f.half_day && !f.full_day) { alert("Ruangan 'Booking langsung' harus punya harga (per jam / half day / full day)."); return; }
    setSaving(true);
    try {
      const body = { action: "simpan", ...f, fasilitas: f.fasilitas.split(",").map((x) => x.trim()).filter(Boolean), oleh: user?.nama || user?.email || "" };
      const d = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
      if (d.status === "ok") { setModalForm(false); resetCacheRuangan(); await ambil(); } else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setSaving(false); }
  }
  async function hapus(r) {
    if (!confirm(`Hapus ruangan ${r.nama}? Booking lama tetap tersimpan, tapi ruangan tidak bisa dipilih lagi.\n\nSaran: lebih aman matikan "Aktif" daripada menghapus.`)) return;
    const d = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hapus", id: r.id }) }).then((x) => x.json());
    if (d.status === "ok") { resetCacheRuangan(); await ambil(); } else alert("Gagal: " + (d.message || ""));
  }

  async function simpanPengaturan() {
    setSaving(true);
    try {
      const d = await fetch("/api/pengaturan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "simpan", items: setting.map((s) => ({ kode: s.kode, nilai: s.nilai })), oleh: user?.nama || user?.email || "" }) }).then((x) => x.json());
      if (d.status === "ok") { alert("Pengaturan tersimpan."); await ambil(); } else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setSaving(false); }
  }

  if (!user) return null;
  const cb = (k) => (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="w-4 h-4 accent-[#12263a]" />
      {{ tampil_publik: "Tampilkan di situs publik", booking_langsung: "Booking langsung (tampilkan harga)", aktif: "Aktif" }[k]}
    </label>
  );

  return (
    <div className="min-h-screen md:pl-60">
      <Header active="ruang" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />
      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Ruang &amp; Harga</h1>
            <p className="text-sm text-slate-500">Master ruangan meeting, harga publik, dan pengaturan asisten Ucup.</p>
          </div>
          {tab === "ruang" && <button onClick={bukaBaru} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap">+ Ruangan</button>}
        </div>

        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("ruang")} className={"px-4 py-1.5 rounded-md text-sm font-semibold " + (tab === "ruang" ? "bg-white shadow text-[#12263a]" : "text-slate-500")}>Ruangan</button>
          <button onClick={() => setTab("pengaturan")} className={"px-4 py-1.5 rounded-md text-sm font-semibold " + (tab === "pengaturan" ? "bg-white shadow text-[#12263a]" : "text-slate-500")}>Pengaturan Ucup</button>
        </div>

        {loading ? <div className="text-center text-slate-500 py-16">Memuat data…</div> : tab === "ruang" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <div key={r.id} className={"bg-white rounded-xl border p-4 " + (r.aktif === false ? "border-slate-200 opacity-60" : r.booking_langsung ? "border-[#c8962c]" : "border-slate-200")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-[#12263a] truncate">{r.urutan}. {r.nama}</div>
                    <div className="text-xs text-slate-400">{r.lantai || "-"} · {r.dimensi || "-"}</div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {r.aktif === false && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Nonaktif</span>}
                    {r.tampil_publik && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">Ucup</span>}
                    {r.booking_langsung && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Booking langsung</span>}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-2">Theater {r.cap_theater ?? "-"} · Class {r.cap_class ?? "-"} · Round {r.cap_round ?? "-"} · U {r.cap_ushape ?? "-"} · Hollow {r.cap_hollow ?? "-"}</div>
                {(r.per_jam || r.half_day || r.full_day) && (
                  <div className="text-xs text-slate-600 mt-1">💰 {r.per_jam ? rp(r.per_jam) + "/jam" : ""}{r.half_day ? " · Half day " + rp(r.half_day) : ""}{r.full_day ? " · Full day " + rp(r.full_day) : ""}{r.weekend_pct ? " · Weekend +" + r.weekend_pct + "%" : ""}</div>
                )}
                {r.foto && <div className="text-[11px] text-emerald-700 mt-1">📷 ada foto</div>}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => bukaEdit(r)} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Edit</button>
                  <button onClick={() => hapus(r)} className="text-xs font-semibold border border-slate-300 text-slate-500 rounded-md px-3 py-1.5 hover:bg-slate-50">Hapus</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-2xl">
            <div className="space-y-3">
              {setting.map((s, i) => (
                <Field key={s.kode} label={s.keterangan || s.kode}>
                  {s.kode === "ucup_aktif" ? (
                    <select className={inp} value={s.nilai} onChange={(e) => setSetting(setting.map((x, j) => (j === i ? { ...x, nilai: e.target.value } : x)))}>
                      <option value="true">Aktif — Ucup menerima booking</option>
                      <option value="false">Nonaktif — situs Ucup ditutup sementara</option>
                    </select>
                  ) : s.kode === "ucup_llm" ? (
                    <select className={inp} value={s.nilai} onChange={(e) => setSetting(setting.map((x, j) => (j === i ? { ...x, nilai: e.target.value } : x)))}>
                      <option value="true">Aktif — percakapan pakai AI (Gemini)</option>
                      <option value="false">Nonaktif — alur tombol statis saja</option>
                    </select>
                  ) : s.kode === "ucup_faq" ? (
                    <textarea className={inp} rows={6} value={s.nilai || ""} onChange={(e) => setSetting(setting.map((x, j) => (j === i ? { ...x, nilai: e.target.value } : x)))} placeholder={"Parkir? | Parkir gratis di basement hotel\nPembayaran? | DP 50% setelah konfirmasi sales, pelunasan H-3\nAlamat? | Jl. Brigjen Dharsono No. 12C, Cirebon"} />
                  ) : (
                    <input className={inp} value={s.nilai || ""} onChange={(e) => setSetting(setting.map((x, j) => (j === i ? { ...x, nilai: e.target.value } : x)))} />
                  )}
                  <span className="text-[11px] text-slate-400">kode: {s.kode}{s.updated_at ? " · diubah " + s.updated_at + (s.updated_by ? " oleh " + s.updated_by : "") : ""}</span>
                </Field>
              ))}
            </div>
            <button onClick={simpanPengaturan} disabled={saving} className="mt-4 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50">{saving ? "Menyimpan…" : "Simpan Pengaturan"}</button>
          </div>
        )}
      </main>

      {modalForm && (
        <Modal title={f.id ? "Edit Ruangan" : "Ruangan Baru"} onClose={() => setModalForm(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Field label="Nama ruangan"><input className={inp} value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></Field></div>
              <Field label="Urutan"><input className={inp} inputMode="numeric" value={f.urutan} onChange={(e) => setF({ ...f, urutan: e.target.value.replace(/[^\d]/g, "") })} /></Field>
              <Field label="Lantai"><input className={inp} value={f.lantai} onChange={(e) => setF({ ...f, lantai: e.target.value })} placeholder="1st Floor" /></Field>
              <div className="col-span-2"><Field label="Dimensi"><input className={inp} value={f.dimensi} onChange={(e) => setF({ ...f, dimensi: e.target.value })} placeholder="8 × 6 m" /></Field></div>
            </div>
            <div className="text-sm font-semibold text-slate-700">Kapasitas (orang)</div>
            <div className="grid grid-cols-5 gap-2">
              {[["cap_theater", "Theater"], ["cap_class", "Class"], ["cap_round", "Round"], ["cap_ushape", "U-Shape"], ["cap_hollow", "Hollow"]].map(([k, l]) => (
                <Field key={k} label={l}><input className={inp} inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/[^\d]/g, "") })} /></Field>
              ))}
            </div>
            <Field label="Fasilitas (pisahkan dengan koma)"><input className={inp} value={f.fasilitas} onChange={(e) => setF({ ...f, fasilitas: e.target.value })} placeholder="TV 65 inch, Whiteboard, Sound system, WiFi" /></Field>
            <Field label="Deskripsi singkat (tampil di Ucup)"><textarea className={inp} rows={2} value={f.deskripsi} onChange={(e) => setF({ ...f, deskripsi: e.target.value })} /></Field>
            <Field label="Foto ruangan">
              <input type="file" accept="image/*" onChange={pilihFoto} className="text-sm" />
              {f.fotoNama && <p className="text-xs text-emerald-700 mt-1">Siap unggah: {f.fotoNama}</p>}
              {!f.fotoBase64 && f.foto && <p className="text-xs text-slate-500 mt-1 truncate">Foto saat ini: <a href={f.foto} target="_blank" rel="noreferrer" className="underline">{f.foto}</a></p>}
            </Field>
            <div className="flex flex-wrap gap-4 py-1">{cb("aktif")}{cb("tampil_publik")}{cb("booking_langsung")}</div>

            <div className={"rounded-lg border p-3 " + (f.booking_langsung ? "border-[#c8962c] bg-amber-50/40" : "border-slate-200 bg-slate-50")}>
              <div className="text-sm font-semibold text-slate-700 mb-2">Harga publik (Rp) {!f.booking_langsung && <span className="font-normal text-slate-400">— hanya dipakai bila "Booking langsung" aktif</span>}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[["per_jam", "Per jam"], ["half_day", "Half day (4 jam)"], ["full_day", "Full day (8 jam)"], ["weekend_pct", "Weekend +%"]].map(([k, l]) => (
                  <Field key={k} label={l}><input className={inp} inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/[^\d]/g, "") })} /></Field>
                ))}
              </div>
              <Field label="Catatan harga"><input className={inp} value={f.catatan_harga} onChange={(e) => setF({ ...f, catatan_harga: e.target.value })} /></Field>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Batal</button>
            <button onClick={simpan} disabled={saving} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-50">{saving ? "Menyimpan…" : "Simpan"}</button>
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
