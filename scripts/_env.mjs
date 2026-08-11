import fs from "fs";
// Muat DATABASE_URL & lainnya dari .env.local untuk script node (Next.js tidak jalan di sini)
export function loadEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const txt = fs.readFileSync("./.env.local", "utf8");
    txt.split("\n").forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) return;
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\n/g, "\n");
      if (!process.env[m[1]]) process.env[m[1]] = v;
    });
  } catch (e) {}
}
