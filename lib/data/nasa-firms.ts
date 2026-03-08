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

// Canada bounding box: west, south, east, north
const CANADA_BBOX = "-141,42,-52,83";
const FIRMS_SOURCE = "VIIRS_SNPP_NRT";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_HOTSPOTS = 50;

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
  // Sort by FRP desc (higher = more energetic fire) and cap
  return hotspots.sort((a, b) => b.frp - a.frp).slice(0, MAX_HOTSPOTS);
}

const MOCK_HOTSPOTS: Hotspot[] = [
  { id: "mock-1", lat: 53.54, lon: -114.07, brightness: 342.1, frp: 98.3, acq_date: "2026-03-07", acq_time: "0548", satellite: "Suomi-NPP", confidence: "high" },
  { id: "mock-2", lat: 51.20, lon: -120.50, brightness: 315.4, frp: 52.1, acq_date: "2026-03-07", acq_time: "0600", satellite: "Suomi-NPP", confidence: "nominal" },
  { id: "mock-3", lat: 52.00, lon: -106.67, brightness: 328.8, frp: 75.0, acq_date: "2026-03-07", acq_time: "0612", satellite: "NOAA-20", confidence: "high" },
  { id: "mock-4", lat: 55.10, lon: -118.80, brightness: 298.2, frp: 22.5, acq_date: "2026-03-07", acq_time: "0630", satellite: "Suomi-NPP", confidence: "low" },
  { id: "mock-5", lat: 49.80, lon: -97.20, brightness: 289.0, frp: 8.9, acq_date: "2026-03-07", acq_time: "0645", satellite: "NOAA-20", confidence: "low" },
];

export async function getHotspots(): Promise<Hotspot[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    console.warn("[nasa-firms] NASA_FIRMS_MAP_KEY not set — using mock hotspots");
    cache = { data: MOCK_HOTSPOTS, at: Date.now() };
    return MOCK_HOTSPOTS;
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${FIRMS_SOURCE}/${CANADA_BBOX}/1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      console.error(`[nasa-firms] API error ${res.status}: ${await res.text()}`);
      return MOCK_HOTSPOTS;
    }
    const csv = await res.text();
    const hotspots = parseFirmsCsv(csv);
    if (hotspots.length === 0) {
      console.warn("[nasa-firms] No hotspots parsed — using mock");
      return MOCK_HOTSPOTS;
    }
    cache = { data: hotspots, at: Date.now() };
    return hotspots;
  } catch (err) {
    console.error("[nasa-firms] fetch failed:", err);
    return MOCK_HOTSPOTS;
  }
}
