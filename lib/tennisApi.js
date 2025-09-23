// lib/tennisApi.js
export async function callTennisApi(path, searchParams = {}) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new Error("RAPIDAPI_KEY is missing. Put it in .env.local (and on Vercel later).");
  }

  const host = "tennisapi1.p.rapidapi.com";
  // REcodeX endpoints live under /api/tennis/...
  const base = `https://${host}/api/tennis/`;
  const url = new URL(path.startsWith("http") ? path : base + path);

  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": host,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TennisApi error ${res.status}: ${text}`);
  }
  return res.json();
}

