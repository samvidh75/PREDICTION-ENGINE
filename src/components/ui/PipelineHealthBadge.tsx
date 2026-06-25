import React from "react";

interface DataIntegrityBadgeProps {
  errors: string[];
  label?: string;
}

export function DataIntegrityBadge({ errors, label }: DataIntegrityBadgeProps) {
  const hasErrors = errors.length > 0;
  const color = hasErrors ? "#EF4444" : "#22C55E";
  const displayLabel = hasErrors ? `${errors.length} issue${errors.length !== 1 ? "s" : ""}` : "OK";
  const tooltip = hasErrors ? errors.join(" | ") : (label ? `${label}: OK` : "All data OK");

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B]"
      title={tooltip}
      aria-label={`Data status: ${displayLabel}`}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label && <span className="text-[#94A3B8]">{label}:</span>}
      <span style={{ color }}>{displayLabel}</span>
    </span>
  );
}

export default DataIntegrityBadge;
