// ====== Alert email persetujuan berjenjang GEO ======
// Server memanggil Apps Script Web App (GEO_ALERT_URL + GEO_ALERT_TOKEN)
// yang bertugas mengirim email. Penerima ditentukan dari status GEO:
//   menunggu_<tahap> -> semua user aktif dengan role tahap itu (CC: sales pembuat)
//   ditolak          -> sales pembuat (CC: Sales Leader)
//   disetujui        -> sales pembuat + semua yang sudah acknowledge/approve
// Hasil pengiriman terakhir disimpan di kolom geo.alert_terakhir (untuk
// ditampilkan di modal dan tombol "Kirim ulang alert").

import { sql, waktuJakarta } from "./db";
import { TAHAP_GEO, labelStatus, parseGeoRow, tahapBerikut } from "./geoApproval";

const low = (v) => String(v || "").trim().toLowerCase();
const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const unik = (arr) => [...new Set(arr.map(low).filter(emailValid))];

/** Email user aktif yang memegang salah satu role (leader / fom / fc / gm). */
async function emailRole(roles) {
  const r = await sql`SELECT email, role, aktif FROM users`;
  return unik(r.filter((u) => roles.includes(low(u.role)) && u.aktif !== false).map((u) => u.email));
}

/** Email sales pembuat GEO: dari tahap "Ajukan", audit "Dibuat", atau nama di tabel users. */
async function emailPemilik(info) {
  const dariApproval = info.approvals[0]?.email;
  if (emailValid(low(dariApproval))) return low(dariApproval);
  const dariAudit = info.audit.find((a) => a.aksi === "Dibuat")?.email;
  if (emailValid(low(dariAudit))) return low(dariAudit);
  const nama = [info.salesPerson, info.createdBy].map(low).filter(Boolean);
  if (!nama.length) return "";
  const r = await sql`SELECT email, nama FROM users`;
  const u = r.find((x) => nama.includes(low(x.nama)));
  return u ? low(u.email) : "";
}

/** Entri audit terakhir yang merupakan tindakan alur (bukan unduh PDF). */
function pelakuTerakhir(info) {
  const a = [...info.audit].reverse().find((e) => !String(e.aksi || "").startsWith("Unduh"));
  if (!a) return {};
  const jab = String(a.aksi || "").split("—")[1]?.trim() || "";
  return { nama: a.oleh || "", jabatan: jab || (a.role || ""), aksi: String(a.aksi || "").split("—")[0].trim(), waktu: a.waktu || "", catatan: a.ket || "" };
}

/**
 * Susun rencana alert untuk kondisi GEO saat ini.
 * Mengembalikan null bila tidak ada yang perlu dikirim (masih draft).
 */
export async function rencanaAlert(row) {
  const info = parseGeoRow(row);
  const d = info.data || {};
  const next = tahapBerikut(info);
  const pemilik = await emailPemilik(info);
  let jenis, to = [], cc = [], tahap = null;

  if (info.status === "ditolak") {
    jenis = "dikembalikan";
    to = [pemilik];
    cc = await emailRole(["leader"]);
  } else if (info.status === "disetujui" || next < 0) {
    jenis = "disetujui";
    to = [pemilik, ...info.approvals.map((a) => a.email)];
  } else if (next >= 1) {
    jenis = "menunggu";
    const t = TAHAP_GEO[next];
    to = await emailRole(t.roles);
    cc = [pemilik];
    tahap = { jabatan: t.jabatan, aksi: t.aksi, urutan: `${next + 1} dari ${TAHAP_GEO.length}` };
  } else {
    return null; // draft: belum diajukan, belum ada yang perlu diberi tahu
  }

  to = unik(to);
  cc = unik(cc).filter((e) => !to.includes(e));
  let catatanPenerima = "";
  if (!to.length) {
    // Tidak ada user dengan role itu / email sales tidak ditemukan -> kirim ke admin sebagai cadangan.
    const admin = low(process.env.ADMIN_EMAIL);
    if (emailValid(admin)) { to = [admin]; catatanPenerima = "Penerima utama tidak ditemukan; dikirim ke admin."; }
  }

  const jenjang = TAHAP_GEO.map((t, i) => {
    const a = info.approvals[i];
    const def = (d.ttd || [])[i] || {};
    return a
      ? { jabatan: t.jabatan, nama: a.nama, waktu: a.waktu, status: "selesai" }
      : { jabatan: t.jabatan, nama: def.nama || "", status: i === next ? "menunggu" : "belum" };
  });

  const appUrl = String(process.env.APP_URL || "").replace(/\/+$/, "");
  return {
    jenis, to, cc, tahap, catatanPenerima,
    payload: {
      action: "alertGeo", jenis, to, cc, tahap,
      geo: {
        no: row.GeoNo || d.geoNo || "", event: row.EventTitle || d.eventTitle || "", company: row.Company || d.company || "",
        sales: d.salesPerson || info.createdBy || "", checkIn: d.checkIn || "", checkOut: d.checkOut || "",
        issuedDate: d.issuedDate || "", status: labelStatus(info.status),
      },
      pelaku: pelakuTerakhir(info),
      jenjang,
      link: appUrl ? `${appUrl}/geo?id=${encodeURIComponent(row.ID)}` : "",
    },
  };
}

