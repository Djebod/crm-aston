// ====== Special Inquiry (Discount Allowance) & Interoffice Memo untuk GEO ======
// Dipakai bersama oleh halaman GEO dan halaman "Event With Special Inquiry".
//
// Data tersimpan di GEO.data.sp:
//   { aktif, komponen:[{id,nama}], rooms:{ <index kamar>: { sentec:"1006000", pax:"1", bd:{<idKomponen>:"150000"} } },
//     memoNo, memoTgl }
// Rumus (sesuai contoh memo):
//   Room Rate (DA)  = tarif SENTEC x pax
//   Disc.Allowance  = (tarif SENTEC - harga GEO) x pax        [otomatis]
//   Lodging Room    = Room Rate - seluruh komponen - Disc.Allowance [otomatis]
//   SENTEC total    = tarif SENTEC x qty x hari ; ACTUAL total = harga GEO x qty x hari
//   Nett DA = SENTEC - ACTUAL ; Percentage = Nett DA / SENTEC

export const angka = (n) => Number(String(n ?? "").replace(/[^\d]/g, "")) || 0;
export const rp = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

export const KODE_MEMO = "SM-MEMO";
export const MEMO_TERAKHIR_AWAL = 200; // nomor terakhir yang sudah terpakai sebelum sistem ini
export const MEMO_KODE_TENGAH = "20"; // segmen tengah nomor: SM-080/20/VII/2026

const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const BULAN_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HARI_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const idBaru = () => "s" + Math.random().toString(36).slice(2, 8);

export const KOMPONEN_SP_DEFAULT = () => [
  { id: "bfast", nama: "Breakfast" },
  { id: "cb1", nama: "Coffee Break" },
  { id: "lunch", nama: "Lunch" },
  { id: "cb2", nama: "Coffee Break" },
  { id: "dinner", nama: "Dinner" },
  { id: "pph", nama: "Pph 23/2%" },
];

export const SP_KOSONG = () => ({ aktif: false, komponen: KOMPONEN_SP_DEFAULT(), rooms: {}, memoNo: "", memoTgl: "" });
export const komponenSpBaru = () => ({ id: idBaru(), nama: "" });

/** Menyesuaikan data sp lama/kosong ke bentuk lengkap. */
export function normalisasiSp(sp) {
  const s = { ...SP_KOSONG(), ...(sp || {}) };
  if (!Array.isArray(s.komponen)) s.komponen = KOMPONEN_SP_DEFAULT();
  if (!s.rooms || typeof s.rooms !== "object") s.rooms = {};
  return s;
}

/** Jumlah malam dari check in – check out. */
export function malam(ci, co) {
  if (!ci || !co) return 0;
  const a = new Date(ci), b = new Date(co);
  if (isNaN(a) || isNaN(b)) return 0;
  const d = Math.round((b - a) / 86400000);
  return d > 0 ? d : 0;
}

