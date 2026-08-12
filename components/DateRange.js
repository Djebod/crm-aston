"use client";

// Filter rentang tanggal. dari/sampai format "yyyy-MM-dd" (dari input type=date).
export default function DateRange({ dari, sampai, setDari, setSampai, className = "" }) {
  return (
    <div className={"flex items-center gap-1.5 " + className}>
      <input
        type="date" value={dari} onChange={(e) => setDari(e.target.value)}
        title="Dari tanggal"
        className="border border-slate-300 rounded-lg px-2 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#c8962c]"
      />
      <span className="text-slate-400 text-sm">–</span>
      <input
        type="date" value={sampai} onChange={(e) => setSampai(e.target.value)}
        title="Sampai tanggal"
        className="border border-slate-300 rounded-lg px-2 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#c8962c]"
      />
      {(dari || sampai) && (
        <button onClick={() => { setDari(""); setSampai(""); }} title="Hapus filter tanggal"
          className="text-slate-400 hover:text-slate-700 text-sm px-1">✕</button>
      )}
    </div>
  );
}

// Bantu: apakah "yyyy-MM-dd..."(tglStr) berada dalam rentang [dari, sampai]?
export function dalamRentang(tglStr, dari, sampai) {
  const t = String(tglStr || "").slice(0, 10);
  if (!t) return !dari && !sampai ? true : false;
  if (dari && t < dari) return false;
  if (sampai && t > sampai) return false;
  return true;
}
