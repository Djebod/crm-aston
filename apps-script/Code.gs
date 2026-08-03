/*************************************************************
 * ASTON CRM — Apps Script Web App (jembatan ke Sheets & Drive)
 * Tempel kode ini di: Sheet -> Extensions -> Apps Script
 *
 * TAB "Leads" (baris pertama = judul kolom, urutan HARUS sama):
 * ID | Tanggal | Nama | Instansi | NoHP | Email | JenisEvent |
 * TanggalEvent | JumlahPax | EstimasiNilai | Sumber | Status |
 * PIC | Catatan | LinkDokumen | UpdatedAt
 *
 * TAB "Users" (baris pertama = judul kolom):
 * Email | Nama | PasswordHash | Role | Aktif | ResetToken | ResetExpiry
 *************************************************************/

const SHEET_LEADS = "Leads";
const SHEET_USERS = "Users";
const SHEET_AKT = "Aktivitas";
const SHEET_COMP = "Companies";
const FOLDER_ID = "PASTE_ID_FOLDER_DRIVE_DISINI"; // folder Google Drive untuk dokumen
const APP_URL = "https://crm-aston.vercel.app"; // ganti dengan URL aplikasi Anda (untuk link reset password)

/*** BACA DATA (GET) ***/
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "leads";
  if (action === "leads") return json({ status: "ok", data: bacaLeads() });
  if (action === "aktivitas") return json({ status: "ok", data: bacaAktivitas() });
  if (action === "companies") return json({ status: "ok", data: bacaCompanies() });
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
    if (action === "updateUser") return json(updateUser(body));
    if (action === "requestReset") return json(requestReset(body));
    if (action === "doReset") return json(doReset(body));
    if (action === "addLead") return json(tambahLead(body));
    if (action === "updateLead") return json(updateLead(body));
    if (action === "addActivity") return json(tambahAktivitas(body));
    if (action === "listCompanies") return json({ status: "ok", data: bacaCompanies() });
    if (action === "importCompanies") return json(importCompanies(body));

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
  const status = b.status || "Tentative";
  sheet(SHEET_LEADS).appendRow([
    id, now, b.nama || "", b.instansi || "", b.nohp || "", b.email || "",
    b.jenisEvent || "", b.tanggalEvent || "", b.jumlahPax || "", b.estimasiNilai || "",
    b.sumber || "", status, b.pic || "", b.catatan || "", linkDok, now,
    b.alasanCancel || "", b.oleh || ""
  ]);
  logStatus(id, b.nama || "", "-", status, b.alasanCancel || "", b.oleh || "");
  return { status: "ok", id: id, linkDokumen: linkDok };
}

function updateLead(b) {
  const sh = sheet(SHEET_LEADS);
  const values = sh.getDataRange().getValues();
  const header = values[0];
  const idxStatus = header.indexOf("Status");
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(b.id)) {
      const row = i + 1;
      const statusLama = idxStatus >= 0 ? String(values[i][idxStatus]) : "";
      const map = {
        Nama: b.nama, Instansi: b.instansi, NoHP: b.nohp, Email: b.email,
        JenisEvent: b.jenisEvent, TanggalEvent: b.tanggalEvent, JumlahPax: b.jumlahPax,
        EstimasiNilai: b.estimasiNilai, Sumber: b.sumber, Status: b.status,
        PIC: b.pic, Catatan: b.catatan, AlasanCancel: b.alasanCancel
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
      const colBy = header.indexOf("UpdatedBy") + 1;
      if (colBy > 0 && b.oleh !== undefined) sh.getRange(row, colBy).setValue(b.oleh || "");

      // Catat perubahan status (kalau berubah)
      if (b.status !== undefined && String(b.status) !== statusLama) {
        logStatus(b.id, b.nama || values[i][header.indexOf("Nama")] || "", statusLama, b.status, b.alasanCancel || "", b.oleh || "");
      }
      return { status: "ok" };
    }
  }
  return { status: "error", message: "ID tidak ditemukan" };
}

// Catat riwayat perubahan status ke tab Log_Status (dibuat otomatis kalau belum ada)
function logStatus(id, nama, lama, baru, alasan, oleh) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Log_Status");
  if (!sh) {
    sh = ss.insertSheet("Log_Status");
    sh.appendRow(["Waktu", "LeadID", "Nama", "StatusLama", "StatusBaru", "AlasanCancel", "Oleh"]);
  }
  sh.appendRow([formatTgl(new Date()), id, nama, lama, baru, alasan || "", oleh || ""]);
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

/*** ===== SALES ACTIVITY ===== ***/
function tambahAktivitas(b) {
  const id = "A" + Date.now();
  const comp = String(b.companyName || "").trim();
  if (comp) pastikanCompany(comp, b.segmentation || "");
  let foto = "";
  if (b.fotoBase64) foto = simpanDokumen(b.fotoBase64, id + "_" + (b.fotoNama || "foto"));
  sheet(SHEET_AKT).appendRow([
    id, b.date || "", b.time || "", b.salesName || "", comp, b.segmentation || "",
    b.picName || "", b.position || "", b.phone || "", b.description || "", b.activity || "", foto
  ]);
  return { status: "ok", id: id, photo: foto };
}

