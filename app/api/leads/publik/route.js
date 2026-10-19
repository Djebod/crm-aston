import { NextResponse } from "next/server";
import { sql, waktuJakarta } from "@/lib/db";
import { kirimEmail } from "@/lib/mail";

// ===== Lead masuk dari situs publik MICE (https://mice-helper.vercel.app) =====
// Dipanggil oleh fungsi /api/lead di project mice-helper (server ke server) dengan header
// x-intake-token = MICE_INTAKE_TOKEN. Membuat Lead (Tentative) + booking ruangan Tentative,
// menentukan PIC dari segmen (pengaturan `mice_routing`), lalu kirim email ke `mice_email_sales` + email PIC.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUMBER = "Website MICE";

const DEFAULT_ROUTING = [
  "Company = Wahyu Kusuma Dinata",
  "Social Event = Wahyu Kusuma Dinata",
  "Personal = Wahyu Kusuma Dinata",
  "Event Organizer = Wahyu Kusuma Dinata",
  "Wedding Organizer = Wahyu Kusuma Dinata",
  "Government = Tri Wahyuni Handayani",
  "BUMN = Tri Wahyuni Handayani",
  "* = Maya Dhamayanti",
].join("\n");

const SEEDS = [
  ["mice_email_sales", "allsales@astoncirebon.com",
    "Penerima email notifikasi lead baru dari situs MICE (mice-helper.vercel.app). Pisahkan dengan koma bila lebih dari satu."],
  ["mice_routing", DEFAULT_ROUTING,
    "Pembagian PIC lead dari situs MICE: satu baris per segmen, format 'Segmen = Nama sales' (nama persis seperti di menu Tim). Baris '* = ...' dipakai untuk segmen lainnya."],
];

// Rate limit sederhana per instance (serverless: best-effort). Maks 6 request / menit / IP.
const hits = new Map();
function kebanyakan(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(ip, arr);
  return arr.length > 6;
}

const keMenit = (hhmm) => { const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null; };
const keJam = (menit) => { const m = Math.max(0, Math.min(23 * 60 + 59, menit)); return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
const teks = (v, maks = 300) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, maks);
const angka = (v) => { const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10); return isNaN(n) ? 0 : n; };
const rp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
const tglID = (s) => { const d = new Date(s + "T00:00:00+07:00"); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };

// jenis acara dari situs -> pilihan Jenis Event di CRM
function jenisEventCRM(jenis) {
  const j = String(jenis || "").toLowerCase();
  if (j.includes("wedding") || j.includes("resepsi")) return "Wedding";
  if (j.includes("gathering") || j.includes("outing")) return "Gathering";
  if (j.includes("ulang tahun")) return "Ulang Tahun";
  if (j.includes("meeting") || j.includes("training") || j.includes("workshop") || j.includes("seminar") || j.includes("talkshow") || j.includes("rapat")) return "Meeting / Rapat";
  return "Lainnya";
}

async function pastikanPengaturan() {
  for (const [kode, nilai, ket] of SEEDS) {
    await sql`INSERT INTO pengaturan (kode, nilai, keterangan) VALUES (${kode}, ${nilai}, ${ket}) ON CONFLICT DO NOTHING`;
  }
  const rows = await sql`SELECT kode, nilai FROM pengaturan WHERE kode IN ('mice_email_sales', 'mice_routing')`;
  const cfg = {};
  for (const r of rows) cfg[r.kode] = r.nilai;
  return {
    emailSales: String(cfg.mice_email_sales || SEEDS[0][1]),
    routing: String(cfg.mice_routing || DEFAULT_ROUTING),
  };
}

// "Segmen = Nama" per baris; '*' = default
function tentukanPIC(routing, segmen) {
  const peta = {}; let def = "";
  for (const baris of String(routing || "").split(/\r?\n/)) {
    const i = baris.indexOf("=");
    if (i < 0) continue;
    const k = baris.slice(0, i).trim().toLowerCase(), v = baris.slice(i + 1).trim();
    if (!k || !v) continue;
    if (k === "*") def = v; else peta[k] = v;
  }
  return peta[String(segmen || "").trim().toLowerCase()] || def || "";
}

async function emailPIC(nama) {
  if (!nama) return "";
  try {
    const r = await sql`SELECT email FROM users WHERE lower(nama) = ${String(nama).toLowerCase()} AND aktif <> false LIMIT 1`;
    return r.length ? String(r[0].email || "") : "";
  } catch (e) { return ""; }
}

// cek bentrok ruangan (jeda < 120 menit atau overlap). true = bentrok. Sama dengan /api/leads.
async function adaBentrokRuang(room, tanggal, mulai, selesai) {
  if (!room || !tanggal) return false;
  const s = keMenit(mulai), e = keMenit(selesai);
  if (s === null || e === null || e <= s) return true;
  const rows = await sql`SELECT jam_mulai, jam_selesai FROM room_booking WHERE room = ${room} AND tanggal = ${tanggal} AND status <> 'Cancel' AND status <> 'Expired'`;
  for (const r of rows) {
    const rs = keMenit(r.jam_mulai), re = keMenit(r.jam_selesai);
    if (rs === null || re === null) continue;
    if (!(s >= re + 120 || rs >= e + 120)) return true;
  }
  return false;
}

