// ====== Hak akses berdasarkan role ======
// admin     : super user — kelola tim, kelola target, lihat semua data
// leader    : ADOSM / Sales Leader — lihat semua data, TIDAK bisa kelola tim/target
// marketing : sales — hanya melihat data miliknya sendiri

const low = (v) => String(v || "").trim().toLowerCase();

export function isAdmin(user) {
  return low(user?.role) === "admin";
}

export function isLeader(user) {
  return low(user?.role) === "leader";
}

/** Admin & Leader boleh melihat data seluruh sales. */
export function bisaLihatSemua(user) {
  return isAdmin(user) || isLeader(user);
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
};
