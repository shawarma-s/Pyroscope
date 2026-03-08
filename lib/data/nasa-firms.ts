/**
 * NASA FIRMS API client for live satellite hotspot data.
 * Docs: https://firms.modaps.eosdis.nasa.gov/api/
 * Get a free MAP_KEY at: https://firms.modaps.eosdis.nasa.gov/api/map_key/
 *
 * Falls back to mock data if NASA_FIRMS_MAP_KEY is not set.
 */

export interface Hotspot {
  id: string;
  lat: number;
  lon: number;
  brightness: number;
  frp: number; // Fire Radiative Power (MW)
  acq_date: string;
  acq_time: string;
  satellite: string;
  confidence: string;
}

// Africa bounding box: west, south, east, north
const CANADA_BBOX = "-18,-35,52,38";
const FIRMS_SOURCE = "VIIRS_SNPP_NRT";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache: { data: Hotspot[]; at: number } | null = null;

function parseFirmsCsv(csv: string): Hotspot[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const idx = (name: string) => header.indexOf(name);
  const latIdx = idx("latitude");
  const lonIdx = idx("longitude");
  const brightIdx = idx("bright_ti4") !== -1 ? idx("bright_ti4") : idx("brightness");
  const frpIdx = idx("frp");
  const dateIdx = idx("acq_date");
  const timeIdx = idx("acq_time");
  const satIdx = idx("satellite");
  const confIdx = idx("confidence");

  const hotspots: Hotspot[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const lat = parseFloat(cols[latIdx] ?? "");
    const lon = parseFloat(cols[lonIdx] ?? "");
    if (isNaN(lat) || isNaN(lon)) continue;
    const frp = parseFloat(cols[frpIdx] ?? "0");
    const brightness = parseFloat(cols[brightIdx] ?? "0");
    const acq_date = cols[dateIdx]?.trim() ?? "";
    const acq_time = cols[timeIdx]?.trim() ?? "";
    const satellite = cols[satIdx]?.trim() ?? "VIIRS";
    const confidence = cols[confIdx]?.trim() ?? "nominal";
    const id = `${acq_date}-${acq_time}-${lat.toFixed(3)}-${lon.toFixed(3)}`;
    hotspots.push({ id, lat, lon, brightness, frp, acq_date, acq_time, satellite, confidence });
  }
  // Sort by FRP desc (higher = more energetic fire)
  return hotspots.sort((a, b) => b.frp - a.frp);
}

export async function getHotspots(): Promise<Hotspot[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    throw new Error("NASA_FIRMS_MAP_KEY is not set. Add it to .env.local.");
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${FIRMS_SOURCE}/${CANADA_BBOX}/1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) {
    throw new Error(`NASA FIRMS API error ${res.status}: ${await res.text()}`);
  }
  const csv = await res.text();
  const hotspots = parseFirmsCsv(csv);
  cache = { data: hotspots, at: Date.now() };
  return hotspots;
}
