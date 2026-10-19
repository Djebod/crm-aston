"use client";

import { useEffect, useState } from "react";

// Hook daftar ruangan meeting dari tabel meeting_room (menggantikan konstanta hardcoded).
// Bentuk tiap item disamakan dengan konstanta lama: { id, name, floor, dim, cap: { theater, class, round, ushape, hollow } }
// supaya halaman Room Booking / Leads / Activity cukup ganti sumber datanya.
export const SETUPS = [
  { key: "theater", label: "Theater" },
  { key: "class", label: "Class Room" },
  { key: "round", label: "Round Table" },
  { key: "ushape", label: "U Shape" },
  { key: "hollow", label: "Hollow Square" },
];

export function keBentukLama(r) {
  return {
    id: r.id, name: r.nama, floor: r.lantai || "", dim: r.dimensi || "",
    cap: { theater: r.cap_theater || 0, class: r.cap_class || 0, round: r.cap_round || 0, ushape: r.cap_ushape || 0, hollow: r.cap_hollow || 0 },
    tampilPublik: !!r.tampil_publik, bookingLangsung: !!r.booking_langsung, aktif: r.aktif !== false,
  };
}

let _cache = null;
export function useRuangan() {
  const [rooms, setRooms] = useState(_cache || []);
  useEffect(() => {
    if (_cache) return;
    fetch("/api/rooms", { cache: "no-store" }).then((r) => r.json()).then((r) => {
      if (r.status === "ok") { _cache = (r.data || []).filter((x) => x.aktif !== false).map(keBentukLama); setRooms(_cache); }
    }).catch(() => {});
  }, []);
  return rooms;
}
export function resetCacheRuangan() { _cache = null; }
