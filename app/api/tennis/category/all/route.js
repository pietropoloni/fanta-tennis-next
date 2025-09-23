// app/api/tennis/category/all/route.js
import { NextResponse } from "next/server";
import { callTennisApi } from "@/lib/tennisApi";

export async function GET() {
  try {
    const data = await callTennisApi("category/all");
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
