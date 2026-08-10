"use client";

import { useState } from "react";

export const PALETTE = [
  "#12263a", "#c8962c", "#1d5fa8", "#10b981", "#8b5cf6",
  "#f59e0b", "#ef4444", "#0ea5e9", "#ec4899", "#64748b",
];

// Hitung agregat: dari array data -> [{label, value}] terurut menurun
export function hitungPer(list, ambilKunci) {
  const map = new Map();
  list.forEach((x) => {
    const k = (ambilKunci(x) || "(kosong)").toString();
    map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function beriWarna(data, warnaMap) {
  return data.map((d, i) => ({
    ...d,
    color: (warnaMap && warnaMap[d.label]) || PALETTE[i % PALETTE.length],
  }));
}

// Ambil top-N (data harus sudah terurut menurun); sisanya digabung jadi "Lainnya"
export function topN(data, n = 10) {
  if (data.length <= n) return data;
  const atas = data.slice(0, n);
  const sisa = data.slice(n).reduce((s, d) => s + d.value, 0);
  return sisa > 0 ? [...atas, { label: "Lainnya", value: sisa }] : atas;
}

// ---- Donut interaktif (hover slice / legend) ----
export function Donut({ data, size = 168, thickness = 26 }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness - 6) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  const segs = data.map((d) => {
    const len = (d.value / total) * circ;
    const s = { ...d, dash: `${len} ${circ - len}`, off: -acc };
    acc += len;
    return s;
  });

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef2f6" strokeWidth={thickness} />
          {segs.map((s, i) => (
            <circle
              key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth={hover === i ? thickness + 5 : thickness}
              strokeDasharray={s.dash} strokeDashoffset={s.off} strokeLinecap="butt"
              opacity={hover === null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ transition: "opacity .15s, stroke-width .15s", cursor: "pointer" }}
            />
          ))}
        </g>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="26" fontWeight="800" fill="#12263a">
          {hover !== null ? data[hover].value : total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fill="#64748b">
          {hover !== null ? data[hover].label : "Total"}
        </text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <button
            key={i} type="button"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="flex items-center gap-2 text-sm text-left"
          >
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className={hover === i ? "font-semibold text-[#12263a]" : "text-slate-700"}>{d.label}</span>
            <span className="text-slate-400">{d.value} ({Math.round((d.value / total) * 100)}%)</span>
          </button>
        ))}
        {data.length === 0 && <div className="text-sm text-slate-400">Belum ada data.</div>}
      </div>
    </div>
  );
}

// ---- Bar horizontal interaktif ----
export function BarList({ data, formatValue }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div
          key={i} className="text-sm"
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
        >
          <div className="flex justify-between mb-1">
            <span className={hover === i ? "font-semibold text-[#12263a]" : "text-slate-600"}>{d.label}</span>
            <span className="text-slate-500">{formatValue ? formatValue(d.value) : d.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color || "#12263a",
                opacity: hover === null || hover === i ? 1 : 0.5,
                transition: "opacity .15s, width .3s",
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <div className="text-sm text-slate-400">Belum ada data.</div>}
    </div>
  );
}

// ---- Kartu pembungkus chart ----
export function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-sm text-slate-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
