import React from "react";
import { IntelligenceModal } from "./IntelligenceModal";
import { DataFreshnessLine } from "./DataFreshnessLine";
import { EvidenceStack } from "./EvidenceStack";

interface ProviderInfo {
  name: string;
  status: "healthy" | "degraded" | "unavailable" | "archived";
  lifecycle: string;
  domains?: { name: string; healthy: boolean }[];
  message?: string;
}

interface DataSourceInfo {
  label: string;
  status: "fresh" | "stale" | "critical" | "unavailable";
}

interface SourceAuditSheetProps {
  open: boolean;
  onClose: () => void;
  symbol: string;
  providers?: ProviderInfo[];
  dataSources?: DataSourceInfo[];
  evidence?: { label: string; value: string | null; status?: "available" | "partial" | "unavailable" }[];
  className?: string;
}

export function SourceAuditSheet({ open, onClose, symbol, providers, dataSources, evidence, className = "" }: SourceAuditSheetProps) {
  return (
    <IntelligenceModal open={open} onClose={onClose} title={`Source audit — ${symbol}`} subtitle="Data sources and evidence recency for this symbol.">
      <div className={`space-y-5 ${className}`}>
        {providers && providers.length > 0 && (
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">Data sources</span>
            <div className="mt-2 divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02]">
              {providers.map((p) => (
                <div key={p.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#E6EDF3]">{p.name}</span>
                    <span className="ml-2 text-[10px] text-[#484F58]">{p.lifecycle}</span>
                    {p.message && <p className="mt-0.5 text-[10px] text-[#8B949E]">{p.message}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    p.status === "healthy" ? "bg-[#22AB94]/10 text-[#22AB94]" :
                    p.status === "degraded" ? "bg-[#EF9A09]/10 text-[#EF9A09]" :
                    "bg-[#484F58]/10 text-[#484F58]"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      p.status === "healthy" ? "bg-[#22AB94]" :
                      p.status === "degraded" ? "bg-[#EF9A09]" :
                      "bg-[#484F58]"
                    }`} />
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dataSources && dataSources.length > 0 && (
          <DataFreshnessLine items={dataSources} />
        )}

        {evidence && evidence.length > 0 && (
          <EvidenceStack items={evidence} />
        )}

        {(!providers || providers.length === 0) && (!dataSources || dataSources.length === 0) && (!evidence || evidence.length === 0) && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center">
            <p className="text-sm font-medium text-[#8B949E]">Audit information not yet available</p>
            <p className="mt-1 text-xs text-[#484F58]">Source information will appear once research context data is available for {symbol}.</p>
          </div>
        )}
      </div>
    </IntelligenceModal>
  );
}
