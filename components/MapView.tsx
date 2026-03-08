"use client";

import { useEffect, useRef } from "react";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { TriageResult, RiskColor } from "@/lib/tools/triage";

export interface HotspotWithAnalysis extends Hotspot {
  analysis?: TriageResult | null;
}

interface MapViewProps {
  hotspots?: HotspotWithAnalysis[];
  selectedId?: string | null;
  onSelect?: (hotspot: HotspotWithAnalysis) => void;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  label?: string;
}

const RISK_COLORS: Record<RiskColor, string> = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#10b981",
};

export function MapView({
  hotspots = [],
  selectedId,
  onSelect,
  center,
  zoom = 4,
  label,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Map<string, import("leaflet").CircleMarker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;
    let unmounted = false;

    import("leaflet").then((L) => {
      if (unmounted || !containerRef.current || mapRef.current) return;

      // Default center: Canada
      const defaultCenter: [number, number] = center
        ? [center[1], center[0]]
        : [56.0, -96.0];

      const map = L.default.map(containerRef.current, {
        center: defaultCenter,
        zoom,
        zoomControl: true,
      });

      L.default
        .tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: "abcd",
          }
        )
        .addTo(map);

      mapRef.current = map;

      if (label && center) {
        L.default.marker([center[1], center[0]]).addTo(map).bindTooltip(label);
      }
    });

    return () => {
      unmounted = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update circle markers when hotspots or analyses change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      // Remove markers no longer in the list
      const currentIds = new Set(hotspots.map((h) => h.id));
      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });

      hotspots.forEach((hotspot) => {
        const color = hotspot.analysis
          ? RISK_COLORS[hotspot.analysis.risk_color]
          : "#94a3b8"; // slate-400 for unanalyzed
        const isSelected = hotspot.id === selectedId;
        const radius = isSelected ? 10 : 7;
        const weight = isSelected ? 2 : 1;

        const existing = markersRef.current.get(hotspot.id);
        if (existing) {
          existing.setStyle({ fillColor: color, color: isSelected ? "#f59e0b" : color, radius, weight });
        } else {
          const marker = L.default
            .circleMarker([hotspot.lat, hotspot.lon], {
              radius,
              fillColor: color,
              color,
              fillOpacity: 0.85,
              weight,
            })
            .addTo(map);

          const tooltipContent = hotspot.analysis
            ? `${hotspot.analysis.risk_level}: ${hotspot.analysis.risk_summary.slice(0, 80)}...`
            : `${hotspot.lat.toFixed(3)}, ${hotspot.lon.toFixed(3)} — pending analysis`;
          marker.bindTooltip(tooltipContent, { sticky: true });

          if (onSelect) {
            marker.on("click", () => onSelect(hotspot));
          }
          markersRef.current.set(hotspot.id, marker);
        }
      });
    });
  }, [hotspots, selectedId, onSelect]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-800"
      style={{ minHeight: 300 }}
    />
  );
}
