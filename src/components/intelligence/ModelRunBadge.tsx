import React from "react";
import { Clock, Cpu } from "lucide-react";

interface ModelRunBadgeProps {
  modelVersion?: string | null;
  runDate?: string | null;
  className?: string;
}

export function ModelRunBadge({ modelVersion, runDate, className = "" }: ModelRunBadgeProps) {
  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const hasModel = modelVersion !== null && modelVersion !== undefined;
  const hasDate = runDate !== null && runDate !== undefined;

  if (!hasModel && !hasDate) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#484F58] ${className}`}>
        <Cpu className="h-3 w-3" aria-hidden="true" />
        Model run details not available
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#8B949E] ${className}`}>
      <Cpu className="h-3 w-3 text-[#484F58]" aria-hidden="true" />
      {modelVersion && <span>v{modelVersion}</span>}
      {hasDate && (
        <>
          <Clock className="ml-0.5 h-3 w-3 text-[#484F58]" aria-hidden="true" />
          <span>{formatDate(runDate)}</span>
        </>
      )}
    </span>
  );
}
