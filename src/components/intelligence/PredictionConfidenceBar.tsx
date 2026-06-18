import React from "react";

interface PredictionConfidenceBarProps {
  score: number | null;
  level?: string | null;
  label?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  "Very High": "bg-[#22AB94]",
  "High": "bg-[#2962FF]",
  "Medium": "bg-[#EF9A09]",
  "Low": "bg-[#F23645]",
};

const LEVEL_TEXT: Record<string, string> = {
  "Very High": "text-[#22AB94]",
  "High": "text-[#2962FF]",
  "Medium": "text-[#EF9A09]",
  "Low": "text-[#F23645]",
};

export function PredictionConfidenceBar({ score, level, label = "Confidence" }: PredictionConfidenceBarProps) {
  if (score === null || !Number.isFinite(score)) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">{label}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/5">
          <div className="h-2 w-0 rounded-full bg-white/10" />
        </div>
        <span className="text-[11px] text-[#484F58]">Confidence data pending</span>
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, score));
  const colorClass = level && LEVEL_COLORS[level] ? LEVEL_COLORS[level] : "bg-[#2962FF]";
  const textClass = level && LEVEL_TEXT[level] ? LEVEL_TEXT[level] : "text-[#2962FF]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">{label}</span>
        <span className={`text-xs font-semibold ${textClass}`}>
          {level || `${Math.round(clamped)}%`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
