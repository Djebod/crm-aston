"use client";

import { useEffect, useState } from "react";

// Lebar sidebar desktop = 15rem (w-60). Halaman memberi jarak `md:pl-60` pada pembungkus utamanya.
const ITEMS = [
  { href: "/dashboard", label: "Leads", key: "leads", icon: "users" },
  { href: "/tindaklanjut", label: "Tindak Lanjut", key: "tindaklanjut", icon: "clock" },
  { href: "/aktivitas", label: "Activity", key: "activity", icon: "activity" },
  { href: "/callplan", label: "Sales Call Plan", key: "callplan", icon: "phone" },
  { href: "/geo", label: "GEO", key: "geo", icon: "file" },
  { href: "/roombooking", label: "Meeting Room", key: "roombooking", icon: "door" },
  { href: "/company", label: "Company", key: "company", icon: "building" },
  { href: "/target", label: "Target", key: "target", icon: "target" },
  { href: "/log", label: "Log", key: "log", icon: "list" },
];

// Pintasan ke portal staf (situs terpisah) — dibuka di tab baru supaya CRM tetap terbuka
const STAFF_PORTAL = { href: "https://aston-staff-page.vercel.app", label: "Staff Portal" };

const ICON_PATHS = {
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></>,
  door: <><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" /><path d="M9 21v-6h6v6" /><path d="M9 7h1" /><path d="M14 7h1" /><path d="M9 11h1" /><path d="M14 11h1" /></>,
  building: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
  team: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
};

function Ikon({ name, size = 18, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

function IkonPortal({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3h7v7" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

/** Isi panel navigasi — dipakai bersama oleh sidebar desktop dan drawer mobile. */
function PanelNav({ active, user, isAdmin, onKelolaTim, onProfil, onKeluar, onPilih }) {
  const itemCls = (aktif) =>
    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition " +
    (aktif ? "bg-white/15 font-semibold text-white" : "text-slate-200 hover:bg-white/10 hover:text-white");

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-4 pb-3">
        <a href="/dashboard" onClick={onPilih} className="bg-white rounded-lg px-3 py-2 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aston-logo.png" alt="Aston Cirebon" className="h-8 w-auto object-contain" />
        </a>
        <div className="mt-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold text-center">Sales CRM</div>
      </div>

      {/* Menu utama */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-1 flex flex-col gap-0.5 [scrollbar-width:thin]">
        {ITEMS.map((it) => (
          <a key={it.key} href={it.href} onClick={onPilih} className={itemCls(active === it.key)} aria-current={active === it.key ? "page" : undefined}>
            <Ikon name={it.icon} className="shrink-0 opacity-90" />
            <span className="truncate">{it.label}</span>
          </a>
        ))}
        {isAdmin && onKelolaTim && (
          <>
            <div className="mt-2 mb-1 px-3 text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">Admin</div>
            <button onClick={() => { onPilih?.(); onKelolaTim(); }} className={itemCls(false) + " text-left w-full"}>
              <Ikon name="team" className="shrink-0 opacity-90" />
              <span>Kelola Tim</span>
            </button>
          </>
        )}

        <div className="mt-2 mb-1 px-3 text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">Tautan</div>
        <a href={STAFF_PORTAL.href} target="_blank" rel="noopener noreferrer" title="Buka Aston Cirebon Staff Portal (tab baru)"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] border border-[#c8962c]/50 text-[#e9c46a] hover:bg-[#c8962c] hover:text-[#12263a] transition">
          <IkonPortal className="shrink-0" />
          <span className="truncate">{STAFF_PORTAL.label}</span>
          <span className="ml-auto text-[10px] opacity-70">tab baru</span>
        </a>
      </nav>

      {/* Profil & keluar */}
      <div className="border-t border-white/10 p-3 flex flex-col gap-1">
        <button onClick={() => { onPilih?.(); onProfil?.(); }} title="Profil saya"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition text-left">
          <span className="shrink-0 w-8 h-8 rounded-full bg-[#c8962c] text-[#12263a] font-bold flex items-center justify-center text-sm uppercase">
            {(user?.nama || "?").trim().charAt(0)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold truncate">{user?.nama}</span>
            <span className="block text-xs text-slate-300 capitalize">{user?.role}</span>
          </span>
        </button>
        <button onClick={onKeluar}
          className="flex items-center justify-center gap-2 text-sm bg-[#c8962c] hover:brightness-95 text-[#12263a] font-semibold rounded-lg px-3 py-2 transition">
          <Ikon name="logout" size={16} /> Keluar
        </button>
      </div>
    </div>
  );
}

export default function Header({ active, user, onKelolaTim, onProfil, onKeluar }) {
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const tutup = () => setOpen(false);

  // Drawer mobile: tutup dengan Escape, kunci scroll halaman saat terbuka
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  const panelProps = { active, user, isAdmin, onKelolaTim, onProfil, onKeluar };
  const judulAktif = ITEMS.find((it) => it.key === active)?.label || "Aston CRM";

  return (
    <>
      {/* Sidebar desktop (tetap di kiri layar) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 z-20 bg-[#12263a] text-white flex-col shadow-xl">
        <PanelNav {...panelProps} />
      </aside>

      {/* Bar atas mobile */}
      <header className="md:hidden bg-[#12263a] text-white sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} aria-label="Buka menu"
            className="bg-white/10 hover:bg-white/20 rounded-lg p-2 transition">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-sm truncate">{judulAktif}</span>
          <span className="ml-auto bg-white rounded-lg px-2 py-1 flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aston-logo.png" alt="Aston Cirebon" className="h-6 w-auto object-contain" />
          </span>
        </div>
      </header>

      {/* Drawer mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={tutup} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-[82%] max-w-72 bg-[#12263a] text-white shadow-2xl flex flex-col" role="dialog" aria-modal="true" aria-label="Menu navigasi">
            <button onClick={tutup} aria-label="Tutup menu"
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
            <PanelNav {...panelProps} onPilih={tutup} />
          </aside>
        </div>
      )}
    </>
  );
}