function bacaAktivitas() {
  const values = sheet(SHEET_AKT).getDataRange().getValues();
  const header = values.shift();
  return values.map(function (r) {
    const o = {};
    header.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

// Company name harus unik (tidak boleh dobel persis). PIC & Position bebas per aktivitas.
function pastikanCompany(nama, seg) {
  const sh = sheet(SHEET_COMP);
  const values = sh.getDataRange().getValues();
  const target = nama.trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === target) return; // sudah ada -> jangan tambah lagi
  }
  sh.appendRow([nama, seg]);
}

function bacaCompanies() {
  const values = sheet(SHEET_COMP).getDataRange().getValues();
  values.shift();
  return values.filter(function (r) { return r[0]; }).map(function (r) {
    return { CompanyName: r[0], Segmentation: r[1] };
  });
}

// Import massal dari file (CSV). Nama company tetap dijaga unik (tidak dobel).
function importCompanies(b) {
  const rows = (b && b.rows) || [];
  if (rows.length === 0) {
    return { status: "error", message: "Tidak ada data. Fungsi ini dijalankan dari aplikasi (upload CSV), bukan tombol Run editor." };
  }
  const sh = sheet(SHEET_COMP);
  const values = sh.getDataRange().getValues();
  const ada = {};
  for (var i = 1; i < values.length; i++) ada[String(values[i][0]).trim().toLowerCase()] = true;
  const toAppend = [];
  for (var j = 0; j < rows.length; j++) {
    const nama = String(rows[j].companyName || "").trim();
    if (!nama) continue;
    const key = nama.toLowerCase();
    if (ada[key]) continue;
    ada[key] = true;
    toAppend.push([nama, rows[j].segmentation || ""]);
  }
  if (toAppend.length) {
    sh.getRange(sh.getLastRow() + 1, 1, toAppend.length, 2).setValues(toAppend);
  }
  return { status: "ok", ditambah: toAppend.length };
}

/*** ===== USERS ===== ***/
function bacaUsers() {
  const values = sheet(SHEET_USERS).getDataRange().getValues();
  values.shift();
  return values.map(function (r) {
    return { Email: r[0], Nama: r[1], Role: r[3], Aktif: r[4] }; // tanpa hash & token
  });
}

function cariUserByEmail(email) {
  const values = sheet(SHEET_USERS).getDataRange().getValues();
  values.shift();
  const target = String(email).toLowerCase().trim();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase().trim() === target) {
      return {
        Email: values[i][0], Nama: values[i][1], PasswordHash: values[i][2],
        Role: values[i][3], Aktif: values[i][4]
      };
    }
  }
  return null;
}

function tambahUser(b) {
  const email = String(b.email).toLowerCase().trim();
  if (cariUserByEmail(email)) return; // hindari duplikat
  sheet(SHEET_USERS).appendRow([ email, b.nama || "", b.passwordHash || "", b.role || "marketing", true, "", "" ]);
}

// Edit user: nama / role / aktif / (opsional) passwordHash baru
function updateUser(b) {
  const sh = sheet(SHEET_USERS);
  const values = sh.getDataRange().getValues();
  const target = String(b.email).toLowerCase().trim();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase().trim() === target) {
      const row = i + 1;
      if (b.nama !== undefined) sh.getRange(row, 2).setValue(b.nama);
      if (b.passwordHash) sh.getRange(row, 3).setValue(b.passwordHash);
      if (b.role !== undefined) sh.getRange(row, 4).setValue(b.role);
      if (b.aktif !== undefined) sh.getRange(row, 5).setValue(b.aktif);
      return { status: "ok" };
    }
  }
  return { status: "error", message: "User tidak ditemukan" };
}

/*** ===== LUPA PASSWORD ===== ***/
function requestReset(b) {
  const sh = sheet(SHEET_USERS);
  const values = sh.getDataRange().getValues();
  const target = String(b.email).toLowerCase().trim();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase().trim() === target) {
      if (String(values[i][4]).toLowerCase() === "false") break; // non-aktif: diam saja
      const row = i + 1;
      const token = Utilities.getUuid().replace(/-/g, "");
      const expiry = Date.now() + 60 * 60 * 1000; // berlaku 1 jam
      sh.getRange(row, 6).setValue(token);
      sh.getRange(row, 7).setValue(expiry);
      kirimEmailReset(values[i][0], values[i][1], token);
      break;
    }
  }
  // Demi keamanan, selalu balas ok (tidak membocorkan email terdaftar / tidak)
  return { status: "ok" };
}

function doReset(b) {
  const sh = sheet(SHEET_USERS);
  const values = sh.getDataRange().getValues();
  const target = String(b.email).toLowerCase().trim();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase().trim() === target) {
      const row = i + 1;
      const token = String(values[i][5] || "");
      const expiry = Number(values[i][6] || 0);
      if (!token || token !== String(b.token)) return { status: "error", message: "Link reset tidak valid." };
      if (Date.now() > expiry) return { status: "error", message: "Link reset sudah kedaluwarsa. Minta ulang." };
      sh.getRange(row, 3).setValue(b.passwordHash); // set hash baru
      sh.getRange(row, 6).setValue("");             // hapus token
      sh.getRange(row, 7).setValue("");
      return { status: "ok" };
    }
  }
  return { status: "error", message: "Akun tidak ditemukan." };
}

function kirimEmailReset(email, nama, token) {
  const link = APP_URL + "/reset?email=" + encodeURIComponent(email) + "&token=" + token;
  const subjek = "Reset Password — Aston CRM";
  const isi =
    "Halo " + (nama || "") + ",\n\n" +
    "Kami menerima permintaan reset password untuk akun Aston CRM Anda.\n" +
    "Klik tautan di bawah untuk membuat password baru (berlaku 1 jam):\n\n" +
    link + "\n\n" +
    "Jika Anda tidak meminta ini, abaikan email ini.\n\n" +
    "— Aston CRM, Aston Cirebon";
  MailApp.sendEmail(email, subjek, isi);
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
