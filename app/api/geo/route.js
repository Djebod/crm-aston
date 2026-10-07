import { NextResponse } from "next/server";
import { sql, raw, waktuJakarta, pastikanKolomGeo } from "@/lib/db";
import { TAHAP_GEO, parseGeoRow, tahapBerikut, bolehBertindak, bolehEdit, bolehHapus, statusDari } from "@/lib/geoApproval";
import { isAdmin } from "@/lib/akses";

export const runtime = "nodejs";
// Jangan di-cache saat build: data harus selalu diambil segar dari database.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const low = (v) => String(v || "").trim().toLowerCase();
const ok = (extra = {}) => NextResponse.json({ status: "ok", ...extra });
const gagal = (message, code) => NextResponse.json({ status: "error", message }, code ? { status: code } : undefined);

const KOLOM = `id AS "ID", geo_no AS "GeoNo", event_title AS "EventTitle", company AS "Company",
  data AS "Data", created_at AS "CreatedAt", created_by AS "CreatedBy",
  status AS "Status", approvals AS "Approvals", audit AS "Audit"`;

/**
 * Identitas pelaku diambil dari database berdasarkan email (bukan dari body),
 * supaya role untuk persetujuan tidak bisa dipalsukan dari browser.
 */
async function siapa(email) {
  const em = low(email);
  if (!em) return null;
  const adminEmail = low(process.env.ADMIN_EMAIL);
  if (adminEmail && em === adminEmail) return { email: em, nama: process.env.ADMIN_NAME || "Super Admin", role: "admin" };
  const r = await sql`SELECT email, nama, role, aktif FROM users WHERE email = ${em}`;
  if (!r.length || r[0].aktif === false) return null;
  return { email: em, nama: r[0].nama || em, role: low(r[0].role) || "marketing" };
}

async function ambilRow(id) {
  const r = await sql`SELECT id AS "ID", geo_no AS "GeoNo", event_title AS "EventTitle", company AS "Company",
    data AS "Data", created_at AS "CreatedAt", created_by AS "CreatedBy",
    status AS "Status", approvals AS "Approvals", audit AS "Audit" FROM geo WHERE id = ${id}`;
  return r[0] || null;
}

function entriAudit(aksi, user, ket) {
  return { waktu: waktuJakarta(), aksi, oleh: user?.nama || "", email: user?.email || "", role: user?.role || "", ket: ket || "" };
}

async function simpanAlur(id, status, approvals, audit) {
  await sql`UPDATE geo SET status = ${status}, approvals = ${JSON.stringify(approvals)}, audit = ${JSON.stringify(audit)} WHERE id = ${id}`;
}

/** Catat tahap berikutnya (Ajukan / Acknowledge / Approve) atas nama user. */
async function majukanTahap(id, user, catatan) {
  const row = await ambilRow(id);
  if (!row) return "GEO tidak ditemukan.";
  const info = parseGeoRow(row);
  const i = tahapBerikut(info);
  if (i < 0) return "GEO ini sudah disetujui penuh.";
  if (!bolehBertindak(user, info)) {
    return `Tahap ini harus dilakukan oleh ${TAHAP_GEO[i].jabatan}` + (i === 0 ? " (sales pembuat GEO)." : ".");
  }
  const t = TAHAP_GEO[i];
  const approvals = [...info.approvals, {
    tahap: t.key, jabatan: t.jabatan, nama: user.nama, email: user.email, role: user.role,
    waktu: waktuJakarta(), catatan: String(catatan || "").trim(),
  }];
  const status = statusDari(approvals);
  const ket = (isAdmin(user) && !t.roles.includes(user.role) && i > 0 ? "Dilakukan oleh admin mewakili " + t.jabatan + ". " : "") + String(catatan || "").trim();
  const audit = [...info.audit, entriAudit(`${t.hasil} — ${t.jabatan}`, user, ket)];
  await simpanAlur(id, status, approvals, audit);
  return null;
}

