// ====== Tanda tangan dokumen (Offering Letter / Confirmation Letter / GEO) ======

// Jabatan yang terisi otomatis saat nama dipilih dari daftar karyawan
export const JABATAN_ROLE = {
  marketing: "Sales Person",
  leader: "Sales Leader",
  admin: "Asst. DOSM",
  fom: "Front Office Manager",
  fc: "Financial Controller",
  gm: "General Manager",
};

const escDefault = (s) =>
  String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Ruang tanda tangan untuk dokumen PDF.
 * Bila orangnya sudah mengunggah gambar TTD, gambarnya dicetak;
 * bila belum, ruangnya dibiarkan kosong supaya bisa ditandatangani manual.
 */
export function blokTtd(img, nama, jabatan, extra, esc = escDefault, tinggi = 52) {
  const gambar = img
    ? `<div style="height:${tinggi}px;margin-top:4px"><img src="${img}" style="max-height:${tinggi}px;max-width:190px;display:block" /></div>`
    : `<div style="height:${tinggi}px"></div>`;
  return (
    gambar +
    `<div><b><u>${esc(nama) || "-"}</u></b><br>${esc(jabatan)}${extra ? "<br>" + esc(extra) : ""}</div>`
  );
}

/** Cari data karyawan berdasarkan nama (untuk ambil gambar TTD & jabatan). */
export function cariKaryawan(karyawan, nama) {
  return (karyawan || []).find((x) => x.Nama === nama) || null;
}

/**
 * Keterangan kecil di bawah dropdown nama: apakah gambar tanda tangan
 * orang itu sudah ada. Membuat kegagalan terlihat, bukan diam-diam.
 */
export function statusTtd(nama, img, karyawan) {
  if (!nama) return { teks: "Pilih nama penandatangan.", warna: "text-slate-400" };
  if (img) return { teks: "✓ Tanda tangan terpasang.", warna: "text-emerald-600" };
  const ada = (karyawan || []).some((x) => x.Nama === nama);
  if (!ada) {
    return {
      teks: "⚠ Nama ini tidak ada di Kelola Tim, jadi tanda tangannya tidak bisa dicari. Pilih ulang dari daftar.",
      warna: "text-amber-600",
    };
  }
  return {
    teks: "⚠ Orang ini belum mengunggah tanda tangan (Profil Saya → Tanda tangan). Ruang tanda tangan dibiarkan kosong.",
    warna: "text-amber-600",
  };
}
