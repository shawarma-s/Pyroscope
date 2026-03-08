"use client";

import { useEffect, useRef } from "react";
import { RiskBadge } from "./RiskBadge";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { TriageResult, RecommendedAction, ActionPriority, ActionCategory } from "@/lib/tools/triage";
import type { WeatherData } from "@/lib/data/open-meteo";

interface HotspotModalProps {
  hotspot: Hotspot;
  analysis: TriageResult | null;
  weather?: WeatherData | null;
  onClose: () => void;
}

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; cls: string; dot: string }> = {
  IMMEDIATE: { label: "IMMEDIATE", cls: "bg-red-900/40 border-red-700/60 text-red-300", dot: "bg-red-500 animate-pulse" },
  URGENT:    { label: "URGENT",    cls: "bg-amber-900/30 border-amber-700/50 text-amber-300", dot: "bg-amber-400" },
  ADVISORY:  { label: "ADVISORY",  cls: "bg-slate-800/60 border-slate-600/50 text-slate-400", dot: "bg-slate-400" },
};

const CATEGORY_ICONS: Record<ActionCategory, string> = {
  evacuation:   "🚨",
  suppression:  "🔥",
  monitoring:   "👁",
  notification: "📡",
  resource:     "🚁",
};

function PriorityBadge({ priority }: { priority: ActionPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.ADVISORY;
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ActionRow({ item, index }: { item: RecommendedAction; index: number }) {
  const cfg = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.ADVISORY;
  const icon = CATEGORY_ICONS[item.category] ?? "•";
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${cfg.cls}`}>
      <div className="flex-none w-7 h-7 rounded-md bg-black/20 flex items-center justify-center text-base">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {String(index + 1).padStart(2, "0")}
          </span>
          <PriorityBadge priority={item.priority} />
          <span className="text-[10px] uppercase tracking-wider font-medium opacity-60 capitalize">
            {item.category}
          </span>
        </div>
        <p className="text-sm font-medium leading-snug">{item.action}</p>
        <p className="text-xs opacity-60 mt-0.5">→ {item.agency}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</dt>
      <dd className={`text-sm font-medium ${highlight ? "text-red-400" : "text-slate-200"}`}>{value}</dd>
    </div>
  );
}

export function HotspotModal({ hotspot, analysis, weather, onClose }: HotspotModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const mapsUrl = `https://www.google.com/maps?q=${hotspot.lat.toFixed(5)},${hotspot.lon.toFixed(5)}&t=k&z=13`;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* ── Satellite image banner ─────────────────────────────── */}
        {analysis?.image_url ? (
          <div className="relative h-44 overflow-hidden bg-slate-800 flex-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={analysis.image_url}
              alt={`Satellite view at ${hotspot.lat.toFixed(3)}, ${hotspot.lon.toFixed(3)}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <div>
                {analysis && <RiskBadge level={analysis.risk_level} size="lg" />}
                <p className="text-xs font-mono text-slate-300 mt-1">
                  {hotspot.lat.toFixed(4)}°N &nbsp;{Math.abs(hotspot.lon).toFixed(4)}°W
                </p>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-medium bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1 text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
              >
                Open in Maps ↗
              </a>
            </div>
          </div>
        ) : (
          /* No image — compact header bar */
          <div className="flex-none bg-slate-800/60 border-b border-slate-700 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {analysis && <RiskBadge level={analysis.risk_level} size="sm" />}
              <p className="text-xs font-mono text-slate-400">
                {hotspot.lat.toFixed(4)}°N &nbsp;{Math.abs(hotspot.lon).toFixed(4)}°W
              </p>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-medium bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
            >
              Open in Maps ↗
            </a>
          </div>
        )}

        {/* ── Scrollable body ────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* Header row */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-slate-100 text-base">Wildfire Hotspot</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hotspot.acq_date} {hotspot.acq_time} UTC &middot; {hotspot.satellite} &middot; FRP {hotspot.frp.toFixed(1)} MW &middot; Confidence: <span className="capitalize">{hotspot.confidence}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 text-xl leading-none px-1 flex-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* ── No analysis yet ─────────────────────────────────── */}
            {!analysis && (
              <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 space-y-4">
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">⏳ AI Analysis Pending</p>
                  <p className="text-sm text-slate-300">
                    This hotspot has not been triaged yet. Click <strong className="text-white">Analyze All</strong> in the header to run the AI triage pipeline.
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <StatBox label="Fire Radiative Power" value={`${hotspot.frp.toFixed(1)} MW`} />
                  <StatBox label="Satellite" value={hotspot.satellite} />
                  <StatBox label="Detected" value={`${hotspot.acq_date} ${hotspot.acq_time} UTC`} />
                  <StatBox label="Confidence" value={hotspot.confidence} />
                </dl>
                <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
                  <p>📍 <strong className="text-slate-300">Coordinates:</strong> {hotspot.lat.toFixed(5)}°N, {Math.abs(hotspot.lon).toFixed(5)}°W</p>
                </div>
              </div>
            )}

            {/* ── AI Analysis present ─────────────────────────────── */}
            {analysis && (
              <>
                {/* Threat summary banner */}
                {analysis.threat_summary && (
                  <div className={`rounded-xl border px-4 py-3 ${
                    analysis.risk_level === "HIGH"
                      ? "bg-red-950/40 border-red-700/60"
                      : analysis.risk_level === "MEDIUM"
                        ? "bg-amber-950/30 border-amber-700/50"
                        : "bg-emerald-950/20 border-emerald-700/40"
                  }`}>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      analysis.risk_level === "HIGH" ? "text-red-400" : analysis.risk_level === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      🚨 Dispatch Summary
                    </p>
                    <p className="text-sm font-medium text-slate-100 leading-snug">{analysis.threat_summary}</p>
                  </div>
                )}

                {/* Key metrics grid */}
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <StatBox label="Terrain" value={analysis.terrain} />
                  <StatBox label="Vegetation" value={analysis.vegetation} />
                  <StatBox label="Estimated Area" value={analysis.estimated_area_ha > 0 ? `~${analysis.estimated_area_ha.toLocaleString()} ha` : "Unknown"} />
                  <StatBox label="Spread Direction" value={analysis.spread_direction} />
                  <StatBox
                    label="Structures Nearby"
                    value={analysis.structures_nearby ? "Yes — elevated concern" : "None detected"}
                    highlight={analysis.structures_nearby}
                  />
                  <StatBox label="Confidence" value={hotspot.confidence} />
                </dl>

                {/* Weather strip */}
                {weather && (
                  <div className="flex gap-4 text-xs text-slate-400 bg-slate-800/40 rounded-lg border border-slate-700/50 px-4 py-2.5 flex-wrap">
                    <span>🌬 Wind: <strong className="text-slate-200 font-mono">{weather.wind_speed_kmh} km/h {weather.wind_direction_cardinal}</strong></span>
                    <span>💧 Humidity: <strong className="text-slate-200 font-mono">{weather.humidity}%</strong></span>
                    <span>🌡 Temp: <strong className="text-slate-200 font-mono">{weather.temperature_c}°C</strong></span>
                  </div>
                )}

                {/* Analysis details */}
                <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-4 space-y-3">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Situation Analysis</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{analysis.analysis_details}</p>
                  </div>
                  {analysis.fire_behavior && (
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fire Behavior</h3>
                      <p className="text-sm text-slate-300 leading-relaxed">{analysis.fire_behavior}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Conclusion</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{analysis.conclusion}</p>
                  </div>
                </div>

                {/* Recommended Actions */}
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    ⚡ Recommended Actions
                  </h3>
                  {analysis.recommended_actions && analysis.recommended_actions.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.recommended_actions.map((action, i) => (
                        <ActionRow key={i} item={action} index={i} />
                      ))}
                    </div>
                  ) : (
                    /* Fallback: single plain text action */
                    <div className="bg-amber-950/20 rounded-lg border border-amber-800/60 p-3">
                      <p className="text-sm text-amber-100 font-medium leading-relaxed">
                        {analysis.recommended_action}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 text-right">
                  Analyzed {new Date(analysis.analyzed_at).toLocaleTimeString()}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
