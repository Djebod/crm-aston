"use client";

import { useState } from "react";

export default function LupaPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [terkirim, setTerkirim] = useState(false);

  async function kirim() {
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setTerkirim(true);
    } catch (e) {
      setTerkirim(true); // tetap tampilkan pesan netral
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-[#0e1f33] to-[#12263a]">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex justify-center mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aston-logo.png" alt="Aston Cirebon" className="h-16 w-auto object-contain" />
          </div>

          {terkirim ? (
            <div className="text-center">
              <div className="text-3xl mb-2">📧</div>
              <h1 className="text-lg font-bold mb-2">Cek email Anda</h1>
              <p className="text-slate-600 text-sm mb-5">
                Jika email terdaftar dan aktif, kami sudah mengirim tautan untuk membuat password baru.
                Tautan berlaku 1 jam.
              </p>
              <a href="/" className="text-[#12263a] hover:text-[#c8962c] font-semibold text-sm">
                Kembali ke halaman masuk
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold mb-1">Lupa password</h1>
              <p className="text-slate-500 text-sm mb-5">
                Masukkan email akun Anda. Kami kirim tautan reset ke email tersebut.
              </p>

              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && kirim()}
                placeholder="nama@email.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-[#c8962c]"
              />

              <button
                onClick={kirim}
                disabled={loading}
                className="w-full bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
              >
                {loading ? "Mengirim..." : "Kirim tautan reset"}
              </button>

              <div className="text-center mt-4">
                <a href="/" className="text-sm text-slate-500 hover:text-[#12263a]">Kembali ke masuk</a>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Catatan: akun super admin di-reset lewat Environment Variable, bukan halaman ini.
        </p>
      </div>
    </main>
  );
}
