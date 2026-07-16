// Jembatan server Next.js -> Apps Script Web App (Google Sheets & Drive)
// Semua panggilan ke Apps Script dilakukan DARI SERVER (aman, tanpa masalah CORS).

const API_URL = process.env.API_URL;

export async function asGet(action) {
  if (!API_URL) throw new Error("API_URL belum diisi di Environment Variable.");
  const url = API_URL + "?action=" + encodeURIComponent(action);
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  return res.json();
}

export async function asPost(payload) {
  if (!API_URL) throw new Error("API_URL belum diisi di Environment Variable.");
  const res = await fetch(API_URL, {
    method: "POST",
    // text/plain menghindari preflight CORS di Apps Script
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    cache: "no-store",
    redirect: "follow",
  });
  return res.json();
}
