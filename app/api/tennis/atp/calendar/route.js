// app/api/tennis/atp/calendar/route.js
import { NextResponse } from "next/server";
import { callTennisApi } from "@/lib/tennisApi";

export async function GET() {
  try {
    const categoryId = 785; // ATP category id (from your RapidAPI URL)
    const data = await callTennisApi(`tournament/all/category/${categoryId}`);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
