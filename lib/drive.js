// Upload foto ke Google Drive lewat Apps Script Web App kecil (DRIVE_UPLOAD_URL).
// Dipakai supaya tidak perlu Firebase Storage (yang butuh upgrade Blaze).
export async function uploadFotoDrive(base64, nama) {
  const url = process.env.DRIVE_UPLOAD_URL;
  if (!url || !base64) return ""; // kalau belum di-set / tidak ada foto -> kosongkan
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "uploadFoto", base64, nama }),
      redirect: "follow",
    });
    const data = await res.json();
    return data && data.status === "ok" ? data.url || "" : "";
  } catch (e) {
    return "";
  }
}
