// app/api/tennis/tournament/categories/[id]/route.js
import { NextResponse } from "next/server";
import { callTennisApi } from "@/lib/tennisApi";

// Accepts either a numeric ID (e.g. "3") or a known slug (e.g. "atp")
const CATEGORY_SLUG_TO_ID = {
  atp: 3,
  wta: 6,
  challenger: 72,
  exhibition: 79,
  "grand-slam": -100,
};

export async function GET(_req, { params }) {
  try {
    const raw = params?.id;
    if (!raw) {
      return NextResponse.json({ error: "Missing category id" }, { status: 400 });
    }

    const id =
      /^[0-9-]+$/.test(raw) ? raw : CATEGORY_SLUG_TO_ID[raw.toLowerCase()];

    if (id === undefined) {
      return NextResponse.json(
        { error: `Unknown category '${raw}'. Use a numeric ID or one of: ${Object.keys(CATEGORY_SLUG_TO_ID).join(", ")}` },
        { status: 400 }
      );
    }

    // RapidAPI endpoint for tournaments in a category
    const data = await callTennisApi(`tournament/all/category/${id}`);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
