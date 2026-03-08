import { NextResponse } from "next/server";
import { getHotspots } from "@/lib/data/nasa-firms";

export async function GET() {
  try {
    const hotspots = await getHotspots();
    return NextResponse.json({ hotspots, count: hotspots.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/hotspots]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
