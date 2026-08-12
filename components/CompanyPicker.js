"use client";

import { useState, useMemo } from "react";
import { inp } from "@/components/Modal";

export default function CompanyPicker({ value, companies, onChange, placeholder = "opsional — ketik untuk cari perusahaan" }) {
  const [open, setOpen] = useState(false);
  const hasil = useMemo(() => {
    const s = String(value || "").toLowerCase().trim();
    if (!s) return [];
    return companies.filter((c) => String(c.CompanyName).toLowerCase().includes(s)).slice(0, 12);
  }, [value, companies]);

  return (
    <div className="relative">
      <input
        className={inp}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && hasil.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {hasil.map((c) => (
            <button
              type="button"
              key={c.CompanyName}
              onMouseDown={(e) => { e.preventDefault(); onChange(c.CompanyName); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
            >
              <div className="font-medium text-[#12263a] truncate uppercase">{c.CompanyName}</div>
              {c.Segmentation && <div className="text-xs text-slate-400">{c.Segmentation}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
