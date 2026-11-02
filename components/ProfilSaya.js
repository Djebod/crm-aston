"use client";

import { useState, useEffect } from "react";
import { Modal, Field, inp } from "@/components/Modal";
import TandaTanganUpload from "@/components/TandaTanganUpload";

export default function ProfilSaya({ user, onClose, onProfileUpdate }) {
  const [nama, setNama] = useState(user.nama || "");
  const [busyProfil, setBusyProfil] = useState(false);
  const [pesanProfil, setPesanProfil] = useState("");

  // --- Tanda tangan ---
  const [ttd, setTtd] = useState("");
  const [busyTtd, setBusyTtd] = useState(false);
  const [pesanTtd, setPesanTtd] = useState("");

  useEffect(() => {
    fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getTtd", email: user.email }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.status === "ok") setTtd(d.ttd || ""); })
      .catch(() => {});
  }, [user.email]);

  async function simpanTtd() {
    setPesanTtd(""); setBusyTtd(true);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateTtd", email: user.email, ttd }),
      });
      const data = await res.json();
      setPesanTtd(data.status === "ok" ? "✓ Tanda tangan tersimpan." : (data.message || "Gagal menyimpan tanda tangan."));
    } catch (e) {
      setPesanTtd("Tidak bisa terhubung ke server.");
    } finally { setBusyTtd(false); }
  }

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

  return (
    <Modal title="Profil Saya" onClose={onClose}>
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

      <div className="mt-6 pt-5 border-t border-slate-200">
        <h3 className="font-semibold text-sm text-slate-700 mb-1">Tanda tangan</h3>
        <p className="text-xs text-slate-500 mb-3">
          Dipakai di Offering Letter, Confirmation Letter, dan GEO. Begitu nama Anda dipilih sebagai penandatangan, gambar ini muncul otomatis di dokumennya.
        </p>
        <TandaTanganUpload value={ttd} onChange={setTtd} />
        {pesanTtd && <p className="text-sm mt-2">{pesanTtd}</p>}
        <button onClick={simpanTtd} disabled={busyTtd} className="mt-3 bg-[#12263a] hover:bg-[#0e1f33] text-white text-sm font-semibold rounded-lg py-2 px-4 disabled:opacity-60">
          {busyTtd ? "Menyimpan..." : "Simpan tanda tangan"}
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-5">
        Catatan: akun super admin dikelola lewat Environment Variable, jadi ubah profil di sini hanya untuk akun tim. Login memakai akun Google (Portal Staff).
      </p>
    </Modal>
  );
}
