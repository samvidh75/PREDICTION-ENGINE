import React, { useEffect, useState } from "react";
import { Clock3, Database, ShieldCheck } from "lucide-react";
import { useLiveQuote } from "../../hooks/useLiveQuotes";
import { StockRegistry } from "../../services/stocks/StockRegistry";
import { api, ApiError, type CompanyMetadata } from "../../services/api/client";

export type QuoteFreshness = "Recent" | "Delayed" | "Stale" | "Unavailable";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export function getQuoteFreshness(updatedAt?: string, nowMs: number = Date.now()): QuoteFreshness {
  if (!updatedAt) return "Unavailable";
  const timestamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(timestamp)) return "Unavailable";

  const ageMs = nowMs - timestamp;
  if (ageMs < -FUTURE_TOLERANCE_MS) return "Unavailable";
  if (ageMs <= FIFTEEN_MINUTES_MS) return "Recent";
  if (ageMs <= ONE_DAY_MS) return "Delayed";
  return "Stale";
}

function formatDateTime(value?: string): string {
  if (!value) return "Data unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data unavailable";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function sourceLabel(source?: CompanyMetadata["enrichmentSource"]): string {
  switch (source) {
    case "provider":
      return "Provider metadata";
    case "registry":
      return "Verified registry";
    case "fallback":
      return "Structured fallback";
    default:
      return "Data unavailable";
  }
}

function stateClass(value: string): string {
  if (value === "VERIFIED" || value === "Recent") return "text-emerald-700";
  if (value === "PARTIAL" || value === "Delayed") return "text-amber-700";
  if (value === "INVALID" || value === "Stale") return "text-rose-700";
  return "text-slate-500";
}

function TrustItem({ label, value, detail, valueClass = "text-slate-800" }: {
  label: string;
  value: string;
  detail?: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-[11px] font-semibold ${valueClass}`}>{value}</div>
      {detail && <div className="mt-0.5 truncate text-[9px] text-slate-500">{detail}</div>}
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

  const registryStock = StockRegistry.getStock(ticker);
  const exchange = metadata?.exchange || quoteState.quote?.exchange || registryStock?.exchange || "Data unavailable";
  const verification = metadataLoading ? "Loading" : metadata?.verificationStatus || "Unavailable";
  const freshness = quoteState.loading ? "Loading" : getQuoteFreshness(quoteState.quote?.updatedAt);
  const quoteTimestamp = quoteState.loading ? "Loading quote timestamp" : formatDateTime(quoteState.quote?.updatedAt);

  return (
    <section aria-label="Stock workspace context" className="mx-auto mb-4 w-full max-w-7xl rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-700" />
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-800">Stock workspace</div>
            <div className="mt-0.5 text-[10px] text-slate-500">{ticker} · {horizon}D prediction horizon · registry-backed scores only</div>
          </div>
        </div>

      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <TrustItem label="Exchange" value={exchange} />
        <TrustItem
          label="Metadata verification"
          value={verification}
          valueClass={stateClass(verification)}
          detail={metadata?.verificationReasons?.length ? metadata.verificationReasons.join(", ") : undefined}
        />
        <TrustItem label="Metadata source" value={sourceLabel(metadata?.enrichmentSource)} />
        <TrustItem
          label="Quote freshness"
          value={freshness}
          valueClass={stateClass(freshness)}
          detail={quoteState.error || undefined}
        />
        <TrustItem label="Quote timestamp" value={quoteTimestamp} />
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[9px] leading-relaxed text-slate-500">
        <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-700" />
        Missing market data remains unavailable. Exchange labels use provider metadata when available, then the local company registry.
        <Clock3 className="ml-1 h-3 w-3 shrink-0 text-slate-400" />
      </div>
    </section>
  );
}
