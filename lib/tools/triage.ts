/**
 * Wildfire triage via Backboard multimodal AI (GPT-4o).
 * Sends a satellite image + weather context to the assistant and parses a risk profile.
 */
import { getBackboardClient, getAssistantId } from "@/lib/backboard";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { WeatherData } from "@/lib/data/open-meteo";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
export type RiskColor = "red" | "yellow" | "green";
export type ActionPriority = "IMMEDIATE" | "URGENT" | "ADVISORY";
export type ActionCategory = "evacuation" | "suppression" | "monitoring" | "notification" | "resource";

export interface RecommendedAction {
  priority: ActionPriority;
  category: ActionCategory;
  action: string;
  agency: string;
}

export interface TriageResult {
  hotspot_id: string;
  risk_level: RiskLevel;
  risk_color: RiskColor;
  threat_summary: string;
  analysis_details: string;
  fire_behavior: string;
  conclusion: string;
  recommended_action: string;
  recommended_actions: RecommendedAction[];
  estimated_area_ha: number;
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
  return `You are an expert wildfire analyst working in a global wildfire triage system.

You are assessing a VIIRS satellite thermal anomaly. Your job is to produce an accurate, calibrated risk assessment — not to assume the worst. Many hotspots are agricultural burns, small brush fires, or industrial heat sources with no meaningful threat. Only assign HIGH risk when the evidence genuinely supports it.

Hotspot data:
- Location: ${hotspot.lat.toFixed(4)}°, ${hotspot.lon.toFixed(4)}°
- Fire Radiative Power (FRP): ${hotspot.frp} MW
  FRP context: FRP measures radiant heat output. Values under ~10 MW are typically small or smoldering fires (agricultural burns, campfires, industrial). Values of 50–200 MW suggest active moderate fires. Values above 200 MW indicate large, energetic wildfires. Use this to calibrate your assessment — do not treat a low-FRP anomaly as an imminent catastrophe.
- Detection confidence: ${hotspot.confidence} (low confidence = higher false-positive rate)
- Detected: ${hotspot.acq_date} at ${hotspot.acq_time} UTC

Current weather at location:
- Wind: ${weather.wind_speed_kmh} km/h from ${weather.wind_direction_cardinal} (${weather.wind_direction_deg}°)
- Relative humidity: ${weather.humidity}%
- Temperature: ${weather.temperature_c}°C

Using the satellite image and all data above, provide a triage assessment covering:
1. Terrain type visible in the image
2. Vegetation density, type, and apparent dryness
3. Visible structures, roads, communities, or populated areas nearby
4. Given wind, likely spread direction if fire were to grow
5. Estimated area affected in hectares based on the thermal signature or burn scar visible
6. Likely fire behavior given the FRP, terrain, and weather — be honest if this appears minor
7. A one-sentence threat summary calibrated to the actual signal strength
8. Risk level — HIGH, MEDIUM, or LOW — justified by the totality of evidence, not just worst-case assumptions
9. 2–4 recommended actions proportional to the assessed risk. A low-FRP anomaly with low confidence warrants monitoring actions, not mass evacuations. Each action must include:
   - priority: IMMEDIATE (life/safety threat now), URGENT (action needed within 6h), or ADVISORY (monitoring/planning)
   - category: evacuation | suppression | monitoring | notification | resource
   - action: concise imperative sentence
   - agency: responsible agency appropriate to the country/region of the coordinates

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "terrain": "...",
  "vegetation": "...",
  "structures_nearby": true_or_false,
  "spread_direction": "primary direction, secondary direction",
  "estimated_area_ha": number,
  "fire_behavior": "1-2 sentences on fire behavior and rate of spread",
  "risk_level": "HIGH or MEDIUM or LOW",
  "threat_summary": "one sentence for dispatch",
  "analysis_details": "2-3 sentences on terrain, vegetation, and weather",
  "conclusion": "1-2 sentence overall risk conclusion",
  "recommended_action": "single top-priority action sentence",
  "recommended_actions": [
    {"priority": "ADVISORY", "category": "monitoring", "action": "...", "agency": "..."}
  ]
}`;
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
    llm_provider: string;
    model_name: string;
    files?: string[];
  } = { content: prompt, stream: false, llm_provider: "openai", model_name: "gpt-4o" };

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
      estimated_area_ha: 0,
      fire_behavior: "Unable to determine fire behavior.",
      risk_level: "MEDIUM",
      threat_summary: "Analysis unavailable — assess manually.",
      analysis_details: "Analysis unavailable.",
      conclusion: "Analysis unavailable.",
      recommended_action: "Dispatch ground crew for manual assessment.",
      recommended_actions: [
        { priority: "URGENT", category: "monitoring", action: "Dispatch ground crew for manual assessment of this hotspot.", agency: "Local Fire Department" },
      ],
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
    threat_summary: (parsed as Partial<TriageResult>).threat_summary ?? "Assess this hotspot immediately.",
    analysis_details: parsed.analysis_details ?? "No details available.",
    fire_behavior: (parsed as Partial<TriageResult>).fire_behavior ?? "Fire behavior unknown.",
    conclusion: parsed.conclusion ?? "No conclusion available.",
    recommended_action: parsed.recommended_action ?? "No action recommended.",
    recommended_actions: (parsed as Partial<TriageResult>).recommended_actions ?? [],
    estimated_area_ha: (parsed as Partial<TriageResult>).estimated_area_ha ?? 0,
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
