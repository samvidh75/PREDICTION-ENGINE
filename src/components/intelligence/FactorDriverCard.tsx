import React from "react";

interface FactorDriverCardProps {
  label: string;
  score: number | null;
  description?: string | null;
}

export function FactorDriverCard({ label, score, description }: FactorDriverCardProps) {
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const displayScore = hasScore ? Math.round(score) : null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#E6EDF3]">{label}</span>
        {displayScore !== null ? (
          <span className="text-sm font-bold tabular-nums text-[#E6EDF3]">{displayScore}</span>
        ) : (
          <span className="text-[10px] text-[#484F58]">—</span>
        )}
      </div>
      {hasScore && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-1.5 rounded-full bg-[#2962FF] transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
          />
        </div>
      )}
      {description && (
        <p className="mt-2 text-[11px] leading-relaxed text-[#8B949E]">{description}</p>
      )}
    </div>
  );
}
