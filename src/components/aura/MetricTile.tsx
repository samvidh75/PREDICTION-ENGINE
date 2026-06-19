import React from "react";

interface MetricTileProps {
  label: string;
  value: string;
  detail?: string;
  status?: "positive" | "negative" | "neutral" | "pending";
}

export default function MetricTile({ label, value, detail, status }: MetricTileProps) {
  const statusColors: Record<string, string> = {
    positive: "text-accent-success",
    negative: "text-accent-danger",
    neutral: "text-ink-secondary",
    pending: "text-ink-muted",
  };

  return (
    <div className="rounded-xl bg-[#0D1117]/60 backdrop-blur-sm border border-white/30 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${status ? statusColors[status] : "text-ink"}`}>
        {value}
      </div>
      {detail && <div className="mt-0.5 text-[11px] text-ink-muted">{detail}</div>}
    </div>
  );
}
