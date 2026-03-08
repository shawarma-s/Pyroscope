"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { HotspotCard } from "@/components/HotspotCard";
import { HotspotModal } from "@/components/HotspotModal";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { TriageResult } from "@/lib/tools/triage";
import type { WeatherData } from "@/lib/data/open-meteo";
import type { HotspotWithAnalysis } from "@/components/MapView";

// Leaflet must be loaded client-side only
const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-800 animate-pulse" /> }
);

interface AnalysisResult extends TriageResult {
  weather?: WeatherData;
}

const ANALYSIS_CONCURRENCY = 3;

function riskOrder(a: { analysis?: TriageResult | null }): number {
  if (!a.analysis) return 3;
  if (a.analysis.risk_level === "HIGH") return 0;
  if (a.analysis.risk_level === "MEDIUM") return 1;
  return 2;
}

export default function TriageDashboard() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [analyses, setAnalyses] = useState<Map<string, AnalysisResult>>(new Map());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loadingHotspots, setLoadingHotspots] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHotspots = useCallback(async () => {
    setLoadingHotspots(true);
    setError(null);
    try {
      const res = await fetch("/api/hotspots");
      if (!res.ok) throw new Error(`Failed to load hotspots (${res.status})`);
      const data = await res.json();
      setHotspots(data.hotspots ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hotspots");
    } finally {
      setLoadingHotspots(false);
    }
  }, []);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

  async function analyzeOne(hotspot: Hotspot): Promise<void> {
    if (analyses.has(hotspot.id)) return;
    setAnalyzingIds((s) => new Set(s).add(hotspot.id));
    try {
      const res = await fetch("/api/hotspot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hotspot),
        signal: abortRef.current?.signal,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `Analyze failed (${res.status})`);
      }
      const result: AnalysisResult = await res.json();
      setAnalyses((prev) => {
        const next = new Map(prev);
        next.set(hotspot.id, result);
        return next;
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      console.error(`[analyze] ${hotspot.id}:`, err);
    } finally {
      setAnalyzingIds((s) => {
        const next = new Set(s);
        next.delete(hotspot.id);
        return next;
      });
    }
  }

  async function analyzeAll() {
    if (hotspots.length === 0) return;
    abortRef.current = new AbortController();
    const pending = hotspots.filter((h) => !analyses.has(h.id));
    for (let i = 0; i < pending.length; i += ANALYSIS_CONCURRENCY) {
      const batch = pending.slice(i, i + ANALYSIS_CONCURRENCY);
      await Promise.all(batch.map(analyzeOne));
    }
  }

  // Build enriched hotspot list for map + sorted cards
  const enriched: HotspotWithAnalysis[] = hotspots.map((h) => ({
    ...h,
    analysis: analyses.get(h.id) ?? null,
  }));

  const sorted = [...enriched].sort((a, b) => riskOrder(a) - riskOrder(b));

  const selected = selectedId ? enriched.find((h) => h.id === selectedId) ?? null : null;
  const selectedAnalysis = selectedId ? (analyses.get(selectedId) ?? null) : null;
  const selectedWeather = selectedAnalysis?.weather ?? null;

  const analyzedCount = analyses.size;
  const highCount = [...analyses.values()].filter((a) => a.risk_level === "HIGH").length;
  const anyAnalyzing = analyzingIds.size > 0;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-base text-slate-100">
            Pyroscope
          </h1>
          {hotspots.length > 0 && (
            <span className="font-mono text-xs bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-slate-300">
              {hotspots.length} hotspots
            </span>
          )}
          {highCount > 0 && (
            <span className="font-mono text-xs bg-red-900/40 border border-red-700/50 rounded-full px-2 py-0.5 text-red-400 animate-pulse">
              {highCount} HIGH risk
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadHotspots}
            disabled={loadingHotspots}
            className="text-xs rounded-lg px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
          >
            {loadingHotspots ? "Loading..." : "Refresh"}
          </button>
          <button
            onClick={analyzeAll}
            disabled={anyAnalyzing || hotspots.length === 0 || analyzedCount === hotspots.length}
            className="text-xs rounded-lg px-3 py-1.5 bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50 disabled:pointer-events-none"
          >
            {anyAnalyzing
              ? `Analyzing... (${analyzingIds.size} active)`
              : analyzedCount === hotspots.length && hotspots.length > 0
                ? "All analyzed"
                : `Analyze All (${hotspots.length - analyzedCount} pending)`}
          </button>
        </div>
      </header>

      {/* Body: sidebar + map */}
      <div className="flex-1 flex min-h-0 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
        {/* Left sidebar: hotspot cards */}
        <aside className="w-80 flex-none border-r border-slate-800 overflow-y-auto bg-slate-950 pr-3">
          {error && (
            <div className="m-3 rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          {loadingHotspots ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-800/40 h-20 animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No hotspots detected. Try refreshing.
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <p className="text-xs text-slate-500 px-1 pb-1">
                {analyzedCount > 0
                  ? `${analyzedCount}/${sorted.length} analyzed — sorted by risk`
                  : `${sorted.length} hotspots sorted by FRP — click a card to analyze`}
              </p>
              {sorted.map((h) => (
                <HotspotCard
                  key={h.id}
                  hotspot={h}
                  analysis={h.analysis ?? null}
                  isAnalyzing={analyzingIds.has(h.id)}
                  isSelected={selectedId === h.id}
                  isHovered={hoveredId === h.id}
                  onClick={() => setSelectedId(h.id === selectedId ? null : h.id)}
                  onAnalyze={() => analyzeOne(h)}
                  onHover={() => setHoveredId(h.id)}
                  onHoverEnd={() => setHoveredId(null)}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Right: map */}
        <main className="flex-1 relative h-full overflow-hidden">
          <MapView
            hotspots={enriched}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={(h) => setSelectedId(h.id === selectedId ? null : h.id)}
            onHover={(h) => setHoveredId(h.id)}
            onHoverEnd={() => setHoveredId(null)}
            zoom={3}
          />

        </main>
      </div>

      {/* Map legend — fixed to viewport, outside all nested contexts */}
      <div className="fixed bottom-4 right-4 z-[9999] bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-3 text-xs space-y-1.5 pointer-events-none">
        <p className="text-slate-400 font-medium mb-2">Risk Level</p>
        {(["HIGH", "MEDIUM", "LOW", "Pending"] as const).map((label) => {
          const color =
            label === "HIGH"
              ? "bg-red-500"
              : label === "MEDIUM"
                ? "bg-amber-500"
                : label === "LOW"
                  ? "bg-emerald-500"
                  : "bg-slate-400";
          return (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-slate-300">{label}</span>
            </div>
          );
        })}</div>

      {/* Detail modal */}
      {selected && (
        <HotspotModal
          hotspot={selected}
          analysis={selectedAnalysis}
          weather={selectedWeather}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
