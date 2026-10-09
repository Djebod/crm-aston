// ====== Alur persetujuan berjenjang GEO (Group Event Order) ======
// Dipakai bersama oleh API (server) dan halaman GEO (browser).
//
// Urutan: Sales (Ajukan) -> Sales Leader -> Front Office Manager
//         -> Financial Controller -> General Manager (Approve).
// Tanda tangan digital pada PDF hanya dicetak untuk tahap yang sudah
// benar-benar di-acknowledge, dan setiap langkah tercatat di audit trail.

import { isAdmin, milikSaya } from "./akses";

const low = (v) => String(v || "").trim().toLowerCase();

export const TAHAP_GEO = [
  { key: "sales", jabatan: "Sales Person", roles: ["marketing", "leader"], kolom: "Prepared by", aksi: "Ajukan", hasil: "Diajukan", pendek: "Sales" },
  { key: "leader", jabatan: "Sales Leader", roles: ["leader"], kolom: "Acknowledged by", aksi: "Acknowledge", hasil: "Acknowledged", pendek: "Leader" },
  { key: "fom", jabatan: "Front Office Manager", roles: ["fom"], kolom: "Acknowledged by", aksi: "Acknowledge", hasil: "Acknowledged", pendek: "FOM" },
  { key: "fc", jabatan: "Financial Controller", roles: ["fc"], kolom: "Acknowledged by", aksi: "Acknowledge", hasil: "Acknowledged", pendek: "FC" },
  { key: "gm", jabatan: "General Manager", roles: ["gm"], kolom: "Approved by", aksi: "Approve", hasil: "Approved", pendek: "GM" },
];

export const STATUS_GEO = {
  draft: "Draft",
  menunggu_leader: "Menunggu Sales Leader",
  menunggu_fom: "Menunggu Front Office Manager",
  menunggu_fc: "Menunggu Financial Controller",
  menunggu_gm: "Menunggu General Manager",
  disetujui: "Disetujui (GM)",
  ditolak: "Dikembalikan",
};

// Warna badge status (kelas Tailwind)
export const WARNA_STATUS = {
  draft: "bg-slate-100 text-slate-600",
  menunggu_leader: "bg-amber-50 text-amber-700",
  menunggu_fom: "bg-amber-50 text-amber-700",
  menunggu_fc: "bg-amber-50 text-amber-700",
  menunggu_gm: "bg-amber-50 text-amber-700",
  disetujui: "bg-emerald-50 text-emerald-700",
  ditolak: "bg-rose-50 text-rose-700",
};

export function labelStatus(status) {
  return STATUS_GEO[status] || STATUS_GEO.draft;
}

/** Status turunan dari jumlah tahap yang sudah disetujui. */
export function statusDari(approvals) {
  const n = (approvals || []).length;
  if (n >= TAHAP_GEO.length) return "disetujui";
  if (n === 0) return "draft";
  return "menunggu_" + TAHAP_GEO[n].key;
}

function parseJson(v, fallback) {
  if (Array.isArray(v) || (v && typeof v === "object")) return v;
  try {
    const x = JSON.parse(v || "");
    return x ?? fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Bentuk seragam satu baris GEO dari database:
 * { data, approvals, audit, status, createdBy, salesPerson }
 */
export function parseGeoRow(row) {
  const data = parseJson(row?.Data, {}) || {};
  const approvals = parseJson(row?.Approvals, []) || [];
  const audit = parseJson(row?.Audit, []) || [];
  const status = row?.Status || statusDari(approvals);
  return {
    data,
    approvals: Array.isArray(approvals) ? approvals : [],
    audit: Array.isArray(audit) ? audit : [],
    status,
    createdBy: row?.CreatedBy || "",
    salesPerson: data.salesPerson || "",
  };
}

/** Indeks tahap berikutnya yang masih menunggu, atau -1 bila sudah selesai. */
export function tahapBerikut(info) {
  if (!info) return -1;
  if (info.status === "disetujui") return -1;
  const n = (info.approvals || []).length;
  return n < TAHAP_GEO.length ? n : -1;
}

/** Apakah user ini pembuat / sales pemilik GEO. */
export function pemilikGeo(user, info) {
  return milikSaya(user, info?.createdBy, info?.salesPerson);
}

/** Apakah user boleh bertindak (ajukan / acknowledge / approve) pada tahap berikutnya. */
export function bolehBertindak(user, info) {
  const i = tahapBerikut(info);
  if (i < 0 || !user) return false;
  if (isAdmin(user)) return true;
  if (i === 0) return pemilikGeo(user, info);
  return TAHAP_GEO[i].roles.includes(low(user.role));
}

/** Boleh mengubah isi GEO: admin, leader, atau pembuatnya. */
export function bolehEdit(user, info) {
  if (!user) return false;
  return isAdmin(user) || low(user.role) === "leader" || pemilikGeo(user, info);
}

/** Boleh mengirim ulang alert email: admin, leader, pembuat, atau penyetuju yang sedang giliran. */
export function bolehKirimAlert(user, info) {
  if (!user || !info || info.status === "draft") return false;
  return isAdmin(user) || low(user.role) === "leader" || pemilikGeo(user, info) || bolehBertindak(user, info);
}

/** Boleh menghapus: admin kapan saja; leader / pembuat hanya bila masih draft atau dikembalikan. */
export function bolehHapus(user, info) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!(low(user.role) === "leader" || pemilikGeo(user, info))) return false;
  return info.status === "draft" || info.status === "ditolak";
}
