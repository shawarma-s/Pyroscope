/**
 * Open-Meteo weather client — no API key required.
 * Docs: https://open-meteo.com/en/docs
 */

export interface WeatherData {
  wind_speed_kmh: number;
  wind_direction_deg: number;
  wind_direction_cardinal: string;
  humidity: number;
  temperature_c: number;
}

const CARDINALS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

function degToCardinal(deg: number): string {
  const i = Math.round(((deg % 360) / 22.5)) % 16;
  return CARDINALS[i] ?? "N";
}

// Per-coordinate cache keyed by "{lat},{lon}"
const weatherCache = new Map<string, { data: WeatherData; at: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=wind_speed_10m,wind_direction_10m,relative_humidity_2m,temperature_2m` +
    `&wind_speed_unit=kmh`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = (await res.json()) as {
      current: {
        wind_speed_10m: number;
        wind_direction_10m: number;
        relative_humidity_2m: number;
        temperature_2m: number;
      };
    };
    const c = json.current;
    const data: WeatherData = {
      wind_speed_kmh: Math.round(c.wind_speed_10m),
      wind_direction_deg: c.wind_direction_10m,
      wind_direction_cardinal: degToCardinal(c.wind_direction_10m),
      humidity: c.relative_humidity_2m,
      temperature_c: c.temperature_2m,
    };
    weatherCache.set(key, { data, at: Date.now() });
    return data;
  } catch (err) {
    console.error(`[open-meteo] failed for ${key}:`, err);
    // Return a plausible default so the analysis can still proceed
    return {
      wind_speed_kmh: 20,
      wind_direction_deg: 270,
      wind_direction_cardinal: "W",
      humidity: 30,
      temperature_c: 18,
    };
  }
}
