import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/data/open-meteo";
import { downloadSatelliteImage, buildMapboxUrl } from "@/lib/data/mapbox-imagery";
import { analyzeHotspot } from "@/lib/tools/triage";
import type { Hotspot } from "@/lib/data/nasa-firms";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id?: string;
      lat?: number;
      lon?: number;
      brightness?: number;
      frp?: number;
      acq_date?: string;
      acq_time?: string;
      satellite?: string;
      confidence?: string;
    };

    const { id, lat, lon } = body;
    if (!id || lat == null || lon == null) {
      return NextResponse.json({ error: "id, lat, and lon are required" }, { status: 400 });
    }

    const hotspot: Hotspot = {
      id,
      lat,
      lon,
      brightness: body.brightness ?? 300,
      frp: body.frp ?? 20,
      acq_date: body.acq_date ?? new Date().toISOString().slice(0, 10),
      acq_time: body.acq_time ?? "0000",
      satellite: body.satellite ?? "VIIRS",
      confidence: body.confidence ?? "nominal",
    };

    // Run weather fetch and image download in parallel
    const [weather, imageResult] = await Promise.all([
      getWeather(lat, lon),
      downloadSatelliteImage(id, lat, lon),
    ]);

    const imagePath = imageResult?.localPath ?? null;
    const imageUrl = imageResult?.publicUrl ?? buildMapboxUrl(lat, lon);

    const analysis = await analyzeHotspot(hotspot, weather, imagePath, imageUrl);

    return NextResponse.json({
      ...analysis,
      weather,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
