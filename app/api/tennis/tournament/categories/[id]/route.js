// app/api/tennis/tournament/category/[id]/route.js
import { NextResponse } from "next/server";
import { callRapid } from "@/lib/rapid";

export async function GET(_req, { params }) {
  try {
    const { id } = params; // e.g. 3 for ATP
    const path = `/api/tennis/tournament/all/category/${encodeURIComponent(id)}`;
    const data = await callRapid(path);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}

