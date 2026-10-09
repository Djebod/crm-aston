/*************************************************************
 * ALERT EMAIL PERSETUJUAN BERJENJANG GEO (Aston CRM)
 *
 * Dipanggil oleh server CRM (Vercel) setiap kali GEO:
 *   - diajukan / di-acknowledge  -> email ke penyetuju tahap berikutnya
 *   - dikembalikan               -> email ke sales pembuat GEO
 *   - disetujui penuh oleh GM    -> email ke sales + semua penyetuju
 * Tombol "Kirim ulang alert" di CRM memanggil script yang sama.
 *
 * Script ini HANYA mengirim email (MailApp). Data GEO tetap di Neon.
 *
 * Cara pasang:
 *  1) script.google.com -> New project -> tempel kode ini -> simpan
 *  2) Ganti TOKEN di bawah dengan teks rahasia bebas (min. 20 karakter)
 *  3) Jalankan fungsi tesKirim sekali dari editor -> Authorize (izinkan Gmail)
 *     -> cek inbox Anda, harus ada email "TES alert GEO"
 *  4) Deploy -> New deployment -> Web app
 *     Execute as: Me | Who has access: Anyone -> Deploy -> salin Web app URL
 *  5) Di Vercel isi env:
 *        GEO_ALERT_URL   = Web app URL tadi
 *        GEO_ALERT_TOKEN = TOKEN yang sama persis dengan di bawah
 *     lalu Redeploy.
 *  Catatan: setiap kali kode ini diubah, Deploy -> Manage deployments
 *     -> Edit (pensil) -> Version: New version -> Deploy, supaya URL yang
 *     sama memakai kode terbaru.
 *************************************************************/

var TOKEN = "GANTI_DENGAN_TOKEN_RAHASIA";          // samakan dengan GEO_ALERT_TOKEN di Vercel
var NAMA_PENGIRIM = "Aston CRM - GEO";              // nama yang tampil di kolom "From"
var NAMA_HOTEL = "Aston Cirebon Hotel & Convention Center";
var CC_SELALU = "";                                 // opsional: email yang selalu di-CC, pisahkan koma

// ---------- Endpoint ----------
function doGet() {
  return teks("Apps Script alert GEO aktif. Endpoint ini dipanggil lewat POST oleh Aston CRM.");
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents || "{}");
    if (!TOKEN || TOKEN === "GANTI_DENGAN_TOKEN_RAHASIA") return json({ status: "error", message: "TOKEN di Apps Script belum diganti." });
    if (b.token !== TOKEN) return json({ status: "error", message: "Token tidak cocok." });
    if (b.action !== "alertGeo") return json({ status: "error", message: "action tidak dikenal" });

    var to = bersihkanEmail(b.to);
    var cc = bersihkanEmail((b.cc || []).concat(CC_SELALU.split(","))).filter(function (x) { return to.indexOf(x) < 0; });
    if (!to.length) return json({ status: "error", message: "Tidak ada alamat penerima." });

    var surat = susunEmail(b);
    MailApp.sendEmail({
      to: to.join(","),
      cc: cc.join(","),
      subject: surat.subject,
      htmlBody: surat.html,
      body: surat.text,
      name: NAMA_PENGIRIM,
      noReply: true,
    });
    return json({ status: "ok", terkirim: to.length + cc.length, to: to, cc: cc, sisaKuota: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return json({ status: "error", message: String(err) });
  }
}

