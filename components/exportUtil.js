// Export data ke CSV yang bisa langsung dibuka di Excel. Tanpa library tambahan.

function toCSV(rows) {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = cell === null || cell === undefined ? "" : String(cell);
          return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        })
        .join(",")
    )
    .join("\r\n");
}

// rows: array of array; baris pertama = header
export function unduhCSV(namaFile, rows) {
  // \uFEFF = BOM, supaya Excel membaca UTF-8 dengan benar (karakter Indonesia tidak rusak)
  const isi = "\uFEFF" + toCSV(rows);
  const blob = new Blob([isi], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// nama file dengan stempel tanggal, mis. "aktivitas-2026-08-05.csv"
export function namaFileTanggal(prefix) {
  const d = new Date();
  const t = d.toISOString().slice(0, 10);
  return `${prefix}-${t}.csv`;
}
