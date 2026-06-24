import React from "react";

interface FactorBarProps {
  label: string;
  value: number | null;
  showValue?: boolean;
  compact?: boolean;
}

function scoreColor(v: number | null): string {
  if (v === null) return "#94A3B8";
  if (v >= 70) return "#16A34A";
  if (v >= 55) return "#22C55E";
  if (v >= 40) return "#92400E";
  if (v >= 25) return "#FB923C";
  return "#EF4444";
}

export function FactorBar({ label, value, showValue = true, compact = false }: FactorBarProps) {
  const color = scoreColor(value);
  const pct = value !== null ? Math.max(0, Math.min(100, value)) : 0;
  const display = value !== null ? Math.round(value).toString() : "—";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-[10px] text-[#64748B] truncate">{label}</span>
        <div className="flex-1 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        {showValue && (
          <span className="w-6 text-right text-[10px] font-semibold tabular-nums" style={{ color }}>{display}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-[#64748B] truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showValue && (
        <span className="w-8 text-right text-xs font-semibold tabular-nums" style={{ color }}>{display}</span>
      )}
    </div>
  );
}

export default FactorBar;
