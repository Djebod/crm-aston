// Membuat tabel di Neon. Jalankan: npm run init-db
import { neon } from "@neondatabase/serverless";
import { loadEnv } from "./_env.mjs";
import { STATEMENTS } from "./schema.mjs";

loadEnv();
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL belum ada (isi di .env.local)."); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const S = (t) => { const a = [t]; a.raw = [t]; return a; }; // array mirip template-string

for (const st of STATEMENTS) {
  await sql(S(st));
  console.log("OK:", st.trim().split("\n")[0].slice(0, 60));
}
console.log("✅ Skema Neon siap.");
process.exit(0);
