// app/api/tennis/tournament/category/[id]/route.js
import { NextResponse } from "next/server";

export async function GET(_request, { params }) {
  const { id } = params; // e.g. 3 for ATP

  if (!id) {
    return NextResponse.json({ error: "Missing category id" }, { status: 400 });
  }

  try {
    const resp = await fetch(
      `https://tennisapi1.p.rapidapi.com/api/tennis/tournament/all/category/${id}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": "tennisapi1.p.rapidapi.com",
        },
        cache: "no-store",
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: `TennisApi error ${resp.status}`, details: data },
        { status: resp.status }
      );
    }

    const res = NextResponse.json(data, { status: 200 });
    res.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=300");
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}

