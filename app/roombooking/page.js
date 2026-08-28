"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProfilSaya from "@/components/ProfilSaya";
import Header from "@/components/Header";
import { Modal, Field, inp } from "@/components/Modal";
import DateRange, { dalamRentang } from "@/components/DateRange";

// Data ruangan (dari Meeting Room Dimension)
const ROOMS = [
  { name: "Diamond 12", floor: "1st Floor", cap: { theater: 120, class: 63, round: 60, ushape: 48, hollow: 36 }, dim: "17,7 × 8 m" },
  { name: "Diamond 3", floor: "1st Floor", cap: { theater: 50, class: 21, round: 30, ushape: 39, hollow: 24 }, dim: "8,7 × 8 m" },
  { name: "Diamond 5", floor: "1st Floor", cap: { theater: 50, class: 21, round: 30, ushape: 39, hollow: 24 }, dim: "8,7 × 8 m" },
  { name: "Diamond 6", floor: "1st Floor", cap: { theater: 140, class: 90, round: 80, ushape: 66, hollow: 48 }, dim: "22 × 8 m" },
  { name: "Diamond 7", floor: "1st Floor", cap: { theater: 140, class: 90, round: 80, ushape: 66, hollow: 48 }, dim: "22 × 8 m" },
  { name: "Crystal", floor: "Lobby Floor", cap: { theater: 80, class: 30, round: 50, ushape: 30, hollow: 30 }, dim: "15,8 × 6 m" },
  { name: "Emerald", floor: "Base Main Floor", cap: { theater: 120, class: 60, round: 60, ushape: 48, hollow: 36 }, dim: "16,3 × 8 m" },
  { name: "Iron", floor: "Eagle", cap: { theater: 24, class: 18, round: 20, ushape: 27, hollow: 18 }, dim: "6,3 × 6 m" },
  { name: "Wood", floor: "Eagle", cap: { theater: 40, class: 27, round: 30, ushape: 27, hollow: 18 }, dim: "8 × 6 m" },
  { name: "Onyx", floor: "1st Floor", cap: { theater: 250, class: 180, round: 200, ushape: 150, hollow: 54 }, dim: "26,5 × 18,6 m" },
  { name: "Sapphire Ballroom", floor: "Lobby Floor", cap: { theater: 1445, class: 504, round: 720, ushape: 345, hollow: 345 }, dim: "35,3 × 48,5 m" },
];
const SETUPS = [
  { key: "theater", label: "Theater" },
  { key: "class", label: "Class Room" },
  { key: "round", label: "Round Table" },
  { key: "ushape", label: "U Shape" },
  { key: "hollow", label: "Hollow Square" },
];
const STATUS = ["Tentative", "Definite", "Cancel"];
const STATUS_STYLE = {
  Tentative: "bg-amber-100 text-amber-800", Definite: "bg-emerald-100 text-emerald-800", Cancel: "bg-rose-100 text-rose-700",
};
const BORDER_STYLE = { Definite: "border-l-emerald-500", Tentative: "border-l-amber-400", Cancel: "border-l-rose-400" };
const findRoom = (n) => ROOMS.find((r) => r.name === n);
const setupLabel = (k) => SETUPS.find((s) => s.key === k)?.label || k || "-";
const menit = (hhmm) => { const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null; };
const hariID = (s) => { if (!s) return "-"; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };

const FORM_KOSONG = () => ({ id: "", room: "Diamond 12", tanggal: new Date().toISOString().slice(0, 10), jamMulai: "08:00", jamSelesai: "17:00", eventTitle: "", company: "", pax: "", setup: "theater", pic: "", status: "Tentative", catatan: "" });

