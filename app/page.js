"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Kalau sudah login, langsung ke dashboard
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("crm_user")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function masuk() {
    setError("");
    if (!email || !password) {
      setError("Isi email dan password dulu ya.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("crm_user", JSON.stringify(data.user));
        router.replace("/dashboard");
      } else {
        setError(data.message || "Login gagal.");
      }
    } catch (e) {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-[#0e1f33] to-[#12263a]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-[#c8962c] font-extrabold tracking-wide text-lg">
            <span className="w-8 h-8 rounded-lg bg-[#c8962c] text-[#12263a] grid place-items-center">A</span>
            ASTON CRM
          </div>
          <p className="text-slate-300 text-sm mt-2">Leads Event &amp; Booking · Cirebon</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-lg font-bold mb-1">Masuk</h1>
          <p className="text-slate-500 text-sm mb-5">Gunakan akun yang terdaftar.</p>

          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && masuk()}
            placeholder="nama@email.com"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-[#c8962c]"
          />

          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && masuk()}
            placeholder="••••••••"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-[#c8962c]"
          />

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={masuk}
            disabled={loading}
            className="w-full bg-[#12263a] hover:bg-[#0e1f33] text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
          >
            {loading ? "Memeriksa…" : "Masuk"}
          </button>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Aston Cirebon · Internal Sales Tool
        </p>
      </div>
    </main>
  );
}
