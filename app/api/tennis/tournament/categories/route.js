// app/api/tennis/tournament/categories/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get("debug") === "1";

  // Try both names so it works whether you used NEXT_PUBLIC_ or not
  const host =
    process.env.NEXT_PUBLIC_RAPIDAPI_HOST ||
    process.env.RAPIDAPI_HOST ||
    "tennisapi1.p.rapidapi.com";

  const key =
    process.env.NEXT_PUBLIC_RAPIDAPI_KEY ||
    process.env.RAPIDAPI_KEY ||
    "";

  if (debug) {
    return NextResponse.json({
      host,
      keyPresent: Boolean(key),
      keyPreview: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : null,
      lookedFor: {
        NEXT_PUBLIC_RAPIDAPI_HOST: Boolean(process.env.NEXT_PUBLIC_RAPIDAPI_HOST),
        RAPIDAPI_HOST: Boolean(process.env.RAPIDAPI_HOST),
        NEXT_PUBLIC_RAPIDAPI_KEY: Boolean(process.env.NEXT_PUBLIC_RAPIDAPI_KEY),
        RAPIDAPI_KEY: Boolean(process.env.RAPIDAPI_KEY),
      },
    });
  }

  try {
    const res = await fetch(`https://${host}/api/tennis/tournament/categories`, {
      headers: {
        "x-rapidapi-host": host,
        "x-rapidapi-key": key,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Upstream error ${res.status}: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

