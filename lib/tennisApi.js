// lib/tennisApi.js
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "tennisapi1.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export async function callTennisApi(path, searchParams) {
  if (!RAPIDAPI_KEY) {
    throw new Error("RAPIDAPI_KEY is missing on the server");
  }

  const base = `https://${RAPIDAPI_HOST}/api/tennis/`;
  const url = new URL(path, base);

  if (searchParams && typeof searchParams === "object") {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upstream error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