export async function GET() {
  try {
    await pastikanKolomGeo();
    const rows = await raw(`SELECT ${KOLOM} FROM geo ORDER BY created_at DESC`);
    return ok({ data: rows });
  } catch (e) {
    return gagal(e?.message || String(e));
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    await pastikanKolomGeo();
    const user = await siapa(b.email);
    if (!user) return gagal("Sesi tidak dikenali. Silakan login ulang.", 401);
    const data = typeof b.data === "string" ? b.data : JSON.stringify(b.data || {});

    if (b.action === "addGeo") {
      const id = "GEO" + Date.now();
      const audit = [entriAudit("Dibuat", user, "GEO " + (b.geoNo || ""))];
      await sql`INSERT INTO geo (id, geo_no, event_title, company, data, created_at, created_by, status, approvals, audit)
        VALUES (${id}, ${b.geoNo || ""}, ${b.eventTitle || ""}, ${b.company || ""}, ${data}, ${waktuJakarta()}, ${user.nama},
                ${"draft"}, ${"[]"}, ${JSON.stringify(audit)})`;
      if (b.ajukan) {
        const err = await majukanTahap(id, user, "");
        if (err) return ok({ id, peringatan: err });
      }
      return ok({ id });
    }

    if (b.action === "updateGeo") {
      if (!b.id) return gagal("ID tidak ada.");
      const row = await ambilRow(b.id);
      if (!row) return gagal("GEO tidak ditemukan.");
      const info = parseGeoRow(row);
      if (!bolehEdit(user, info)) return gagal("Anda tidak berhak mengubah GEO ini.", 403);
      await sql`UPDATE geo SET geo_no = ${b.geoNo || ""}, event_title = ${b.eventTitle || ""}, company = ${b.company || ""}, data = ${data} WHERE id = ${b.id}`;
      // Isi berubah -> persetujuan yang sudah ada tidak berlaku lagi (harus diajukan ulang dari awal).
      const direset = info.approvals.length > 0;
      const audit = [...info.audit, entriAudit("Diubah", user, direset ? "Isi GEO diubah; seluruh persetujuan sebelumnya direset, harus diajukan ulang." : "")];
      await simpanAlur(b.id, "draft", [], audit);
      if (b.ajukan) {
        const err = await majukanTahap(b.id, user, "");
        if (err) return ok({ peringatan: err });
      }
      return ok();
    }

    if (b.action === "setujuiGeo") {
      if (!b.id) return gagal("ID tidak ada.");
      const err = await majukanTahap(b.id, user, b.catatan);
      return err ? gagal(err, 403) : ok();
    }

    if (b.action === "tolakGeo") {
      if (!b.id) return gagal("ID tidak ada.");
      const alasan = String(b.alasan || "").trim();
      if (!alasan) return gagal("Alasan pengembalian wajib diisi.");
      const row = await ambilRow(b.id);
      if (!row) return gagal("GEO tidak ditemukan.");
      const info = parseGeoRow(row);
      const i = tahapBerikut(info);
      if (i <= 0) return gagal("GEO ini belum diajukan, tidak ada yang bisa dikembalikan.");
      if (!bolehBertindak(user, info)) return gagal(`Hanya ${TAHAP_GEO[i].jabatan} yang bisa mengembalikan GEO pada tahap ini.`, 403);
      const audit = [...info.audit, entriAudit(`Dikembalikan — ${TAHAP_GEO[i].jabatan}`, user, alasan)];
      await simpanAlur(b.id, "ditolak", [], audit);
      return ok();
    }

    if (b.action === "logUnduhGeo") {
      if (!b.id) return gagal("ID tidak ada.");
      const row = await ambilRow(b.id);
      if (!row) return gagal("GEO tidak ditemukan.");
      const info = parseGeoRow(row);
      const audit = [...info.audit, entriAudit("Unduh PDF", user, "Status saat diunduh: " + info.status)];
      await simpanAlur(b.id, info.status, info.approvals, audit);
      return ok();
    }

    if (b.action === "hapusGeo") {
      const row = await ambilRow(b.id);
      if (!row) return ok();
      const info = parseGeoRow(row);
      if (!bolehHapus(user, info)) return gagal("GEO yang sudah masuk alur persetujuan hanya bisa dihapus admin.", 403);
      await sql`DELETE FROM geo WHERE id = ${b.id}`;
      return ok();
    }

    return gagal("action tidak dikenal");
  } catch (e) {
    return gagal(e?.message || String(e));
  }
}
