// app/api/tennis/atp-calendar/route.js
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://tennisapi1.p.rapidapi.com/api/tennis/tournament/all/category/3",
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
          "x-rapidapi-host": "tennisapi1.p.rapidapi.com",
        },
        // Next.js fetch options (good caching defaults for serverless)
        cache: "no-store",
      }
    );

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