export function nomorMemo(urut, tgl = new Date()) {
  const m = typeof tgl === "string" && tgl.match(/^(d{4})-(d{2})-(d{2})/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : tgl instanceof Date ? tgl : new Date(tgl);
  return `SM-${String(urut).padStart(3, "0")}/${MEMO_KODE_TENGAH}/${ROMAWI[d.getMonth() + 1]}/${d.getFullYear()}`;
}

export function tglEn(v, denganHari) {
  const d = v ? new Date(v) : null;
  if (!d || isNaN(d)) return "";
  const t = `${BULAN_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return denganHari ? `${HARI_EN[d.getDay()]}, ${t}` : t;
}

/** "2 - 4 November 2026" dari check in / check out. */
export function periodeEn(ci, co) {
  const a = ci ? new Date(ci) : null, b = co ? new Date(co) : null;
  if (!a || isNaN(a)) return "";
  if (!b || isNaN(b) || +a === +b) return `${a.getDate()} ${BULAN_EN[a.getMonth()]} ${a.getFullYear()}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()} - ${b.getDate()} ${BULAN_EN[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} ${BULAN_EN[a.getMonth()]} ${a.getFullYear()} - ${b.getDate()} ${BULAN_EN[b.getMonth()]} ${b.getFullYear()}`;
}

/**
 * Hitung seluruh angka Special Inquiry dari data GEO.
 * Mengembalikan baris per tipe kamar + total SENTEC / ACTUAL / Nett DA / persentase.
 */
export function hitungSp(g) {
  const sp = normalisasiSp(g?.sp);
  const komp = sp.komponen.filter((k) => String(k.nama || "").trim());
  let sentecTotal = 0, actualTotal = 0;
  const baris = [];
  (g?.rooms || []).forEach((r, idx) => {
    if (!r.type || angka(r.price) <= 0) return;
    const x = sp.rooms[idx] || {};
    const sentec = angka(x.sentec);
    const pax = Math.max(1, angka(x.pax) || 1);
    const actual = angka(r.price);
    const qty = angka(r.totalRoom);
    const hari = malam(r.checkIn, r.checkOut);
    const rate = sentec * pax;
    const da = (sentec - actual) * pax;
    const totalKomp = komp.reduce((t, k) => t + angka((x.bd || {})[k.id]), 0);
    const lodging = rate - totalKomp - da;
    const sTot = sentec * qty * hari, aTot = actual * qty * hari;
    sentecTotal += sTot; actualTotal += aTot;
    baris.push({ idx, type: r.type, sentec, pax, actual, qty, hari, rate, da, totalKomp, lodging, sTot, aTot, bd: x.bd || {} });
  });
  const nett = sentecTotal - actualTotal;
  const persen = sentecTotal > 0 ? (nett / sentecTotal) * 100 : 0;
  return { sp, komp, baris, sentecTotal, actualTotal, nett, persen };
}

const TDB = "border:1px solid #111;padding:2px 4px;";
const BIRU = "background:#9fc5e8;font-weight:bold;text-align:center;";

/** Tabel breakdown Discount Allowance (dipakai di PDF GEO dan di memo). */
export function breakdownSpHtml(g) {
  const h = hitungSp(g);
  if (!h.sp.aktif || !h.baris.length) return "";
  return `<table style="width:100%;border-collapse:collapse;font-size:8px;margin-top:2px;">
    <tr style="background:#fdf6e9;font-weight:bold;text-align:center;">
      <td style="${TDB}">Room Type</td><td style="${TDB}">Room Rate</td><td style="${TDB}">Lodging</td>
      ${h.komp.map((k) => `<td style="${TDB}">${esc(k.nama)}</td>`).join("")}
      <td style="${TDB}">Disc.Allowance</td>
    </tr>
    ${h.baris.map((b) => `<tr>
      <td style="${TDB}">${esc(b.type)}${b.pax > 1 ? ` (${b.pax} Pax)` : ""}</td>
      <td style="${TDB}text-align:right;">${rp(b.rate)}</td>
      <td style="${TDB}text-align:right;">${rp(b.lodging)}</td>
      ${h.komp.map((k) => `<td style="${TDB}text-align:right;">${rp(angka((b.bd || {})[k.id]))}</td>`).join("")}
      <td style="${TDB}text-align:right;font-weight:bold;">${rp(b.da)}</td>
    </tr>`).join("")}
  </table>`;
}

/**
 * HTML Interoffice Memo (Discount Allowance).
 * ctx: { memoNo, ttd:[{nama,jabatan,img}] urut: requested, ack1, ack2, approved, dari, tanggal }
 */
export function buildMemoHTML(g, origin, ctx = {}) {
  const h = hitungSp(g);
  const memoNo = ctx.memoNo || g?.sp?.memoNo || "SM-___/" + MEMO_KODE_TENGAH + "/___/____";
  const tgl = ctx.tanggal ? new Date(ctx.tanggal) : new Date();
  const ttd = ctx.ttd || [];
  const th = (t, w) => `<td style="${TDB}${BIRU}${w ? "width:" + w + ";" : ""}">${t}</td>`;
  const hari = (b) => b.hari;

  // Per tipe kamar: kolom komponen dipecah 5 kolom per baris (judul biru + angka), seperti contoh memo.
  const blokKamar = h.baris.map((b) => {
    const judul = ["Room Rate", "Lodging Room", ...h.komp.map((k) => k.nama), "Disc.Allowance"];
    const nilai = [b.rate, b.lodging, ...h.komp.map((k) => angka((b.bd || {})[k.id])), b.da];
    const label = esc(b.type) + (b.pax > 1 ? `<br><span style="font-weight:normal">(hitungan langsung ${b.pax} Pax)</span>` : "");
    const potong = [];
    for (let k = 0; k < judul.length; k += 5) potong.push([judul.slice(k, k + 5), nilai.slice(k, k + 5)]);
    const pad = (arr, fill) => arr.concat(Array(5 - arr.length).fill(fill));
    const baris = [];
    potong.forEach(([jd, nl], n) => {
      const awal = n === 0 ? `<td style="${TDB}vertical-align:middle;width:30%;" rowspan="${potong.length * 2}">${label}</td>` : "";
      baris.push(`<tr>${awal}${pad(jd, "").map((t) => `<td style="${TDB}${BIRU}">${esc(t)}</td>`).join("")}</tr>`);
      baris.push(`<tr>${pad(nl, null).map((v) => `<td style="${TDB}text-align:right;">${v === null ? "&nbsp;" : rp(v)}</td>`).join("")}</tr>`);
    });
    return `<table style="width:100%;border-collapse:collapse;font-size:8.5px;">${baris.join("")}</table>`;
  }).join("");

  const tabelRate = (judul, key, total) => `
    <div style="font-weight:bold;margin-top:12px;">${judul}</div>
    <table style="width:78%;border-collapse:collapse;font-size:8.5px;">
      <tr>${th("Description", "30%")}${th("Room Rate")}${th("Qty")}${th("Day")}${th("Total")}</tr>
      ${h.baris.map((b) => `<tr><td style="${TDB}">${esc(b.type)}</td><td style="${TDB}text-align:right;">${rp(key === "s" ? b.sentec : b.actual)}</td><td style="${TDB}text-align:center;">${b.qty}</td><td style="${TDB}text-align:center;">${hari(b)}</td><td style="${TDB}text-align:right;">${rp(key === "s" ? b.sTot : b.aTot)}</td></tr>`).join("")}
      <tr><td colspan="4" style="${TDB}${BIRU}">TOTAL</td><td style="${TDB}${BIRU}text-align:right;">${rp(total)}</td></tr>
    </table>`;

  const kolTtd = (judul, t) => `<td style="vertical-align:top;padding-right:16px;">
      <div>${judul}</div>
      <div style="height:44px;">${t?.img ? `<img src="${t.img}" style="max-height:42px;max-width:120px;display:block;margin-top:2px" />` : ""}</div>
      <div style="font-weight:bold;text-decoration:underline;">${esc(t?.nama) || "&nbsp;"}</div>
      <div style="font-weight:bold;">${esc(t?.jabatan)}</div></td>`;

  const info = (l, v, tebal) => `<tr><td style="padding:1px 0;width:26%;">${l}</td><td style="width:3%;">:</td><td style="${tebal ? "font-weight:bold;" : ""}">${esc(v)}</td></tr>`;

  return `<div style="font-family:Verdana,Arial,Helvetica,sans-serif;font-size:9px;color:#111;width:100%;padding:6px 10px;">
  <div style="text-align:center;font-weight:bold;text-decoration:underline;font-size:11px;margin-top:6px;">INTEROFFICE MEMO</div>
  <div style="text-align:center;margin-bottom:14px;">${esc(memoNo)}</div>
  <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #111;">
    ${info("Day &amp; Date", tglEn(tgl, true))}
    ${info("From", ctx.dari || g.salesPerson)}
    ${info("To", ctx.kepada || "FC")}
    ${info("cc", ctx.cc || "GM")}
    ${info("Subject", "Discount Allowance")}
  </table>
  <div style="margin-top:14px;">Dear Ibu ${esc(ctx.sapaan || "Niken")},<br>
  Referring to Group ${esc(g.company)}${g.eventTitle ? " (" + esc(g.eventTitle) + ")" : ""} with periods ${esc(periodeEn(g.checkIn, g.checkOut))}, I would like to inform about requested Discount Allowance :</div>
  <table style="width:100%;border-collapse:collapse;margin-top:14px;">
    ${info("Company", String(g.company || "").toUpperCase(), true)}
    ${info("Contact", g.contactPerson, true)}
    ${info("Mobile Phone", g.phone, true)}
    ${info("Date of Event Periods", periodeEn(g.checkIn, g.checkOut), true)}
  </table>

  <div style="width:78%;margin-top:12px;">
    <div style="${TDB}${BIRU}text-align:left;font-size:8.5px;">${esc(tglEn(g.issuedDate))}</div>
    ${blokKamar}
  </div>

  ${tabelRate("SENTEC", "s", h.sentecTotal)}
  ${tabelRate("ACTUAL", "a", h.actualTotal)}

  <table style="width:78%;border-collapse:collapse;font-size:8.5px;margin-top:14px;">
    <tr><td style="${TDB}${BIRU}text-align:left;width:30%;">Percentage</td><td style="${TDB}${BIRU}text-align:right;">${h.persen.toFixed(2)}%</td></tr>
    <tr><td style="${TDB}${BIRU}text-align:left;">Nett DA</td><td style="${TDB}${BIRU}text-align:right;">${rp(h.nett)}</td></tr>
  </table>

  <div style="margin-top:12px;">Please set up the arrangement code into Sentec System.<br>
  Should you need further assistance, please feel free to contact me${ctx.telp ? " at " + esc(ctx.telp) : ""}.<br>
  Thank you for your kind attention and cooperation in advance.</div>

  <table style="margin-top:18px;border-collapse:collapse;"><tr>
    ${kolTtd("Requested by,", ttd[0])}${kolTtd("Acknowledge by,", ttd[1])}${kolTtd("&nbsp;", ttd[2])}${kolTtd("Approved by,", ttd[3])}
  </tr></table>
</div>`;
}
