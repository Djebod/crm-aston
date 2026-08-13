"use client";

// Ambil daftar company dengan cache (sessionStorage) supaya tidak mengunduh
// 5.000+ baris berulang kali setiap pindah halaman.
const KEY = "crm_companies_cache";
const TTL = 10 * 60 * 1000; // 10 menit

export async function ambilCompanies(force = false) {
  if (!force && typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        if (Date.now() - obj.t < TTL && Array.isArray(obj.data)) return obj.data;
      }
    } catch (e) {}
  }
  try {
    const r = await fetch("/api/companies", { cache: "no-store" }).then((x) => x.json());
    const data = r.status === "ok" ? (r.data || []) : [];
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) {}
    return data;
  } catch (e) {
    return [];
  }
}

export function hapusCompaniesCache() {
  try { sessionStorage.removeItem(KEY); } catch (e) {}
}
