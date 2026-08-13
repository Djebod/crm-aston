"use client";

import { useState } from "react";

const ITEMS = [
  { href: "/dashboard", label: "Leads", key: "leads" },
  { href: "/tindaklanjut", label: "Tindak Lanjut", key: "tindaklanjut" },
  { href: "/aktivitas", label: "Activity", key: "activity" },
  { href: "/callplan", label: "Sales Call Plan", key: "callplan" },
  { href: "/company", label: "Company", key: "company" },
  { href: "/log", label: "Log", key: "log" },
];

export default function Header({ active, user, onKelolaTim, onProfil, onKeluar }) {
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  return (
    <header className="bg-[#12263a] text-white sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Kiri: logo + nav (desktop) */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-white rounded-lg px-2 py-1 flex items-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aston-logo.png" alt="Aston Cirebon" className="h-7 w-auto object-contain" />
            </span>
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {ITEMS.map((it) => (
                <a key={it.key} href={it.href}
                  className={"px-3 py-1.5 rounded-lg whitespace-nowrap " + (active === it.key ? "bg-white/15 font-semibold" : "hover:bg-white/10 transition")}>
                  {it.label}
                </a>
              ))}
              {isAdmin && onKelolaTim && (
                <button onClick={onKelolaTim} className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition whitespace-nowrap">Kelola Tim</button>
              )}
            </nav>
          </div>

          {/* Kanan: profil+keluar (desktop) / hamburger (mobile) */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onProfil} title="Profil saya"
              className="hidden md:block text-right leading-tight bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition">
              <div className="text-sm font-semibold">{user?.nama}</div>
              <div className="text-xs text-slate-300 capitalize">{user?.role}</div>
            </button>
            <button onClick={onKeluar}
              className="hidden md:block text-sm bg-[#c8962c] hover:brightness-95 text-[#12263a] font-semibold rounded-lg px-3 py-1.5 transition">
              Keluar
            </button>
            <button onClick={() => setOpen((o) => !o)} aria-label="Menu"
              className="md:hidden bg-white/10 hover:bg-white/20 rounded-lg p-2 transition">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {open ? (<><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></>)
                      : (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>)}
              </svg>
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {open && (
          <div className="md:hidden mt-3 border-t border-white/10 pt-3 flex flex-col gap-1">
            <div className="px-3 pb-1 text-xs text-slate-300">{user?.nama} · <span className="capitalize">{user?.role}</span></div>
            {ITEMS.map((it) => (
              <a key={it.key} href={it.href}
                className={"px-3 py-2 rounded-lg " + (active === it.key ? "bg-white/15 font-semibold" : "hover:bg-white/10")}>
                {it.label}
              </a>
            ))}
            {isAdmin && onKelolaTim && (
              <button onClick={() => { setOpen(false); onKelolaTim(); }} className="text-left px-3 py-2 rounded-lg hover:bg-white/10">Kelola Tim</button>
            )}
            <button onClick={() => { setOpen(false); onProfil(); }} className="text-left px-3 py-2 rounded-lg hover:bg-white/10">Profil Saya</button>
            <button onClick={onKeluar} className="text-left px-3 py-2 rounded-lg bg-[#c8962c] text-[#12263a] font-semibold mt-1">Keluar</button>
          </div>
        )}
      </div>
    </header>
  );
}
