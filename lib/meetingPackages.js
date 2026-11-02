import { ROOM_TYPES } from "@/lib/rates";

// ====== Meeting Package (harga Nett/Orang/Hari) ======
// Satu sumber untuk Offering Letter & Confirmation Letter.
const ALAT = [
  "LCD Projector (2000 lumens) dan Layar (2 m x 1,5 m)",
  "Audio Sound System",
  "2 Microphone",
];
const STATIONARY = "Meeting Stationary : 1 Flip Chart dengan 3 warna Spidol, Notepad dan Pensil";
const AIR = "Air Putih dan permen";
const gabung = (a) => a.join("\n");

const RESIDENTIAL = gabung([
  "Superior Room",
  "Penggunaan ruang Meeting selama 10 jam",
  ...ALAT, STATIONARY, AIR,
  "1 kali sarapan",
  "1 kali makan siang",
  "1 kali makan malam",
  "2 kali Coffee Break",
]);

export const MEETING_PACKAGES = [
  { nama: "Residential Meeting Package - Twin Share", harga: 1120000, benefit: RESIDENTIAL },
  { nama: "Residential Meeting Package - Single Share", harga: 1650000, benefit: RESIDENTIAL },
  {
    nama: "Full Board Meeting Package", harga: 720000,
    benefit: gabung(["Penggunaan ruang Meeting selama 10 jam", ...ALAT, STATIONARY, AIR, "1 kali makan siang", "1 kali makan malam", "2 kali Coffee Break"]),
  },
  {
    nama: "Full Day Meeting Package", harga: 490000,
    benefit: gabung(["Penggunaan ruang Meeting selama 8 jam", ...ALAT, STATIONARY, AIR, "1 kali makan siang atau makan malam", "2 kali Coffee Break"]),
  },
  {
    nama: "Half Day Meeting Package", harga: 400000,
    benefit: gabung(["Penggunaan ruang Meeting selama 6 jam", ...ALAT, STATIONARY, AIR, "1 kali makan siang atau makan malam", "1 kali Coffee Break"]),
  },
  {
    nama: "Coffee Break Package", harga: 150000,
    benefit: gabung(["Penggunaan ruang Meeting selama 3 jam", ...ALAT, STATIONARY, AIR, "1 kali Coffee Break dengan pilihan menu 3 cemilan, kopi dan teh"]),
  },
  {
    nama: "Lunch or Dinner Package", harga: 250000,
    benefit: gabung(["Penggunaan venue selama 4 jam (maksimal 22.00 WIB)", ...ALAT, AIR, "1 kali makan siang atau makan malam"]),
  },
];

// ====== Hitung jumlah hari dari check in / check out ======
// Selisih tanggal kalender via UTC supaya tidak terpengaruh zona waktu/DST.
export function selisihHari(checkIn, checkOut) {
  const ubah = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  };
  const a = ubah(checkIn), b = ubah(checkOut);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

// Residential & tipe kamar dihitung per malam (beda 1 hari = 1 malam);
// paket lain per hari kalender (hari yang sama = 1 hari, hari berikutnya = 2 hari).
export function perMalam(r) {
  const d = String(r?.deskripsi || "").toLowerCase();
  return /residen|kamar|room|suite|twin|single/.test(d) || ROOM_TYPES.some((t) => d.includes(t.toLowerCase()));
}

// Jumlah hari satu baris estimasi; null bila tanggal belum diisi.
export function hariDariBaris(r) {
  if (!r?.checkIn && !r?.checkOut) return null;
  if (!r.checkIn || !r.checkOut) return 1;
  const s = selisihHari(r.checkIn, r.checkOut);
  return perMalam(r) ? Math.max(1, s) : s + 1;
}
