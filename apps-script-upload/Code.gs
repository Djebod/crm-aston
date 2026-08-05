/*************************************************************
 * UPLOAD FOTO KE GOOGLE DRIVE (untuk Aston CRM versi Firebase)
 * Fungsinya HANYA menyimpan foto ke Drive dan mengembalikan link.
 * Semua data lain (leads, aktivitas, dst) ada di Firestore.
 *
 * Cara pasang:
 *  1) script.google.com -> New project -> tempel kode ini
 *  2) Deploy -> New deployment -> Web app
 *     Execute as: Me | Who has access: Anyone
 *  3) Authorize (izinkan akses Drive) -> salin Web app URL
 *  4) Isi URL itu ke DRIVE_UPLOAD_URL di .env.local & Vercel
 *************************************************************/

const FOLDER_ID = "1v_vC83UUEKpw9HkK3VKNrFYpurQ2pHxO"; // folder Drive untuk foto

function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents);
    if (b.action !== "uploadFoto") return json({ status: "error", message: "action tidak dikenal" });
    const url = simpanFoto(b.base64, b.nama || ("foto_" + Date.now()));
    return json({ status: "ok", url: url });
  } catch (err) {
    return json({ status: "error", message: String(err) });
  }
}

function simpanFoto(base64, nama) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const parts = String(base64).split(",");
  const meta = parts[0] || "";
  const dataStr = parts.length > 1 ? parts[1] : parts[0];
  var mime = "image/jpeg";
  var m = meta.match(/data:(.*?);base64/);
  if (m) mime = m[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(dataStr), mime, nama);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
