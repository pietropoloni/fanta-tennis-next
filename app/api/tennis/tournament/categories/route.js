// app/api/tennis/tournament/categories/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const debug = searchParams.get("debug") === "1";

  const host = process.env.NEXT_PUBLIC_RAPIDAPI_HOST || "tennisapi1.p.rapidapi.com";
  const key = process.env.NEXT_PUBLIC_RAPIDAPI_KEY || "";

  if (debug) {
    return NextResponse.json({
      host,
      keyPresent: Boolean(key),
      keyPreview: key ? `${key.slice(0, 6)}...${key.slice(-4)}` : null,
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
