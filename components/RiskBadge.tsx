import type { RiskLevel } from "@/lib/tools/triage";

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
}

const STYLES: Record<RiskLevel, string> = {
  HIGH: "bg-red-600/20 text-red-400 border border-red-600/40",
  MEDIUM: "bg-amber-600/20 text-amber-400 border border-amber-600/40",
  LOW: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40",
};

const DOTS: Record<RiskLevel, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-emerald-500",
};

export function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const text = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";
  const padding = size === "lg" ? "px-3 py-1" : size === "sm" ? "px-2 py-0.5" : "px-2.5 py-0.5";
  const dot = size === "lg" ? "w-2.5 h-2.5" : "w-2 h-2";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold ${text} ${padding} ${STYLES[level]}`}>
      <span className={`rounded-full ${dot} ${DOTS[level]} animate-pulse`} />
      {level}
    </span>
  );
}
