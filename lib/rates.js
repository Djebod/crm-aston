// Struktur harga kamar per kategori market (Weekday / Weekend)
export const RATE_CATEGORIES = ["New LMA", "Corp LMA", "Corp CMA", "Travel Agent"];
export const ROOM_TYPES = ["Superior", "Deluxe", "Junior Executive", "Executive", "Suite", "Presidential Suite"];

// [weekday, weekend] per tipe kamar, urut sesuai ROOM_TYPES
const DATA = {
  "New LMA":      [[928000, 978000], [1048000, 1098000], [1168000, 1218000], [1588000, 1638000], [2108000, 2158000], [5108000, 5158000]],
  "Corp LMA":     [[908000, 958000], [1028000, 1078000], [1148000, 1198000], [1568000, 1618000], [2088000, 2138000], [5088000, 5138000]],
  "Corp CMA":     [[888000, 938000], [1008000, 1058000], [1128000, 1178000], [1548000, 1598000], [2068000, 2118000], [5068000, 5118000]],
  "Travel Agent": [[868000, 918000], [988000, 1038000], [1108000, 1158000], [1528000, 1578000], [2048000, 2098000], [5048000, 5098000]],
};

export function rateDefault() {
  const o = {};
  RATE_CATEGORIES.forEach((c) => { o[c] = ROOM_TYPES.map((t, i) => [t, String(DATA[c][i][0]), String(DATA[c][i][1])]); });
  return o;
}
