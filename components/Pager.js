"use client";

// Navigasi halaman sederhana (per N data).
export default function Pager({ page, total, per, count, onChange }) {
  if (!total || total <= 1) return null;
  const from = (page - 1) * per + 1;
  const to = Math.min(count, page * per);
  const btn = "px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-[#12263a] hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white";
  return (
    <div className="flex items-center justify-between gap-2 mt-3 text-sm flex-wrap">
      <span className="text-slate-500">Menampilkan {from}–{to} dari {count}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(1)} disabled={page <= 1} className={btn}>«</button>
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className={btn}>‹</button>
        <span className="px-2 text-slate-600">Hal {page}/{total}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= total} className={btn}>›</button>
        <button onClick={() => onChange(total)} disabled={page >= total} className={btn}>»</button>
      </div>
    </div>
  );
}
