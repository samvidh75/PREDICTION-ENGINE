import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useLiveQuote } from "../../hooks/useLiveQuotes";
import { api, type CompanyMetadata } from "../../services/api/client";

function formatDateTime(value?: string): string {
  if (!value) return "Updated information not yet available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated information not yet available";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function stateClass(value: string): string {
  if (value === "VERIFIED" || value === "Recent") return "text-[#16A34A]";
  if (value === "PARTIAL" || value === "Delayed") return "text-[#F59E0B]";
  if (value === "INVALID" || value === "Stale") return "text-[#EF4444]";
  return "text-[#64748B]";
}

function TrustItem({ label, value, detail, valueClass = "text-[#E6EDF3]" }: {
  label: string;
  value: string;
  detail?: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#8B949E]">{label}</div>
      <div className={`mt-1 truncate text-[11px] font-semibold ${valueClass}`}>{value}</div>
      {detail && <div className="mt-0.5 truncate text-[9px] text-[#64748B]">{detail}</div>}
    </div>
  );
}

export default function StockWorkspaceBar({ ticker, horizon }: { ticker: string; horizon: number }) {
  const quoteState = useLiveQuote(ticker);
  const [metadata, setMetadata] = useState<CompanyMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setMetadataLoading(true);
    setMetadata(null);

    api.getMetadata(ticker)
      .then((nextMetadata) => {
        if (controller.signal.aborted) return;
        setMetadata(nextMetadata);
        setMetadataLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setMetadata(null);
        setMetadataLoading(false);
      });

    return () => controller.abort();
  }, [ticker]);

  const researchStatus = metadataLoading ? "Loading research" : metadata?.verificationStatus === "VERIFIED" ? "Research active" : "Awaiting research";
  const dataStatus = quoteState.loading ? "Loading" : metadata?.verificationStatus === "VERIFIED" ? "Available" : "Awaiting data";

  return (
    <section aria-label="Stock workspace context" className="mb-4 w-full rounded-lg border border-[rgba(148,163,184,0.12)] bg-[#0C1119] px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#16A34A]">Research workspace</div>
            <div className="mt-0.5 text-[10px] text-[#9AA7B5]">{horizon}D research horizon</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <TrustItem
          label="Research status"
          value={researchStatus}
          valueClass={stateClass(researchStatus)}
          detail={metadata?.verificationReasons?.length ? metadata.verificationReasons.join(", ") : undefined}
        />
        <TrustItem label="Market data" value={dataStatus} valueClass={stateClass(dataStatus)} />
      </div>

      <div className="mt-2 text-[9px] leading-relaxed text-[#64748B]">
        Research context is based on available data.
      </div>
    </section>
  );
}
