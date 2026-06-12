import React, { useEffect, useState } from "react";
import { Bell, Clock3, Database, GitCompare, ShieldCheck } from "lucide-react";
import { useLiveQuote } from "../../hooks/useLiveQuotes";
import type { CompanyMetadata } from "../../services/data/types";

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
  if (value === "VERIFIED" || value === "Recent") return "text-emerald-300";
  if (value === "PARTIAL" || value === "Delayed") return "text-amber-300";
  if (value === "INVALID" || value === "Stale") return "text-rose-300";
  return "text-white/55";
}

function navigate(pageKey: string, ticker: string): void {
  const params = new URLSearchParams(window.location.search);
  params.set("page", pageKey);
  params.set("symbol", ticker);
  params.delete("id");
  params.delete("ticker");
  params.delete("companyId");
  params.delete("tab");
  window.history.pushState({}, "", `?${params.toString()}`);
  window.dispatchEvent(new Event("urlchange"));
}

function TrustItem({ label, value, detail, valueClass = "text-white/80" }: {
  label: string;
  value: string;
  detail?: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-white/5 bg-white/[0.018] px-3 py-2.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">{label}</div>
      <div className={`mt-1 truncate text-[11px] font-semibold ${valueClass}`}>{value}</div>
      {detail && <div className="mt-0.5 truncate text-[9px] text-white/35">{detail}</div>}
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

    fetch(`/api/market-data/metadata/${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("METADATA_UNAVAILABLE");
        return response.json() as Promise<CompanyMetadata>;
      })
      .then((nextMetadata) => {
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

  const exchange = metadata?.exchange || quoteState.quote?.exchange || "Data unavailable";
  const verification = metadataLoading ? "Loading" : metadata?.verificationStatus || "Unavailable";
  const freshness = quoteState.loading ? "Loading" : getQuoteFreshness(quoteState.quote?.updatedAt);
  const quoteTimestamp = quoteState.loading ? "Loading quote timestamp" : formatDateTime(quoteState.quote?.updatedAt);

  return (
    <section aria-label="Stock workspace context" className="mx-auto mb-4 w-full max-w-7xl rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-white shadow-lg shadow-black/10">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-300" />
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-300">Stock workspace</div>
            <div className="mt-0.5 text-[10px] text-white/40">{ticker} · {horizon}D prediction horizon · registry-backed scores only</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("compare", ticker)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 text-[10px] font-bold uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/20"
          >
            <GitCompare className="h-3.5 w-3.5" /> Compare
          </button>
          <button
            type="button"
            onClick={() => navigate("alerts", ticker)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 text-[10px] font-bold uppercase tracking-wider text-violet-300 transition-colors hover:bg-violet-500/20"
          >
            <Bell className="h-3.5 w-3.5" /> Alerts
          </button>
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

      <div className="mt-2 flex items-center gap-1.5 text-[9px] leading-relaxed text-white/35">
        <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-300" />
        Missing market metadata remains unavailable. The workspace never infers an exchange from a bare ticker.
        <Clock3 className="ml-1 h-3 w-3 shrink-0 text-white/35" />
      </div>
    </section>
  );
}
