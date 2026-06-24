import React from "react";

interface PipelineHealthBadgeProps {
  errors: string[];
  providerName?: string;
}

export function PipelineHealthBadge({ errors, providerName }: PipelineHealthBadgeProps) {
  const hasErrors = errors.length > 0;
  const color = hasErrors ? "#EF4444" : "#22C55E";
  const label = hasErrors ? `${errors.length} error${errors.length !== 1 ? "s" : ""}` : "OK";
  const tooltip = hasErrors ? errors.join(" | ") : (providerName ? `${providerName}: healthy` : "All providers healthy");

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-[#64748B]"
      title={tooltip}
      aria-label={`Pipeline health: ${label}`}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {providerName && <span className="text-[#94A3B8]">{providerName}:</span>}
      <span style={{ color }}>{label}</span>
    </span>
  );
}

export default PipelineHealthBadge;
