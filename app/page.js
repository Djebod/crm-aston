"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, signOut } from "firebase/auth";
import { ambilAuth, ambilGoogleProvider } from "@/lib/firebaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("crm_user")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function masuk() {
    setError("");
    setLoading(true);
    const auth = ambilAuth();
    try {
      const cred = await signInWithPopup(auth, ambilGoogleProvider());
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      // Sesi CRM disimpan sendiri; sesi Firebase cukup untuk sekali verifikasi.
      await signOut(auth).catch(() => {});
      if (data.ok) {
        localStorage.setItem("crm_user", JSON.stringify(data.user));
        router.replace("/dashboard");
      } else {
        setError(data.message || "Login gagal.");
      }
    } catch (e) {
      const c = String(e?.code || "");
      if (c.includes("popup-closed") || c.includes("cancelled")) { /* dibatalkan user */ }
      else if (c.includes("popup-blocked")) setError("Popup diblokir browser. Izinkan popup lalu coba lagi.");
      else if (c.includes("unauthorized-domain")) setError("Domain ini belum diizinkan di Firebase (Authorized domains).");
      else setError("Login gagal: " + (e?.message || "coba lagi."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-[#0e1f33] to-[#12263a]">
      <div className="w-full max-w-sm">
        <p className="text-center text-[#c8962c] font-bold tracking-[0.3em] text-xs mb-6">SALES CRM</p>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex justify-center mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aston-logo.png" alt="Aston Cirebon" className="h-20 w-auto object-contain" />
          </div>

          <h1 className="text-lg font-bold mb-1">Masuk</h1>
          <p className="text-slate-500 text-sm mb-5">Masuk memakai akun Google kantor yang terdaftar di Portal Staff.</p>

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <button
            onClick={masuk}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
              <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z" />
            </svg>
            {loading ? "Memeriksa..." : "Login dengan Google"}
          </button>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Aston Cirebon &middot; Hotel &amp; Convention Center
        </p>
      </div>
    </main>
  );
}
