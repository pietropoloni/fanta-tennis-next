// app/api/tennis/categories/route.js
import { NextResponse } from "next/server";
import { callTennisApi } from "@/lib/tennisApi";

export async function GET() {
  try {
    // Calls the REcodeX endpoint named "Categories"
    const data = await callTennisApi("Categories");
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
