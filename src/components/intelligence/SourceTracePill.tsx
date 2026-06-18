import React from "react";
import { Database } from "lucide-react";

interface SourceTracePillProps {
  provider: string;
  domain?: string | null;
  status: "healthy" | "degraded" | "unavailable" | "archived";
  detail?: string | null;
  className?: string;
  onClick?: () => void;
}

const STATUS_STYLE: Record<string, { dot: string; text: string }> = {
  healthy: { dot: "bg-[#22AB94]", text: "text-[#22AB94]" },
  degraded: { dot: "bg-[#EF9A09]", text: "text-[#EF9A09]" },
  unavailable: { dot: "bg-[#F23645]", text: "text-[#F23645]" },
  archived: { dot: "bg-[#484F58]", text: "text-[#484F58]" },
};

export function SourceTracePill({ provider, domain, status, detail, className = "", onClick }: SourceTracePillProps) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.unavailable;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#8B949E] hover:bg-white/[0.06] transition-colors ${className}`}
      title={detail || `${provider} — ${status}`}
    >
      <Database className="h-3 w-3 text-[#484F58]" aria-hidden="true" />
      <span>{provider}</span>
      {domain && <span className="text-[#484F58]">· {domain}</span>}
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
    </button>
  );
}
