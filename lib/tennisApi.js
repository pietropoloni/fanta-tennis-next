// lib/tennisApi.js
export async function callTennisApi(path, searchParams = {}) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    throw new Error("RAPIDAPI_KEY is missing. Add it to .env.local and restart dev server.");
  }

  // Base host for the REcodeX TennisApi on RapidAPI
  const host = "tennisapi1.p.rapidapi.com";
  const url = new URL(`https://${host}/${path}`);
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": host,
    },
    // We want fresh data for live/ongoing items
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TennisApi error ${res.status}: ${text}`);
  }
  return res.json();
}
