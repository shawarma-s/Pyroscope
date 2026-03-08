# Wildfire Triage Assistant

Live satellite hotspot triage powered by [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/), [Open-Meteo](https://open-meteo.com/), and [Backboard.io](https://backboard.io) GPT-4o multimodal AI.

## What it does

1. **Ingests** live satellite thermal anomalies (hotspots) from NASA FIRMS for Canada
2. **Enriches** each hotspot with real-time weather data (wind speed/direction, humidity) from Open-Meteo
3. **Analyzes** each hotspot using GPT-4o via Backboard: the AI sees the satellite image and weather data to assess terrain, vegetation, nearby structures, and fire spread direction
4. **Triages** results into **HIGH / MEDIUM / LOW** risk with explanations — sorted by risk so analysts see the most urgent fires first

## Setup

### 1. Install

```bash
cd wildfire-mvp
npm install
cp .env.example .env.local
```

### 2. Add API keys to `.env.local`

| Variable | Where to get it | Required |
|---|---|---|
| `BACKBOARD_API_KEY` | [app.backboard.io](https://app.backboard.io/) | Yes |
| `BACKBOARD_ASSISTANT_ID` | Run setup script (step 3) | Yes |
| `NASA_FIRMS_MAP_KEY` | [firms.modaps.eosdis.nasa.gov/api/map_key](https://firms.modaps.eosdis.nasa.gov/api/map_key/) | No (mock data used if missing) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | [account.mapbox.com](https://account.mapbox.com/access-tokens/) | No (no satellite image if missing) |

### 3. Create the Backboard assistant (one-time)

```bash
BACKBOARD_API_KEY=your_key npm run setup:assistant
```

Copy the printed `BACKBOARD_ASSISTANT_ID` into `.env.local`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo walkthrough (2 minutes)

1. The dashboard loads with live hotspots from NASA FIRMS (or mock data if key not set) plotted on the map as grey dots.
2. Click **"Analyze All"** — the app enriches each hotspot with weather data + downloads a Mapbox satellite image, then sends both to GPT-4o via Backboard. Cards update live (Red / Amber / Green).
3. The sidebar auto-sorts: **HIGH** risk hotspots bubble to the top.
4. Click any card or map marker to open the detail modal: satellite image, terrain analysis, spread direction, weather strip.

## Architecture

```
NASA FIRMS → /api/hotspots → Hotspot list
                ↓
/api/hotspot/analyze:
  Open-Meteo  → weather (wind, humidity, temp)
  Mapbox      → satellite JPEG → /tmp/hotspot-*.jpg
  Backboard   → GPT-4o sees image + weather prompt
              → JSON: { risk_level, terrain, vegetation, spread_direction, ... }
```

## Tech

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**, dark theme
- **Leaflet** — interactive map with colored risk markers
- **Backboard.io** — GPT-4o multimodal assistant (image + text → structured JSON risk profile)
- **NASA FIRMS** — live satellite fire/hotspot data
- **Open-Meteo** — no-key weather API
- **Mapbox Static Images** — satellite view per hotspot
