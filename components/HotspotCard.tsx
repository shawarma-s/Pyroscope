import { RiskBadge } from "./RiskBadge";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { TriageResult } from "@/lib/tools/triage";

interface HotspotCardProps {
  hotspot: Hotspot;
  analysis: TriageResult | null;
  isAnalyzing: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export function HotspotCard({
  hotspot,
  analysis,
  isAnalyzing,
  isSelected,
  onClick,
}: HotspotCardProps) {
  const border = isSelected
    ? "border-amber-500"
    : analysis
      ? analysis.risk_color === "red"
        ? "border-red-600/50"
        : analysis.risk_color === "yellow"
          ? "border-amber-600/50"
          : "border-emerald-600/50"
      : "border-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-slate-800/80 p-4 transition-all hover:bg-slate-800 ${border} ${isSelected ? "ring-1 ring-amber-500/30" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-400 truncate">
            {hotspot.lat.toFixed(3)}°N, {Math.abs(hotspot.lon).toFixed(3)}°W
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {hotspot.acq_date} {hotspot.acq_time} UTC &middot; {hotspot.satellite}
          </p>
        </div>
        {analysis ? (
          <RiskBadge level={analysis.risk_level} size="sm" />
        ) : isAnalyzing ? (
          <span className="text-xs text-amber-400 animate-pulse font-mono">Analyzing...</span>
        ) : (
          <span className="text-xs text-slate-600 font-mono">Pending</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
        <span>FRP: <span className="text-slate-300 font-mono">{hotspot.frp.toFixed(1)} MW</span></span>
        <span>Confidence: <span className="text-slate-300 capitalize">{hotspot.confidence}</span></span>
      </div>

      {analysis && (
        <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {analysis.risk_summary}
        </p>
      )}
    </button>
  );
}