export default function RoomBookingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProfil, setModalProfil] = useState(false);
  const [modalForm, setModalForm] = useState(false);
  const [modalRuang, setModalRuang] = useState(false);
  const [f, setF] = useState(FORM_KOSONG());
  const [saving, setSaving] = useState(false);

  const [tglBoard, setTglBoard] = useState(new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState("board"); // board | list

  const [fRoom, setFRoom] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("crm_user") : null;
    if (!raw) { router.replace("/"); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  const ambil = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/roombooking", { cache: "no-store" }).then((x) => x.json());
      if (r.status === "ok") setList(r.data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);
  useEffect(() => { if (user) ambil(); }, [user, ambil]);

  function logout() { localStorage.removeItem("crm_user"); router.replace("/"); }

  // Papan ketersediaan untuk tanggal terpilih
  const board = useMemo(() => {
    return ROOMS.map((r) => {
      const bookings = list.filter((x) => x.Room === r.name && x.Tanggal === tglBoard && x.Status !== "Cancel")
        .sort((a, b) => String(a.JamMulai).localeCompare(String(b.JamMulai)));
      return { room: r, bookings };
    });
  }, [list, tglBoard]);
  const jmlTersedia = board.filter((b) => b.bookings.length === 0).length;

  // Booking yang belum ada ruangannya (otomatis dari lead)
  const belumDijadwal = useMemo(
    () => list.filter((x) => (!x.Room || x.Room === "") && x.Status !== "Cancel")
      .sort((a, b) => String(a.Tanggal).localeCompare(String(b.Tanggal))),
    [list]
  );

  const tampil = useMemo(() => {
    return list
      .filter((x) => (!fRoom ? true : x.Room === fRoom))
      .filter((x) => (!fStatus ? true : x.Status === fStatus))
      .filter((x) => dalamRentang(x.Tanggal, dari, sampai))
      .sort((a, b) => String(b.Tanggal + (b.JamMulai || "")).localeCompare(String(a.Tanggal + (a.JamMulai || ""))));
  }, [list, fRoom, fStatus, dari, sampai]);

  const room = findRoom(f.room);
  const kapasitas = room ? room.cap[f.setup] : 0;
  const paxLebih = f.pax && kapasitas && Number(f.pax) > kapasitas;

  const bentrok = useMemo(() => {
    if (!f.room || f.status === "Cancel") return null;
    const s = menit(f.jamMulai), e = menit(f.jamSelesai);
    if (s === null || e === null || e <= s) return null;
    return list.find((x) => {
      if (x.ID === f.id) return false;
      if (x.Room !== f.room || x.Tanggal !== f.tanggal || x.Status === "Cancel") return false;
      const rs = menit(x.JamMulai), re = menit(x.JamSelesai);
      if (rs === null || re === null) return false;
      return !(s >= re + 120 || rs >= e + 120);
    });
  }, [f, list]);

  function bukaBaru(prefRoom, prefTgl) {
    const k = FORM_KOSONG(); k.pic = user?.nama || "";
    if (prefRoom) k.room = prefRoom;
    if (prefTgl) k.tanggal = prefTgl;
    setF(k); setModalForm(true);
  }
  function bukaEdit(x) {
    setF({ id: x.ID, room: x.Room || "", tanggal: x.Tanggal, jamMulai: x.JamMulai || "08:00", jamSelesai: x.JamSelesai || "17:00", eventTitle: x.EventTitle || "", company: x.Company || "", pax: x.Pax || "", setup: x.Setup || "theater", pic: x.PIC || "", status: x.Status || "Tentative", catatan: x.Catatan || "" });
    setModalForm(true);
  }

  async function simpan() {
    if (!f.room) { alert("Silakan pilih ruangan."); return; }
    if (menit(f.jamSelesai) <= menit(f.jamMulai)) { alert("Jam selesai harus setelah jam mulai."); return; }
    if (paxLebih) { alert(`Kapasitas ${f.room} untuk setup ${setupLabel(f.setup)} hanya ${kapasitas} orang, sedangkan peserta ${f.pax}. Pilih ruangan lebih besar atau ubah setup.`); return; }
    if (bentrok && f.status !== "Cancel") { alert(`Bentrok dengan booking ${bentrok.JamMulai}-${bentrok.JamSelesai} (${bentrok.EventTitle || "-"}) di ${f.room}. Minimal jeda 2 jam.`); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/roombooking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: f.id ? "updateBooking" : "addBooking", ...f, oleh: user?.nama || user?.email || "" }),
      });
      const d = await res.json();
      if (d.status === "ok") { setModalForm(false); await ambil(); }
      else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); } finally { setSaving(false); }
  }

  async function ubahStatus(x, status) {
    try {
      const res = await fetch("/api/roombooking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setStatus", id: x.ID, status }) });
      const d = await res.json();
      if (d.status === "ok") await ambil(); else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); }
  }
  async function hapus(x) {
    if (!confirm("Hapus booking ini?")) return;
    try {
      const res = await fetch("/api/roombooking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hapus", id: x.ID }) });
      const d = await res.json();
      if (d.status === "ok") await ambil(); else alert("Gagal: " + (d.message || ""));
    } catch (e) { alert("Tidak bisa terhubung ke server."); }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Header active="roombooking" user={user} onProfil={() => setModalProfil(true)} onKeluar={logout} />

      <main className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#12263a]">Meeting Room Blocking</h1>
            <p className="text-sm text-slate-500">Ketersediaan &amp; jadwal ruangan meeting Aston Cirebon.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModalRuang(true)} className="border border-slate-300 text-[#12263a] font-semibold rounded-lg px-3 py-2.5 hover:bg-slate-50 whitespace-nowrap">Kapasitas</button>
            <button onClick={() => bukaBaru(null, tglBoard)} className="bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap">+ Booking</button>
          </div>
        </div>

        {/* Tab */}
        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit">
          <button onClick={() => setTab("board")} className={"px-4 py-1.5 rounded-md text-sm font-semibold " + (tab === "board" ? "bg-white shadow text-[#12263a]" : "text-slate-500")}>Ketersediaan</button>
          <button onClick={() => setTab("list")} className={"px-4 py-1.5 rounded-md text-sm font-semibold " + (tab === "list" ? "bg-white shadow text-[#12263a]" : "text-slate-500")}>Daftar Booking</button>
        </div>

        {/* Booking belum terjadwal (dari lead) */}
        {belumDijadwal.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <div className="text-sm font-semibold text-amber-900 mb-2">📌 Perlu penjadwalan ruangan ({belumDijadwal.length}) — otomatis dari Lead</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {belumDijadwal.map((x) => (
                <div key={x.ID} className="bg-white rounded-lg border border-amber-200 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#12263a] truncate">{x.EventTitle || "-"}{x.Company ? " · " + x.Company : ""}</div>
                    <div className="text-xs text-slate-500">🗓 {x.Tanggal || "-"} {x.Pax ? "· 👥 " + x.Pax : ""}
                      <span className={"ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold " + (STATUS_STYLE[x.Status] || "")}>{x.Status}</span>
                    </div>
                  </div>
                  <button onClick={() => bukaEdit(x)} className="text-xs font-semibold bg-[#12263a] text-white rounded-md px-3 py-1.5 whitespace-nowrap">Jadwalkan</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "board" ? (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <input type="date" value={tglBoard} onChange={(e) => setTglBoard(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white" />
                <button onClick={() => setTglBoard(new Date().toISOString().slice(0, 10))} className="text-sm text-[#12263a] font-semibold border border-slate-300 rounded-lg px-3 py-2.5 hover:bg-slate-50">Hari ini</button>
              </div>
              <div className="text-sm text-slate-500">{hariID(tglBoard)} · <b className="text-emerald-600">{jmlTersedia}</b> ruangan tersedia</div>
            </div>

            {loading ? (
              <div className="text-center text-slate-500 py-16">Memuat data…</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {board.map(({ room, bookings }) => {
                  const kosong = bookings.length === 0;
                  return (
                    <div key={room.name} className={"rounded-xl border p-3 " + (kosong ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white")}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-[#12263a]">{room.name}</div>
                        {kosong
                          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Tersedia</span>
                          : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{bookings.length} acara</span>}
                      </div>
                      <div className="text-xs text-slate-400">{room.floor} · {room.dim}</div>

                      {kosong ? (
                        <button onClick={() => bukaBaru(room.name, tglBoard)} className="mt-3 w-full text-xs font-semibold text-emerald-700 border border-emerald-300 rounded-md py-1.5 hover:bg-emerald-50">+ Booking ruangan ini</button>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          {bookings.map((x) => (
                            <button key={x.ID} onClick={() => bukaEdit(x)} className={"w-full text-left border-l-4 bg-slate-50 rounded-md px-2 py-1.5 hover:bg-slate-100 " + (BORDER_STYLE[x.Status] || "border-l-slate-300")}>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-[#12263a]">⏰ {x.JamMulai}–{x.JamSelesai}</span>
                                <span className={"text-[11px] font-semibold px-1.5 py-0.5 rounded-full " + (STATUS_STYLE[x.Status] || "")}>{x.Status}</span>
                              </div>
                              <div className="text-xs text-slate-600 truncate">{x.EventTitle || "-"}{x.Company ? " · " + x.Company : ""}</div>
                              <div className="text-[11px] text-slate-400">{setupLabel(x.Setup)}{x.Pax ? " · " + x.Pax + " pax" : ""}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:flex gap-2 mb-4">
              <select value={fRoom} onChange={(e) => setFRoom(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
                <option value="">Semua Ruangan</option>
                {ROOMS.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
                <option value="">Semua Status</option>
                {STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <DateRange className="col-span-2 sm:col-span-1" dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
            </div>

            {loading ? (
              <div className="text-center text-slate-500 py-16">Memuat data…</div>
            ) : tampil.length === 0 ? (
              <div className="text-center text-slate-500 py-16 border-2 border-dashed border-slate-200 rounded-2xl">Belum ada booking.</div>
            ) : (
              <div className="grid gap-3">
                {tampil.map((x) => (
                  <div key={x.ID} className={"bg-white rounded-xl border border-slate-200 border-l-4 p-4 " + (BORDER_STYLE[x.Status] || "border-l-slate-300")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-[#12263a]">{x.Room || <span className="text-amber-600">Belum ada ruangan</span>} {x.Room && <span className="text-slate-400 font-normal">· {findRoom(x.Room)?.floor}</span>}</div>
                        <div className="text-xs text-slate-500">🗓 {x.Tanggal} · ⏰ {x.JamMulai}–{x.JamSelesai}</div>
                      </div>
                      <span className={"text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap " + (STATUS_STYLE[x.Status] || "bg-slate-100 text-slate-700")}>{x.Status}</span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{x.EventTitle && <span className="font-medium">{x.EventTitle}</span>}{x.Company ? " · " + x.Company : ""}</div>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-x-3 mt-1">
                      <span>🎭 {setupLabel(x.Setup)}</span>{x.Pax && <span>👥 {x.Pax} pax</span>}{x.PIC && <span>👤 {x.PIC}</span>}
                    </div>
                    {x.LeadID && <div className="text-[11px] text-amber-600 mt-1">↳ tertaut Lead</div>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {x.Status !== "Definite" && <button onClick={() => ubahStatus(x, "Definite")} className="text-xs font-semibold bg-emerald-600 text-white rounded-md px-3 py-1.5">Definite</button>}
                      {x.Status !== "Cancel" && <button onClick={() => ubahStatus(x, "Cancel")} className="text-xs font-semibold border border-rose-300 text-rose-700 rounded-md px-3 py-1.5 hover:bg-rose-50">Cancel</button>}
                      <button onClick={() => bukaEdit(x)} className="text-xs font-semibold border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50">Edit</button>
                      <button onClick={() => hapus(x)} className="text-xs font-semibold border border-slate-300 text-slate-500 rounded-md px-3 py-1.5 hover:bg-slate-50">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal booking */}
      {modalForm && (
        <Modal title={f.id ? "Edit / Jadwalkan Booking" : "Booking Ruangan"} onClose={() => setModalForm(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ruangan">
                <select className={inp} value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })}>
                  <option value="">— pilih ruangan —</option>
                  {ROOMS.map((r) => <option key={r.name} value={r.name}>{r.name} — {r.floor}</option>)}
                </select>
              </Field>
              <Field label="Setup">
                <select className={inp} value={f.setup} onChange={(e) => setF({ ...f, setup: e.target.value })}>
                  {SETUPS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </Field>
            </div>

            {f.room && (
              <div className={"text-sm rounded-md px-3 py-2 " + (paxLebih ? "bg-rose-50 border border-rose-300 text-rose-700" : "bg-slate-50 border border-slate-200 text-slate-600")}>
                Kapasitas {f.room} ({setupLabel(f.setup)}): <b>{kapasitas} orang</b>
                {paxLebih && <div className="font-semibold mt-1">⚠ Peserta ({f.pax}) melebihi kapasitas! Pilih ruangan lebih besar / ubah setup.</div>}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Tanggal"><input type="date" className={inp} value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field>
              <Field label="Jam Mulai"><input type="time" className={inp} value={f.jamMulai} onChange={(e) => setF({ ...f, jamMulai: e.target.value })} /></Field>
              <Field label="Jam Selesai"><input type="time" className={inp} value={f.jamSelesai} onChange={(e) => setF({ ...f, jamSelesai: e.target.value })} /></Field>
            </div>

            {bentrok && f.status !== "Cancel" && (
              <div className="text-sm bg-rose-50 border border-rose-300 text-rose-700 rounded-md px-3 py-2 font-semibold">
                ⚠ Bentrok dengan {bentrok.JamMulai}–{bentrok.JamSelesai} ({bentrok.EventTitle || "-"}). Perlu jeda minimal 2 jam antar-booking di ruangan yang sama.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Jumlah Peserta"><input className={inp} inputMode="numeric" value={f.pax} onChange={(e) => setF({ ...f, pax: e.target.value.replace(/[^\d]/g, "") })} /></Field>
              <Field label="Status"><select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Event / Acara"><input className={inp} value={f.eventTitle} onChange={(e) => setF({ ...f, eventTitle: e.target.value })} /></Field>
              <Field label="Company"><input className={inp} value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
              <Field label="PIC / Account Manager"><input className={inp} value={f.pic} onChange={(e) => setF({ ...f, pic: e.target.value })} /></Field>
            </div>
            <Field label="Catatan"><input className={inp} value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} /></Field>
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={() => setModalForm(false)} className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Batal</button>
            <button onClick={simpan} disabled={saving || paxLebih || (!!bentrok && f.status !== "Cancel")} className="flex-1 bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 disabled:opacity-50">{saving ? "Menyimpan…" : "Simpan"}</button>
          </div>
        </Modal>
      )}

      {/* Modal kapasitas */}
      {modalRuang && (
        <Modal title="Kapasitas Ruangan Meeting" onClose={() => setModalRuang(false)}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border border-slate-200 p-2 text-left">Ruangan</th>
                  <th className="border border-slate-200 p-2">Theater</th><th className="border border-slate-200 p-2">Class</th>
                  <th className="border border-slate-200 p-2">Round</th><th className="border border-slate-200 p-2">U-Shape</th><th className="border border-slate-200 p-2">Hollow</th>
                </tr>
              </thead>
              <tbody>
                {ROOMS.map((r) => (
                  <tr key={r.name}>
                    <td className="border border-slate-200 p-2"><div className="font-semibold text-[#12263a]">{r.name}</div><div className="text-slate-400">{r.floor} · {r.dim}</div></td>
                    <td className="border border-slate-200 p-2 text-center">{r.cap.theater}</td><td className="border border-slate-200 p-2 text-center">{r.cap.class}</td>
                    <td className="border border-slate-200 p-2 text-center">{r.cap.round}</td><td className="border border-slate-200 p-2 text-center">{r.cap.ushape}</td><td className="border border-slate-200 p-2 text-center">{r.cap.hollow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setModalRuang(false)} className="w-full mt-4 border border-slate-300 rounded-lg py-2.5 font-medium hover:bg-slate-50">Tutup</button>
        </Modal>
      )}

      {modalProfil && (
        <ProfilSaya user={user} onClose={() => setModalProfil(false)}
          onProfileUpdate={(nama) => { const baru = { ...user, nama }; setUser(baru); localStorage.setItem("crm_user", JSON.stringify(baru)); }} />
      )}
    </div>
  );
}
