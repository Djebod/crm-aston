// Standar nomor WhatsApp Indonesia untuk seluruh sistem.
// Simpan dalam format 62xxxxxxxxxx (tanpa + dan tanpa 0 di depan).

// Normalisasi input apa pun -> "62xxxxxxxxxx" (atau "" kalau kosong)
export function normalizeWA(input) {
  let d = String(input || "").replace(/[^\d]/g, ""); // hanya angka
  if (!d) return "";
  if (d.startsWith("620")) d = "62" + d.slice(3);     // 6208.. -> 628..
  else if (d.startsWith("0")) d = "62" + d.slice(1);  // 08..   -> 628..
  else if (d.startsWith("8")) d = "62" + d;           // 8..    -> 628..
  else if (!d.startsWith("62")) d = "62" + d;         // fallback
  return d;
}

// Valid kalau format 62 + 8xxxxxxxx (total 10-15 digit)
export function validWA(input) {
  const d = normalizeWA(input);
  return /^628\d{7,12}$/.test(d);
}

// Tampilan enak dibaca: 0812-3456-7890
export function tampilWA(input) {
  const d = normalizeWA(input);
  if (!d) return "";
  const lokal = "0" + d.slice(2);
  return lokal.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
}
