// ====== Hak akses berdasarkan role ======
// admin     : super user — kelola tim, kelola target, lihat semua data
// leader    : ADOSM / Sales Leader — lihat semua data, TIDAK bisa kelola tim/target
// marketing : sales — hanya melihat data miliknya sendiri
// fom / fc / gm : Front Office Manager, Financial Controller, General Manager —
//             penyetuju GEO; boleh melihat semua data, tidak kelola tim/target

const low = (v) => String(v || "").trim().toLowerCase();

export function isAdmin(user) {
  return low(user?.role) === "admin";
}

export function isLeader(user) {
  return low(user?.role) === "leader";
}

/** Admin & Leader boleh melihat data seluruh sales. */
export function bisaLihatSemua(user) {
  return isAdmin(user) || isLeader(user) || isManajemen(user);
}

/** Role manajemen penyetuju GEO (FOM, FC, GM). */
export function isManajemen(user) {
  return ["fom", "fc", "gm"].includes(low(user?.role));
}

/**
 * Apakah salah satu kandidat (nama PIC / sales name / email pembuat)
 * merujuk ke user yang sedang login.
 */
export function milikSaya(user, ...kandidat) {
  const nama = low(user?.nama);
  const email = low(user?.email);
  if (!nama && !email) return false;
  return kandidat.some((k) => {
    const v = low(k);
    return v !== "" && ((nama && v === nama) || (email && v === email));
  });
}

export const LABEL_ROLE = {
  admin: "admin",
  leader: "leader (ADOSM / Sales Leader)",
  marketing: "marketing",
  fom: "fom (Front Office Manager)",
  fc: "fc (Financial Controller)",
  gm: "gm (General Manager)",
};
