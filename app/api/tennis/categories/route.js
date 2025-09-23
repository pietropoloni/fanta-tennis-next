// app/api/tennis/categories/route.js
import { NextResponse } from "next/server";
import { callTennisApi } from "@/lib/tennisApi";

export async function GET() {
  try {
    // Correct endpoint for the REcodeX TennisApi (tennisapi1)
    const data = await callTennisApi("tournament/categories");
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    // NOTE: the comma below is essential — two args to NextResponse.json(...)
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}

