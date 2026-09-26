"use client";

import { useRef, useState } from "react";

// Ukuran maksimum gambar tanda tangan yang disimpan (piksel)
const MAKS_W = 600;
const MAKS_H = 220;

/**
 * Ubah file gambar jadi data URL PNG yang kecil.
 * Bila hapusLatar = true, piksel yang mendekati putih dibuat transparan,
 * sehingga hasil scan/foto tanda tangan di atas kertas putih tampak bersih.
 */
function prosesGambar(file, hapusLatar) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File tidak bisa dibaca."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File itu bukan gambar yang bisa dibuka."));
      img.onload = () => {
        try {
          const skala = Math.min(MAKS_W / img.width, MAKS_H / img.height, 1);
          const w = Math.max(1, Math.round(img.width * skala));
          const h = Math.max(1, Math.round(img.height * skala));
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          if (hapusLatar) {
            const d = ctx.getImageData(0, 0, w, h);
            const px = d.data;
            for (let i = 0; i < px.length; i += 4) {
              const r = px[i], g = px[i + 1], b = px[i + 2];
              const terang = (r + g + b) / 3;
              if (terang > 215) px[i + 3] = 0;                    // putih -> transparan
              else if (terang > 165) px[i + 3] = Math.round(px[i + 3] * (215 - terang) / 50); // tepi halus
            }
            ctx.putImageData(d, 0, 0);
          }
          resolve(c.toDataURL("image/png"));
        } catch (e) { reject(new Error("Gambar gagal diproses.")); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function TandaTanganUpload({ value, onChange, catatan }) {
  const fileRef = useRef(null);
  const [hapusLatar, setHapusLatar] = useState(true);
  const [pesan, setPesan] = useState("");
  const [busy, setBusy] = useState(false);

  async function pilihFile(e) {
    const f = e.target.files?.[0];
    e.target.value = ""; // supaya file yang sama bisa dipilih lagi
    if (!f) return;
    setPesan(""); setBusy(true);
    try {
      if (!/^image\//.test(f.type)) throw new Error("Pilih file gambar (PNG atau JPG).");
      const dataUrl = await prosesGambar(f, hapusLatar);
      if (dataUrl.length > 400000) throw new Error("Gambar masih terlalu besar. Potong (crop) dulu bagian tanda tangannya saja.");
      onChange(dataUrl);
      setPesan("✓ Tanda tangan siap. Jangan lupa klik Simpan.");
    } catch (err) {
      setPesan(err?.message || "Gambar gagal diproses.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex items-start gap-3 flex-wrap">
        <div
          className="w-44 h-20 rounded-lg border border-slate-300 flex items-center justify-center shrink-0 bg-white"
          style={{ backgroundImage: "linear-gradient(45deg,#f1f5f9 25%,transparent 25%,transparent 75%,#f1f5f9 75%),linear-gradient(45deg,#f1f5f9 25%,transparent 25%,transparent 75%,#f1f5f9 75%)", backgroundSize: "12px 12px", backgroundPosition: "0 0,6px 6px" }}
        >
          {value
            ? <img src={value} alt="Tanda tangan" className="max-h-[72px] max-w-[168px] object-contain" />
            : <span className="text-xs text-slate-400">belum ada</span>}
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="border border-slate-300 text-[#12263a] text-sm font-semibold rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-60">
              {busy ? "Memproses…" : value ? "Ganti gambar" : "Pilih gambar"}
            </button>
            {value && (
              <button type="button" onClick={() => { onChange(""); setPesan("Tanda tangan dihapus. Klik Simpan untuk menerapkan."); }}
                className="border border-rose-300 text-rose-600 text-sm font-semibold rounded-lg px-3 py-2 hover:bg-rose-50">
                Hapus
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 mt-2">
            <input type="checkbox" checked={hapusLatar} onChange={(e) => setHapusLatar(e.target.checked)} />
            Hilangkan latar putih (untuk hasil scan/foto di atas kertas)
          </label>
          <p className="text-xs text-slate-400 mt-1">
            {catatan || "Tanda tangan di kertas putih, foto/scan, lalu potong bagian tanda tangannya saja. Otomatis dikecilkan ke maks 600×220 px."}
          </p>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={pilihFile} className="hidden" />
      {pesan && <p className="text-sm mt-2">{pesan}</p>}
    </div>
  );
}
