"use client";

import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";
import { Modal, Field, inp } from "@/components/Modal";

export default function ProfilSaya({ user, onClose, onProfileUpdate }) {
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
