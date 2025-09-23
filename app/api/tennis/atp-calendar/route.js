// app/api/tennis/atp-calendar/route.js
import { NextResponse } from "next/server";

// Small helper: retry on 429 and cache upstream response for 10 minutes
async function fetchWithRetry(url, options) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, {
      ...options,
      // Cache the upstream fetch for 10 minutes to avoid hitting the rate limit
      next: { revalidate: 600 },
    });

    // If it's not rate-limited, return immediately
    if (res.status !== 429) return res;

    // Backoff: 0.5s, 1s, 1.5s
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }

  // Final attempt after retries
  return fetch(url, {
    ...options,
    next: { revalidate: 600 },
  });
}

export async function GET() {
  try {
    const url =
      "https://tennisapi1.p.rapidapi.com/api/tennis/tournament/all/category/3";

    const res = await fetchWithRetry(url, {
      headers: {
        "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
        "x-rapidapi-host": "tennisapi1.p.rapidapi.com",
      },
      // (do NOT use cache: "no-store"; we want Next to cache the upstream fetch)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upstream error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