// ---------- Isi email ----------
function susunEmail(b) {
  var g = b.geo || {};
  var t = b.tahap || {};
  var p = b.pelaku || {};
  var jenis = b.jenis || "menunggu";
  var ulang = b.ulang ? " (kirim ulang)" : "";
  var link = b.link || "";

  var judul, warna, pembuka, ajakan;
  if (jenis === "dikembalikan") {
    judul = "GEO " + g.no + " DIKEMBALIKAN oleh " + (p.jabatan || "penyetuju");
    warna = "#be123c";
    pembuka = "GEO di bawah ini <b>dikembalikan</b> oleh " + esc(p.nama || "-") + " (" + esc(p.jabatan || "-") + "). " +
      "Seluruh persetujuan sebelumnya dibatalkan. Mohon perbaiki lalu ajukan ulang.";
    ajakan = "Perbaiki & ajukan ulang";
  } else if (jenis === "disetujui") {
    judul = "GEO " + g.no + " DISETUJUI PENUH (GM)";
    warna = "#047857";
    pembuka = "GEO di bawah ini telah <b>disetujui penuh</b> oleh General Manager. Semua tanda tangan digital sudah tercetak pada PDF.";
    ajakan = "Buka & unduh PDF";
  } else {
    judul = "[Perlu " + (t.aksi || "Persetujuan") + "] GEO " + g.no + " - menunggu " + (t.jabatan || "Anda");
    warna = "#b45309";
    pembuka = "GEO di bawah ini <b>menunggu " + esc(t.aksi || "persetujuan").toLowerCase() + " Anda</b> sebagai <b>" + esc(t.jabatan || "-") + "</b>" +
      (t.urutan ? " (tahap " + esc(t.urutan) + ")" : "") + ".<br>" +
      "Tahap sebelumnya: " + esc(p.aksi || "-") + " oleh " + esc(p.nama || "-") + (p.waktu ? " pada " + esc(p.waktu) : "") + ".";
    ajakan = t.aksi ? (t.aksi + " sekarang") : "Buka GEO";
  }
  if (p.catatan) pembuka += "<br><i>Catatan: \"" + esc(p.catatan) + "\"</i>";

  var baris = [
    ["GEO No", g.no], ["Event", g.event], ["Company / Organizer", g.company],
    ["Sales", g.sales], ["Tanggal event", gabungTanggal(g.checkIn, g.checkOut)],
    ["Issued date", g.issuedDate], ["Status sekarang", g.status],
  ].filter(function (r) { return r[1]; });

  var tabel = baris.map(function (r) {
    return '<tr><td style="padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;white-space:nowrap">' + esc(r[0]) +
      '</td><td style="padding:6px 10px;border:1px solid #e2e8f0">' + esc(r[1]) + "</td></tr>";
  }).join("");

  var jenjang = (b.jenjang || []).map(function (j, i) {
    var ikon = j.status === "selesai" ? "[v]" : j.status === "menunggu" ? "[>]" : "[ ]";
    var ket = j.status === "selesai" ? (esc(j.nama || "") + (j.waktu ? " - " + esc(j.waktu) : ""))
      : j.status === "menunggu" ? "<b>menunggu</b>" + (j.nama ? " - " + esc(j.nama) : "")
      : (j.nama ? esc(j.nama) : "belum");
    var warnaBaris = j.status === "selesai" ? "#047857" : j.status === "menunggu" ? "#b45309" : "#94a3b8";
    return "<div style='padding:3px 0'><span style='font-family:monospace;color:" + warnaBaris + "'>" + ikon + "</span> " + (i + 1) + ". " + esc(j.jabatan) + " - <span style='color:#475569'>" + ket + "</span></div>";
  }).join("");

  var tombol = link
    ? '<p style="margin:18px 0"><a href="' + esc(link) + '" style="background:' + warna + ';color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;display:inline-block">' + esc(ajakan) + " &rarr;</a></p>" +
      '<p style="font-size:12px;color:#64748b">Jika tombol tidak berfungsi, buka: <a href="' + esc(link) + '">' + esc(link) + "</a></p>"
    : "";

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#0f172a">' +
    '<div style="background:#12263a;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0"><div style="font-size:12px;opacity:.8">' + esc(NAMA_HOTEL) + "</div>" +
    '<div style="font-size:18px;font-weight:bold;margin-top:2px">' + esc(judul) + esc(ulang) + "</div></div>" +
    '<div style="border:1px solid #e2e8f0;border-top:0;padding:18px;border-radius:0 0 10px 10px">' +
    '<p style="font-size:14px;line-height:1.5">' + pembuka + "</p>" +
    '<table style="border-collapse:collapse;width:100%;font-size:13px;margin:12px 0">' + tabel + "</table>" +
    (jenjang ? '<div style="font-size:13px;margin-top:10px"><div style="font-weight:bold;margin-bottom:4px">Jenjang persetujuan</div>' + jenjang + "</div>" : "") +
    tombol +
    '<p style="font-size:11px;color:#94a3b8;margin-top:16px">Email ini dikirim otomatis oleh Aston CRM' + esc(ulang) + ". Jangan balas email ini.</p>" +
    "</div></div>";

  var text = judul + ulang + "\n\n" + pembuka.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "") + "\n\n" +
    baris.map(function (r) { return r[0] + ": " + r[1]; }).join("\n") + (link ? "\n\nBuka: " + link : "");

  return { subject: judul + ulang, html: html, text: text };
}

// ---------- Util ----------
function bersihkanEmail(arr) {
  var out = [];
  (Array.isArray(arr) ? arr : String(arr || "").split(",")).forEach(function (x) {
    var e = String(x || "").trim().toLowerCase();
    if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && out.indexOf(e) < 0) out.push(e);
  });
  return out;
}
function gabungTanggal(a, b) {
  if (a && b && a !== b) return a + " s/d " + b;
  return a || b || "";
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function teks(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT);
}

// ---------- Tes manual (jalankan dari editor: pilih "tesKirim" -> Run) ----------
function tesKirim() {
  var saya = Session.getActiveUser().getEmail();
  var surat = susunEmail({
    jenis: "menunggu", ulang: false,
    geo: { no: "001/07/X/2026/SM/ACHCC/AS", event: "TES alert GEO", company: "PT Contoh", sales: "Nama Sales", checkIn: "2026-10-20", checkOut: "2026-10-21", issuedDate: "2026-10-07", status: "Menunggu Sales Leader" },
    tahap: { jabatan: "Sales Leader", aksi: "Acknowledge", urutan: "2 dari 5" },
    pelaku: { nama: "Nama Sales", jabatan: "Sales Person", aksi: "Diajukan", waktu: "2026-10-07 09:00", catatan: "Mohon dicek" },
    jenjang: [
      { jabatan: "Sales Person", nama: "Nama Sales", waktu: "2026-10-07 09:00", status: "selesai" },
      { jabatan: "Sales Leader", nama: "", status: "menunggu" },
      { jabatan: "Front Office Manager", status: "belum" },
      { jabatan: "Financial Controller", status: "belum" },
      { jabatan: "General Manager", status: "belum" },
    ],
    link: "https://crm-aston.vercel.app/geo",
  });
  MailApp.sendEmail({ to: saya, subject: surat.subject, htmlBody: surat.html, body: surat.text, name: NAMA_PENGIRIM });
  Logger.log("Email tes dikirim ke " + saya + ". Sisa kuota hari ini: " + MailApp.getRemainingDailyQuota());
}
