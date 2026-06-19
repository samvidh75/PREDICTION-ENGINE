import React from "react";

interface FreshnessItem {
  label: string;
  status: "fresh" | "stale" | "critical" | "unavailable";
}

interface DataFreshnessLineProps {
  items: FreshnessItem[];
  className?: string;
}

const STATUS_CONFIG: Record<string, { dot: string; text: string }> = {
  fresh: { dot: "bg-[#22AB94]", text: "text-[#22AB94]" },
  stale: { dot: "bg-[#EF9A09]", text: "text-[#EF9A09]" },
  critical: { dot: "bg-[#F23645]", text: "text-[#F23645]" },
  unavailable: { dot: "bg-[#484F58]", text: "text-[#484F58]" },
};

const STATUS_LABELS: Record<string, string> = {
  fresh: "Fresh",
  stale: "Stale",
  critical: "Critical",
  unavailable: "Unavailable",
};

export function DataFreshnessLine({ items, className = "" }: DataFreshnessLineProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">Data recency</span>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.unavailable;
          const label = STATUS_LABELS[item.status] || "Unavailable";
          return (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#8B949E]"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              {item.label}
              <span className={`text-[9px] font-semibold ${config.text}`}>{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