/** Kirim payload ke Apps Script. Mengembalikan { ok, pesan, detail }. */
async function kirimKeAppsScript(payload, ulang) {
  const url = process.env.GEO_ALERT_URL;
  const token = process.env.GEO_ALERT_TOKEN;
  if (!url) return { ok: false, pesan: "GEO_ALERT_URL belum di-set di Vercel.", nonaktif: true };
  if (!token) return { ok: false, pesan: "GEO_ALERT_TOKEN belum di-set di Vercel.", nonaktif: true };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, token, ulang: !!ulang }),
      redirect: "follow",
      signal: ctrl.signal,
    });
    const teks = await res.text();
    let d = null;
    try { d = JSON.parse(teks); } catch (e) {}
    if (!d) return { ok: false, pesan: "Balasan Apps Script bukan JSON (cek deployment: akses 'Anyone', URL /exec)." };
    if (d.status !== "ok") return { ok: false, pesan: d.message || "Apps Script menolak." };
    return { ok: true, pesan: `Terkirim ke ${d.terkirim || 0} alamat.`, detail: d };
  } catch (e) {
    return { ok: false, pesan: e?.name === "AbortError" ? "Apps Script tidak merespons (timeout)." : (e?.message || String(e)) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kirim alert sesuai status GEO sekarang dan catat hasilnya di geo.alert_terakhir.
 * Tidak pernah melempar error — supaya proses approve tidak gagal gara-gara email.
 * @param {object} row  baris GEO (hasil SELECT dengan alias ID, GeoNo, Data, ...)
 * @param {object} user pelaku (nama/email)
 * @param {boolean} ulang true bila dari tombol "Kirim ulang alert"
 */
export async function kirimAlertGeo(row, user, ulang) {
  const catat = async (hasil) => {
    const rekam = { waktu: waktuJakarta(), ulang: !!ulang, oleh: user?.nama || user?.email || "", ...hasil };
    try { await sql`UPDATE geo SET alert_terakhir = ${JSON.stringify(rekam)} WHERE id = ${row.ID}`; } catch (e) {}
    return rekam;
  };
  try {
    const rencana = await rencanaAlert(row);
    if (!rencana) return { hasil: "lewat", pesan: "GEO masih draft, belum ada yang perlu diberi tahu." };
    if (!rencana.to.length) return catat({ hasil: "gagal", jenis: rencana.jenis, ke: [], cc: [], pesan: "Tidak ada alamat penerima (cek email & role di Kelola Tim)." });
    const r = await kirimKeAppsScript(rencana.payload, ulang);
    if (r.nonaktif) return { hasil: "nonaktif", pesan: r.pesan };
    return catat({
      hasil: r.ok ? "terkirim" : "gagal", jenis: rencana.jenis, ke: rencana.to, cc: rencana.cc,
      pesan: [r.pesan, rencana.catatanPenerima].filter(Boolean).join(" "),
    });
  } catch (e) {
    return catat({ hasil: "gagal", pesan: e?.message || String(e) });
  }
}
