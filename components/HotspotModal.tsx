"use client";

import { useEffect, useRef } from "react";
import { RiskBadge } from "./RiskBadge";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { TriageResult } from "@/lib/tools/triage";
import type { WeatherData } from "@/lib/data/open-meteo";

interface HotspotModalProps {
  hotspot: Hotspot;
  analysis: TriageResult;
  weather?: WeatherData | null;
  onClose: () => void;
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

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Satellite image */}
        {analysis.image_url && (
          <div className="relative h-56 overflow-hidden bg-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={analysis.image_url}
              alt={`Satellite view at ${hotspot.lat.toFixed(3)}, ${hotspot.lon.toFixed(3)}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 flex items-center gap-3">
              <RiskBadge level={analysis.risk_level} size="lg" />
              <span className="text-sm font-mono text-slate-300">
                {hotspot.lat.toFixed(4)}°N, {Math.abs(hotspot.lon).toFixed(4)}°W
              </span>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-slate-100">Hotspot Analysis</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {hotspot.acq_date} {hotspot.acq_time} UTC &middot; {hotspot.satellite} &middot; FRP {hotspot.frp.toFixed(1)} MW
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-xl leading-none px-1"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Risk summary */}
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/60 rounded-lg p-3 border border-slate-700">
            {analysis.risk_summary}
          </p>

          {/* Details grid */}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
              <dt className="text-xs text-slate-500 mb-1">Terrain</dt>
              <dd className="text-slate-200 capitalize">{analysis.terrain}</dd>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
              <dt className="text-xs text-slate-500 mb-1">Vegetation</dt>
              <dd className="text-slate-200 capitalize">{analysis.vegetation}</dd>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
              <dt className="text-xs text-slate-500 mb-1">Structures nearby</dt>
              <dd className={analysis.structures_nearby ? "text-red-400 font-medium" : "text-emerald-400"}>
                {analysis.structures_nearby ? "Yes — elevated concern" : "None detected"}
              </dd>
            </div>
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
              <dt className="text-xs text-slate-500 mb-1">Predicted spread</dt>
              <dd className="text-slate-200">{analysis.spread_direction}</dd>
            </div>
          </dl>

          {/* Weather strip */}
          {weather && (
            <div className="flex gap-4 text-xs text-slate-400 border-t border-slate-800 pt-3">
              <span>Wind: <strong className="text-slate-200 font-mono">{weather.wind_speed_kmh} km/h {weather.wind_direction_cardinal}</strong></span>
              <span>Humidity: <strong className="text-slate-200 font-mono">{weather.humidity}%</strong></span>
              <span>Temp: <strong className="text-slate-200 font-mono">{weather.temperature_c}°C</strong></span>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Analyzed {new Date(analysis.analyzed_at).toLocaleTimeString()} &middot; Confidence: {hotspot.confidence}
          </p>
        </div>
      </div>
    </div>
  );
}
