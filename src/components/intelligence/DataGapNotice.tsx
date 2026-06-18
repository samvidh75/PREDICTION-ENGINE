import React from "react";
import { MinusCircle } from "lucide-react";

interface DataGapNoticeProps {
  title: string;
  description: string;
  reason?: string | null;
  className?: string;
}

export function DataGapNotice({ title, description, reason, className = "" }: DataGapNoticeProps) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 ${className}`}>
      <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#484F58]" aria-hidden="true" />
      <div>
        <p className="text-xs font-medium text-[#E6EDF3]">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#8B949E]">{description}</p>
        {reason && (
          <p className="mt-1 text-[10px] text-[#484F58]">Reason: {reason}</p>
        )}
      </div>
    </div>
  );
}
