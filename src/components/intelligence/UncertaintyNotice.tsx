import React from "react";
import { AlertTriangle } from "lucide-react";

interface UncertaintyNoticeProps {
  message: string;
  detail?: string | null;
  className?: string;
}

export function UncertaintyNotice({ message, detail, className = "" }: UncertaintyNoticeProps) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-[#EF9A09]/10 bg-[#EF9A09]/[0.03] p-4 ${className}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF9A09]" aria-hidden="true" />
      <div>
        <p className="text-xs font-medium text-[#E6EDF3]">{message}</p>
        {detail && (
          <p className="mt-1 text-[11px] leading-relaxed text-[#8B949E]">{detail}</p>
        )}
      </div>
    </div>
  );
}
