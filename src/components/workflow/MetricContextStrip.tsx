import React from "react";

interface MetricContextStripProps {
  items: Array<{ label: string; value: string | number | null; color?: string }>;
  className?: string;
}

export const MetricContextStrip: React.FC<MetricContextStripProps> = ({ items, className = "" }) => {
  if (items.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{item.label}</span>
          <span
            className="font-mono text-xs font-semibold tabular-nums"
            style={{ color: item.color || "#E6EDF3" }}
          >
            {item.value !== null && item.value !== undefined ? item.value : "—"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default MetricContextStrip;
