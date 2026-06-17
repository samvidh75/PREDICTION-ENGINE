import React from "react";

interface SourceFreshnessChipProps {
  date: string | null;
  label?: string;
}

function formatFreshness(dateStr: string): string {
  try {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    if (Number.isNaN(date)) return "Unknown";
    const diffMs = now - date;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  } catch {
    return "Unknown";
  }
}

export default function SourceFreshnessChip({ date, label }: SourceFreshnessChipProps) {
  if (!date) {
    return (
      <span className="inline-flex items-center rounded-lg bg-white/60 border border-white/30 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
        {label || "Pending"}
      </span>
    );
  }

  const freshness = formatFreshness(date);
  const isFresh = freshness === "Just now" || freshness.endsWith("h ago") && parseInt(freshness) < 4;

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
        isFresh
          ? "bg-accent-subtle border-accent-primary/20 text-accent-success"
          : "bg-white/60 border-white/30 text-ink-secondary"
      }`}
    >
      {label ? `${label}: ` : ""}{freshness}
    </span>
  );
}
