/**
 * Mapbox Static Images API — downloads a satellite JPEG for a given coordinate.
 * Docs: https://docs.mapbox.com/api/maps/static-images/
 *
 * Returns:
 *  - localPath: /tmp path where the image was saved (for Backboard SDK files param)
 *  - publicUrl: the Mapbox URL for direct display in the browser
 */
import { writeFile } from "fs/promises";
import { existsSync } from "fs";

const ZOOM = 12;
const WIDTH = 600;
const HEIGHT = 400;

export interface SatelliteImage {
  localPath: string;
  publicUrl: string;
}

export function buildMapboxUrl(lat: number, lon: number): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return "";
  return (
    `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/` +
    `${lon},${lat},${ZOOM}/${WIDTH}x${HEIGHT}` +
    `?access_token=${token}`
  );
}

export async function downloadSatelliteImage(
  hotspotId: string,
  lat: number,
  lon: number
): Promise<SatelliteImage | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn("[mapbox-imagery] NEXT_PUBLIC_MAPBOX_TOKEN not set — skipping image");
    return null;
  }

  const localPath = `/tmp/hotspot-${hotspotId.replace(/[^a-zA-Z0-9-]/g, "_")}.jpg`;
  const publicUrl = buildMapboxUrl(lat, lon);

  // Use cached file if it already exists in this process run
  if (existsSync(localPath)) {
    return { localPath, publicUrl };
  }

  try {
    const res = await fetch(publicUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      console.error(`[mapbox-imagery] ${res.status} for hotspot ${hotspotId}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(localPath, buf);
    return { localPath, publicUrl };
  } catch (err) {
    console.error("[mapbox-imagery] download failed:", err);
    return null;
  }
}
