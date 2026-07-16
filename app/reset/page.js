"use client";

import { useState, useEffect } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sukses, setSukses] = useState(false);

  // Ambil email & token dari URL (?email=...&token=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    setEmail(p.get("email") || "");
    setToken(p.get("token") || "");
  }, []);

  async function simpan() {
    setError("");
    if (!pw1 || pw1.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (pw1 !== pw2) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password: pw1 }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setSukses(true);
      } else {
        setError(data.message || "Gagal reset password.");
      }
    } catch (e) {
      setError("Tidak bisa terhubung ke server.");
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

          {sukses ? (
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <h1 className="text-lg font-bold mb-2">Password berhasil diubah</h1>
              <p className="text-slate-600 text-sm mb-5">Silakan masuk dengan password baru Anda.</p>
              <a href="/" className="inline-block bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 px-5 text-sm">
                Masuk sekarang
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-bold mb-1">Buat password baru</h1>
              <p className="text-slate-500 text-sm mb-5">Untuk akun: <span className="font-medium">{email || "-"}</span></p>

              {!token && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
                  Tautan tidak lengkap. Buka lewat tautan di email reset.
                </div>
              )}

              <label className="block text-sm font-medium mb-1">Password baru</label>
              <div className="mb-4">
                <PasswordInput
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="minimal 6 karakter"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]"
                />
              </div>

              <label className="block text-sm font-medium mb-1">Ulangi password</label>
              <div className="mb-4">
                <PasswordInput
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && simpan()}
                  placeholder="ketik ulang"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c8962c]"
                />
              </div>

              {error && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={simpan}
                disabled={loading || !token}
                className="w-full bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
              >
                {loading ? "Menyimpan..." : "Simpan password baru"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
