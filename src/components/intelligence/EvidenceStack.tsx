import React from "react";
import { FileText } from "lucide-react";

interface EvidenceItem {
  label: string;
  value: string | null;
  status?: "available" | "partial" | "unavailable";
}

interface EvidenceStackProps {
  items: EvidenceItem[];
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  available: "bg-[#22AB94]",
  partial: "bg-[#EF9A09]",
  unavailable: "bg-[#484F58]",
};

export function EvidenceStack({ items, className = "" }: EvidenceStackProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">
        <FileText className="h-3 w-3" aria-hidden="true" />
        Evidence
      </span>
      <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02]">
        {items.map((item) => {
          const dotClass = STATUS_DOT[item.status || "unavailable"] || "bg-[#484F58]";
          const valueClass = item.value ? "text-[#E6EDF3]" : "text-[#484F58]";
          return (
            <div key={item.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-xs text-[#8B949E]">{item.label}</span>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${valueClass}`}>
                {item.status && <span className={`h-1 w-1 rounded-full ${dotClass}`} />}
                {item.value || "Not enough information"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
