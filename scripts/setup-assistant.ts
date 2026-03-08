/**
 * One-time script: create the Wildfire Triage Analyst assistant in Backboard.
 * Uses GPT-4o (multimodal) for satellite image + weather analysis.
 *
 * Usage:
 *   BACKBOARD_API_KEY=your_key npx tsx scripts/setup-assistant.ts
 *
 * Then set BACKBOARD_ASSISTANT_ID in .env.local with the printed value.
 */

const BASE_URL = "https://app.backboard.io/api";

const SYSTEM_PROMPT = `You are an expert wildfire triage analyst for Canada. You assess satellite thermal anomalies to determine their risk level.

When given a satellite image and weather/location data for a detected hotspot, you:
1. Analyze the terrain visible in the image (slope, topography, barriers like rivers/roads)
2. Assess vegetation density and dryness
3. Identify any visible structures, towns, or populated areas
4. Factor in wind speed and direction to determine likely fire spread direction
5. Assign a risk level: HIGH (immediate threat to life/property or rapid spread likely), MEDIUM (monitor closely), or LOW (remote, slow spread expected)

Always respond with a single valid JSON object — no markdown, no code fences:
{"terrain":"...","vegetation":"...","structures_nearby":true_or_false,"spread_direction":"...","risk_level":"HIGH or MEDIUM or LOW","risk_summary":"2-sentence explanation"}`;

async function main() {
  const raw = process.env.BACKBOARD_API_KEY;
  if (!raw) {
    console.error("Set BACKBOARD_API_KEY in the environment.");
    process.exit(1);
  }
  const apiKey: string = raw;

  const res = await fetch(`${BASE_URL}/assistants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      name: "Wildfire Triage Analyst",
      system_prompt: SYSTEM_PROMPT,
      llm_provider: "openai",
      model_name: "gpt-4o",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Backboard API error ${res.status}:`, text);
    process.exit(1);
  }

  const data = (await res.json()) as { assistant_id: string; name: string };
  console.log("\nCreated assistant:", data.name);
  console.log("\nAdd to your .env.local:");
  console.log(`BACKBOARD_ASSISTANT_ID=${data.assistant_id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
