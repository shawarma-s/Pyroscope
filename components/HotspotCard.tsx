import { RiskBadge } from "./RiskBadge";
import type { Hotspot } from "@/lib/data/nasa-firms";
import type { TriageResult } from "@/lib/tools/triage";

interface HotspotCardProps {
  hotspot: Hotspot;
  analysis: TriageResult | null;
  isAnalyzing: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
}

export function HotspotCard({
  hotspot,
  analysis,
  isAnalyzing,
  isSelected,
  isHovered,
  onClick,
  onHover,
  onHoverEnd,
}: HotspotCardProps) {
  const border = isSelected
    ? "border-amber-500"
    : isHovered
      ? "border-amber-400/70"
      : analysis
        ? analysis.risk_color === "red"
          ? "border-red-600/50"
          : analysis.risk_color === "yellow"
            ? "border-amber-600/50"
            : "border-emerald-600/50"
        : "border-slate-700";

  const ring = isSelected
    ? "ring-1 ring-amber-500/30"
    : isHovered
      ? "ring-1 ring-amber-400/20"
      : "";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={`w-full text-left rounded-xl border bg-slate-800/80 p-4 transition-all hover:bg-slate-800 ${border} ${ring} ${isHovered && !isSelected ? "bg-slate-800" : ""}`}
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
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {analysis.threat_summary || analysis.conclusion}
          </p>
          {analysis.recommended_actions && analysis.recommended_actions.length > 0 && (
            <div className={`flex items-center gap-1.5 text-[10px] font-medium rounded-md px-2 py-1 border
              ${analysis.recommended_actions[0].priority === "IMMEDIATE"
                ? "bg-red-950/40 border-red-800/50 text-red-400"
                : analysis.recommended_actions[0].priority === "URGENT"
                  ? "bg-amber-950/30 border-amber-800/40 text-amber-400"
                  : "bg-slate-700/40 border-slate-600/40 text-slate-400"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-none ${
                analysis.recommended_actions[0].priority === "IMMEDIATE" ? "bg-red-500 animate-pulse" :
                analysis.recommended_actions[0].priority === "URGENT" ? "bg-amber-400" : "bg-slate-400"
              }`} />
              <span className="line-clamp-1">{analysis.recommended_actions[0].action}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
