/*************************************************************
 * ASTON CRM — Apps Script Web App (jembatan ke Sheets & Drive)
 * Tempel kode ini di: Sheet -> Extensions -> Apps Script
 *
 * SIAPKAN 2 TAB DI GOOGLE SHEET:
 *
 * Tab "Leads" (baris pertama = judul kolom, urutan HARUS sama):
 * ID | Tanggal | Nama | Instansi | NoHP | Email | JenisEvent |
 * TanggalEvent | JumlahPax | EstimasiNilai | Sumber | Status |
 * PIC | Catatan | LinkDokumen | UpdatedAt
 *
 * Tab "Users" (baris pertama = judul kolom):
 * Email | Nama | PasswordHash | Role | Aktif
 *************************************************************/

const SHEET_LEADS = "Leads";
const SHEET_USERS = "Users";
const FOLDER_ID = "PASTE_ID_FOLDER_DRIVE_DISINI"; // folder Google Drive untuk dokumen

/*** BACA DATA (GET) ***/
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "leads";
  if (action === "leads") return json({ status: "ok", data: bacaLeads() });
  return json({ status: "error", message: "action tidak dikenal" });
}

/*** TULIS DATA (POST) ***/
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "auth") return json({ status: "ok", user: cariUserByEmail(body.email) });
    if (action === "listUsers") return json({ status: "ok", data: bacaUsers() });
    if (action === "addUser") { tambahUser(body); return json({ status: "ok" }); }
    if (action === "addLead") return json(tambahLead(body));
    if (action === "updateLead") return json(updateLead(body));

    return json({ status: "error", message: "action tidak dikenal" });
  } catch (err) {
    return json({ status: "error", message: String(err) });
  }
}

/*** ===== LEADS ===== ***/
function tambahLead(b) {
  const id = "L" + Date.now();
  const now = formatTgl(new Date());
  let linkDok = "";
  if (b.dokumenBase64) linkDok = simpanDokumen(b.dokumenBase64, id + "_" + (b.dokumenNama || "dokumen"));
  sheet(SHEET_LEADS).appendRow([
    id, now, b.nama || "", b.instansi || "", b.nohp || "", b.email || "",
    b.jenisEvent || "", b.tanggalEvent || "", b.jumlahPax || "", b.estimasiNilai || "",
    b.sumber || "", b.status || "Baru", b.pic || "", b.catatan || "", linkDok, now
  ]);
  return { status: "ok", id: id, linkDokumen: linkDok };
}

function updateLead(b) {
  const sh = sheet(SHEET_LEADS);
  const values = sh.getDataRange().getValues();
  const header = values[0];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(b.id)) {
      const row = i + 1;
      const map = {
        Nama: b.nama, Instansi: b.instansi, NoHP: b.nohp, Email: b.email,
        JenisEvent: b.jenisEvent, TanggalEvent: b.tanggalEvent, JumlahPax: b.jumlahPax,
        EstimasiNilai: b.estimasiNilai, Sumber: b.sumber, Status: b.status,
        PIC: b.pic, Catatan: b.catatan
      };
      header.forEach(function (h, idx) {
        if (map[h] !== undefined) sh.getRange(row, idx + 1).setValue(map[h]);
      });
      if (b.dokumenBase64) {
        const link = simpanDokumen(b.dokumenBase64, b.id + "_" + (b.dokumenNama || "dokumen"));
        const col = header.indexOf("LinkDokumen") + 1;
        if (col > 0) sh.getRange(row, col).setValue(link);
      }
      const colUpd = header.indexOf("UpdatedAt") + 1;
      if (colUpd > 0) sh.getRange(row, colUpd).setValue(formatTgl(new Date()));
      return { status: "ok" };
    }
  }
  return { status: "error", message: "ID tidak ditemukan" };
}

function bacaLeads() {
  const values = sheet(SHEET_LEADS).getDataRange().getValues();
  const header = values.shift();
  return values.map(function (r) {
    const o = {};
    header.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

/*** ===== USERS ===== ***/
function bacaUsers() {
  const values = sheet(SHEET_USERS).getDataRange().getValues();
  values.shift();
  return values.map(function (r) {
    return { Email: r[0], Nama: r[1], Role: r[3], Aktif: r[4] }; // tanpa PasswordHash
  });
}

function cariUserByEmail(email) {
  const values = sheet(SHEET_USERS).getDataRange().getValues();
  values.shift();
  const target = String(email).toLowerCase().trim();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase().trim() === target) {
      return { Email: values[i][0], Nama: values[i][1], PasswordHash: values[i][2], Role: values[i][3], Aktif: values[i][4] };
    }
  }
  return null;
}

function tambahUser(b) {
  sheet(SHEET_USERS).appendRow([
    String(b.email).toLowerCase().trim(), b.nama || "", b.passwordHash || "", b.role || "marketing", true
  ]);
}

/*** ===== DRIVE (UPLOAD DOKUMEN) ===== ***/
function simpanDokumen(base64, namaFile) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const parts = String(base64).split(",");
  const meta = parts[0] || "";
  const dataStr = parts.length > 1 ? parts[1] : parts[0];
  var mime = "image/jpeg";
  var m = meta.match(/data:(.*?);base64/);
  if (m) mime = m[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(dataStr), mime, namaFile);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/*** ===== HELPER ===== ***/
function sheet(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function formatTgl(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"); }
