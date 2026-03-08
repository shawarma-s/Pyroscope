/**
 * Wildfire triage via Backboard multimodal AI (GPT-4o).
 * Sends a satellite image + weather context to the assistant and parses a risk profile.
 */
import { getBackboardClient, getAssistantId } from "@/lib/backboard";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { WeatherData } from "@/lib/data/open-meteo";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
export type RiskColor = "red" | "yellow" | "green";

export interface TriageResult {
  hotspot_id: string;
  risk_level: RiskLevel;
  risk_color: RiskColor;
  risk_summary: string;
  terrain: string;
  vegetation: string;
  structures_nearby: boolean;
  spread_direction: string;
  image_url: string;
  analyzed_at: string;
}

// In-process cache so repeated UI refreshes don't re-analyze
const triageCache = new Map<string, TriageResult>();

function riskColor(level: RiskLevel): RiskColor {
  if (level === "HIGH") return "red";
  if (level === "MEDIUM") return "yellow";
  return "green";
}

function buildPrompt(hotspot: Hotspot, weather: WeatherData): string {
  return `You are an expert wildfire analyst working in a wildfire triage system for Canada.

Analyze the provided satellite image of a thermal anomaly (possible wildfire ignition) at coordinates:
- Latitude: ${hotspot.lat.toFixed(4)}, Longitude: ${hotspot.lon.toFixed(4)}
- Fire Radiative Power: ${hotspot.frp} MW (higher = more energetic)
- Satellite confidence: ${hotspot.confidence}
- Detected: ${hotspot.acq_date} at ${hotspot.acq_time} UTC

Current weather conditions:
- Wind: ${weather.wind_speed_kmh} km/h from the ${weather.wind_direction_cardinal} (${weather.wind_direction_deg}°)
- Relative humidity: ${weather.humidity}%
- Temperature: ${weather.temperature_c}°C

Analyze the satellite image and answer:
1. What is the terrain type? (e.g. steep slope, flat, rolling hills, valley)
2. How dense and dry does the vegetation appear?
3. Are there visible structures, roads, or populated areas nearby?
4. Given the wind direction, which direction would fire spread most rapidly?
5. Assign a risk level — HIGH, MEDIUM, or LOW — based on: terrain slope, vegetation density/dryness, proximity to structures, wind speed, and humidity.

Respond ONLY with valid JSON (no markdown, no code fences):
{"terrain":"...","vegetation":"...","structures_nearby":true_or_false,"spread_direction":"...","risk_level":"HIGH or MEDIUM or LOW","risk_summary":"2-sentence explanation of your risk assessment"}`;
}

function parseTriageJson(content: string): Partial<TriageResult> {
  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Find first { to last } in case there's leading text
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function analyzeHotspot(
  hotspot: Hotspot,
  weather: WeatherData,
  imagePath: string | null,
  imageUrl: string
): Promise<TriageResult> {
  const cached = triageCache.get(hotspot.id);
  if (cached) return cached;

  const client = getBackboardClient();
  const assistantId = getAssistantId();
  const thread = await client.createThread(assistantId);
  const prompt = buildPrompt(hotspot, weather);

  const messageOptions: {
    content: string;
    stream: false;
    files?: string[];
  } = { content: prompt, stream: false };

  if (imagePath) {
    messageOptions.files = [imagePath];
  }

  const response = await client.addMessage(thread.threadId, messageOptions);

  const content = "content" in response ? String(response.content ?? "") : "";

  let parsed: Partial<TriageResult>;
  try {
    parsed = parseTriageJson(content);
  } catch {
    // If parsing fails, fall back to a safe default
    parsed = {
      terrain: "Unknown",
      vegetation: "Unknown",
      structures_nearby: false,
      spread_direction: "Unknown",
      risk_level: "MEDIUM",
      risk_summary: content.slice(0, 300) || "Analysis unavailable.",
    };
  }

  const risk_level: RiskLevel =
    parsed.risk_level === "HIGH" || parsed.risk_level === "LOW"
      ? parsed.risk_level
      : "MEDIUM";

  const result: TriageResult = {
    hotspot_id: hotspot.id,
    risk_level,
    risk_color: riskColor(risk_level),
    risk_summary: parsed.risk_summary ?? "No summary available.",
    terrain: parsed.terrain ?? "Unknown",
    vegetation: parsed.vegetation ?? "Unknown",
    structures_nearby: parsed.structures_nearby ?? false,
    spread_direction: parsed.spread_direction ?? "Unknown",
    image_url: imageUrl,
    analyzed_at: new Date().toISOString(),
  };

  triageCache.set(hotspot.id, result);
  return result;
}