export async function POST(req) {
  try {
    const tokenBenar = process.env.MICE_INTAKE_TOKEN;
    if (!tokenBenar) return NextResponse.json({ status: "error", message: "MICE_INTAKE_TOKEN belum di-set di server CRM." }, { status: 503 });
    if (req.headers.get("x-intake-token") !== tokenBenar) return NextResponse.json({ status: "error", message: "Token tidak valid." }, { status: 401 });

    const b = await req.json();
    const ip = (req.headers.get("x-forwarded-for") || "0").split(",")[0].trim();
    if (b.website) return NextResponse.json({ status: "ok", leadId: "L0", pic: "" }); // honeypot: pura-pura sukses
    if (kebanyakan(ip)) return NextResponse.json({ status: "error", message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." });

    // ---- validasi ----
    const nama = teks(b.nama, 120);
    const instansi = teks(b.instansi, 160);
    const wa = String(b.wa || "").replace(/[^\d+]/g, "");
    const email = teks(b.email, 160).toLowerCase();
    const tanggal = String(b.tanggal || "");
    const pax = angka(b.pax);
    if (nama.length < 2) return NextResponse.json({ status: "error", message: "Nama wajib diisi." });
    if (wa.replace(/\D/g, "").length < 9) return NextResponse.json({ status: "error", message: "Nomor WhatsApp tidak valid." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return NextResponse.json({ status: "error", message: "Tanggal acara tidak valid." });
    if (pax < 1 || pax > 5000) return NextResponse.json({ status: "error", message: "Jumlah peserta tidak valid." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ status: "error", message: "Email tidak valid." });

    const ref = teks(b.ref, 40) || ("MICE-" + Date.now());
    const segmen = teks(b.segmen, 60);
    const jenisAsli = teks(b.jenis, 60);
    const hari = Math.max(1, Math.min(14, angka(b.hari) || 1));
    const jamMulai = keMenit(b.jamMulai) !== null ? keJam(keMenit(b.jamMulai)) : "09:00";
    const durasiJam = Math.max(2, Math.min(14, angka(b.durasiJam) || 8));
    const jamSelesai = keJam(keMenit(jamMulai) + durasiJam * 60);
    const ruangan = teks(b.ruangan, 80);          // nama ruangan sesuai master CRM
    const ruanganInfo = teks(b.ruanganInfo, 80);  // lantai / dimensi (hanya untuk catatan)
    const layout = teks(b.layout, 40);
    const paket = teks(b.paket, 80);
    const hargaPaket = angka(b.hargaPaket);
    const estimasi = angka(b.estimasi);
    const residential = !!b.residential;
    const kamarTambahan = angka(b.kamarTambahan);
    const ringkasan = String(b.ringkasan || "").trim().slice(0, 3000);

    const cfg = await pastikanPengaturan();
    const pic = tentukanPIC(cfg.routing, segmen);

    if (b.dryRun) return NextResponse.json({ status: "ok", dryRun: true, pic, emailSales: cfg.emailSales });

    // ---- simpan lead ----
    const now = waktuJakarta();
    const leadId = "L" + Date.now();
    const perluKamar = residential || kamarTambahan > 0 ? "Ya" : "";
    const jumlahKamar = residential ? Math.ceil(pax / (/single/i.test(paket) ? 1 : 2)) + kamarTambahan : kamarTambahan;
    const catatan = [
      `Dari situs MICE (${ref})${segmen ? " · Segmen: " + segmen : ""}${jenisAsli ? " · Acara: " + jenisAsli : ""}`,
      `Layout: ${layout || "-"} · Ruangan: ${ruangan || "belum dipilih"}${ruanganInfo ? " (" + ruanganInfo + ")" : ""} · Paket: ${paket || "-"}${hargaPaket ? " (" + rp(hargaPaket) + "/org)" : ""}`,
      `Mulai ${jamMulai}, ${hari} hari${b.tanggalAlt ? " · Tgl alternatif: " + teks(b.tanggalAlt, 20) : ""}`,
      ringkasan,
    ].filter(Boolean).join("\n");

    await sql`INSERT INTO leads (id, tanggal, nama, instansi, nohp, email, jenis_event, tanggal_event, jumlah_pax,
        estimasi_nilai, sumber, status, pic, catatan, link_dokumen, updated_at, alasan_cancel, updated_by,
        perlu_kamar, jumlah_kamar, revenue_room, lead_type)
      VALUES (${leadId}, ${now}, ${nama}, ${instansi}, ${wa}, ${email},
        ${jenisEventCRM(jenisAsli)}, ${tanggal}, ${String(pax)}, ${estimasi ? String(estimasi) : ""},
        ${SUMBER}, ${"Tentative"}, ${pic}, ${catatan},
        ${""}, ${now}, ${""}, ${SUMBER}, ${perluKamar}, ${jumlahKamar ? String(jumlahKamar) : ""}, ${""}, ${"MICE"})`;
    await sql`INSERT INTO log_status (waktu, lead_id, nama, status_lama, status_baru, alasan_cancel, oleh)
      VALUES (${now}, ${leadId}, ${nama}, ${"-"}, ${"Tentative"}, ${""}, ${SUMBER})`;

    // ---- booking ruangan Tentative (hari pertama). Bentrok -> ruangan dikosongkan untuk dijadwalkan sales ----
    let bookingCatatan = "";
    try {
      let room = "";
      if (ruangan) {
        const bentrok = await adaBentrokRuang(ruangan, tanggal, jamMulai, jamSelesai);
        if (bentrok) bookingCatatan = `Ruangan pilihan tamu (${ruangan}) bentrok — jadwalkan ulang`;
        else { room = ruangan; bookingCatatan = "Dari situs MICE " + ref + (hari > 1 ? ` — acara ${hari} hari, hari berikutnya belum diblok` : ""); }
      } else bookingCatatan = "Dari situs MICE " + ref + " — tentukan ruangan";
      await sql`INSERT INTO room_booking (id, room, tanggal, jam_mulai, jam_selesai, event_title, company, pax, setup, pic, status, catatan, created_at, created_by, lead_id,
          sumber, tamu_nama, tamu_wa, tamu_email, estimasi_harga, kode_booking)
        VALUES (${"RB" + Date.now()}, ${room}, ${tanggal}, ${jamMulai}, ${jamSelesai}, ${jenisAsli || "Meeting"}, ${instansi || nama}, ${String(pax)}, ${layout}, ${pic}, ${"Tentative"},
          ${bookingCatatan}, ${now}, ${SUMBER}, ${leadId}, ${SUMBER}, ${nama}, ${wa}, ${email}, ${estimasi ? String(estimasi) : ""}, ${ref})`;
    } catch (e) { bookingCatatan = "Booking ruangan tidak tercatat: " + (e?.message || e); }

    // ---- email ke tim sales + PIC ----
    let emailTerkirim = false, emailError = "";
    try {
      const tujuan = cfg.emailSales.split(",").map((s) => s.trim()).filter(Boolean);
      const picMail = await emailPIC(pic);
      if (picMail && !tujuan.map((x) => x.toLowerCase()).includes(picMail.toLowerCase())) tujuan.push(picMail);
      const appUrl = String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://crm-astoncirebon.vercel.app").replace(/\/+$/, "");
      const subject = `[Lead Baru] ${instansi || nama} · ${jenisAsli || "Meeting"} ${tglID(tanggal)} · ${pax} org${pic ? " · PIC " + pic : ""}`;
      const isi = [
        `Ada permintaan meeting baru dari situs MICE Aston Cirebon.`, ``,
        `No. permintaan : ${ref}`,
        `Lead CRM       : ${leadId}`,
        `PIC            : ${pic || "(belum ditentukan — cek pengaturan mice_routing)"}`,
        `Segmen         : ${segmen || "-"}`, ``,
        `Nama           : ${nama}`,
        `Instansi       : ${instansi || "-"}`,
        `WhatsApp       : ${wa}`,
        `Email          : ${email || "-"}`, ``,
        `Acara          : ${jenisAsli || "-"}`,
        `Tanggal        : ${tglID(tanggal)} · ${hari} hari · mulai ${jamMulai}`,
        b.tanggalAlt ? `Tgl alternatif : ${tglID(teks(b.tanggalAlt, 20))}` : "",
        `Peserta        : ${pax} orang`,
        `Layout         : ${layout || "-"}`,
        `Ruangan        : ${ruangan || "belum dipilih"}${ruanganInfo ? " (" + ruanganInfo + ")" : ""}`,
        `Paket          : ${paket || "-"}${hargaPaket ? " · " + rp(hargaPaket) + "/org" : ""}`,
        `Estimasi       : ${estimasi ? rp(estimasi) : "menunggu penawaran"}`,
        `Booking ruang  : ${bookingCatatan || "-"}`, ``,
        ringkasan ? `--- Ringkasan permintaan tamu ---\n${ringkasan}\n` : "",
        `Buka CRM: ${appUrl}`, ``,
        `Email ini dikirim otomatis oleh Aston CRM.`,
      ].filter((x) => x !== "").join("\n");
      if (tujuan.length) { await kirimEmail(tujuan.join(", "), subject, isi); emailTerkirim = true; }
    } catch (e) { emailError = e?.message || String(e); }

    return NextResponse.json({ status: "ok", leadId, pic, emailTerkirim, emailError });
  } catch (e) {
    return NextResponse.json({ status: "error", message: e?.message || String(e) });
  }
}
