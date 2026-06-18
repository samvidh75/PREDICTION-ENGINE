import React, { useEffect, useState } from "react";
import { ShieldCheck, Database, TrendingUp, AlertTriangle, HelpCircle, MinusCircle } from "lucide-react";
import { LoadingState } from "../components/ui/DataState";
import { formatNumber } from "../services/ui/dataFormatting";
import { api, ApiError, type TrustMetricsEnvelope, type DataCoverage } from "../services/api/client";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { navigatePage, PremiumPage } from "../components/premium/PremiumUI";
import { IntelligenceModal } from "../components/intelligence/IntelligenceModal";
import { SpatialSheet } from "../components/intelligence/SpatialSheet";
import { RoundedDepthPanel } from "../components/intelligence/RoundedDepthPanel";
import { ModelRunBadge } from "../components/intelligence/ModelRunBadge";
import { DataFreshnessLine } from "../components/intelligence/DataFreshnessLine";
import { MethodologyLink } from "../components/intelligence/MethodologyLink";

interface ProviderDomainEntry {
  healthy: boolean;
  provider: string;
  detail: string;
}

interface ProviderEntry {
  lifecycle: string;
  required: boolean;
  status: string;
  message: string;
  domains?: Record<string, ProviderDomainEntry>;
}

const PROVIDER_LABELS: Record<string, string> = {
  INDIANAPI_KEY: "Indian API",
  YAHOO: "Yahoo Finance",
  JUGAD_DATA: "Jugaad Data",
  NSELIB: "NSELib (archived)",
  NSEPYTHON: "NSE Python",
  FUNDAMENTALS_AUTOMATIC: "Fundamentals",
  CSV_FALLBACK: "CSV Import",
};

const SKIP_PROVIDERS = new Set(["REDIS_URL"]);

const PROVIDER_STATUS_STYLE: Record<string, { dot: string; label: string; color: string }> = {
  healthy: { dot: "bg-[#22AB94]", label: "Healthy", color: "text-[#22AB94]" },
  active: { dot: "bg-[#22AB94]", label: "Active", color: "text-[#22AB94]" },
  degraded: { dot: "bg-[#EF9A09]", label: "Degraded", color: "text-[#EF9A09]" },
  partial: { dot: "bg-[#EF9A09]", label: "Partial", color: "text-[#EF9A09]" },
  unavailable: { dot: "bg-[#F23645]", label: "Unavailable", color: "text-[#F23645]" },
  blocked: { dot: "bg-[#F23645]", label: "Blocked", color: "text-[#F23645]" },
  manual: { dot: "bg-[#2962FF]", label: "Manual", color: "text-[#2962FF]" },
  local_only: { dot: "bg-[#484F58]", label: "Local Only", color: "text-[#484F58]" },
  missing_required: { dot: "bg-[#F23645]", label: "Unavailable", color: "text-[#F23645]" },
  missing_optional: { dot: "bg-[#484F58]", label: "Not Configured", color: "text-[#484F58]" },
  archived_unusable: { dot: "bg-[#484F58]", label: "Archived", color: "text-[#484F58]" },
};

const DOMAIN_LABELS: Record<string, string> = {
  quote: "Quote", historical: "Historical", bhavcopy: "Bhavcopy", index: "Index",
  index_quote: "Index Quote", fundamentals: "Fundamentals", macro: "Macro",
  rbi: "RBI Rates", market_status: "Market Status", manual_import: "Manual Import",
  delivery: "Delivery", sector: "Sector",
};

function getProviderStyle(status: string) {
  return PROVIDER_STATUS_STYLE[status] || PROVIDER_STATUS_STYLE.unavailable;
}

function inferDomains(key: string, entry: ProviderEntry): Record<string, ProviderDomainEntry> {
  if (entry.domains && Object.keys(entry.domains).length > 0) return entry.domains;
  switch (key) {
    case "INDIANAPI_KEY": {
      const h = entry.status === "healthy";
      return { quote: { healthy: h, provider: key, detail: h ? "Live quote source" : "Not configured" } };
    }
    case "FUNDAMENTALS_AUTOMATIC": {
      const h = entry.status === "healthy" || entry.status === "partial";
      return { fundamentals: { healthy: h, provider: key, detail: h ? "DB snapshots + CSV import" : "Not configured" } };
    }
    case "CSV_FALLBACK":
      return { manual_import: { healthy: true, provider: key, detail: "Operator CSV workflow for fundamentals" } };
    default:
      return {};
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Not available";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Not available";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatMetric(value: number | null | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "---";
  return `${value.toFixed(2)}${suffix}`;
}

export const TrustCentrePage: React.FC = () => {
  const [envelope, setEnvelope] = useState<TrustMetricsEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "providers" | "coverage" | "gaps">("overview");
  const [fundamentalsGapSheet, setFundamentalsGapSheet] = useState(false);
  const [symbolGapSheet, setSymbolGapSheet] = useState(false);
  const [detailSheet, setDetailSheet] = useState<{ provider: string; entry: ProviderEntry } | null>(null);
  const [fundamentalsCoverage, setFundamentalsCoverage] = useState<{ total: number; covered: number; missing: number; coveredSymbols: string[]; missingSymbols: string[] } | null>(null);
  const [coverageData, setCoverageData] = useState<any>(null);
  const [coverageLoading, setCoverageLoading] = useState(true);

  useEffect(() => {
    fetch("/api/research/fundamentals-coverage").then(r => r.json()).then(d => {
      if (d.total > 0) setFundamentalsCoverage(d);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    api.getTrustMetrics().then((data) => { if (ctrl.signal.aborted) return; setEnvelope(data); setLoading(false); }).catch((err) => { if (ctrl.signal.aborted) return; setError(err instanceof ApiError ? err.message : "Trust metrics are temporarily unavailable."); setLoading(false); });
    api.getDataCoverage().then((data) => { if (ctrl.signal.aborted) return; setCoverageData(data); setCoverageLoading(false); }).catch(() => { if (ctrl.signal.aborted) return; setCoverageLoading(false); });
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (<div className="p-10"><TopNav /><MobileNav /><LoadingState description="Loading methodology and trust metrics..." /></div>);
  }

  const metrics = envelope?.data;
  const rawState = error ? "error" : envelope?.status ?? "unavailable";
  const asOf = envelope?.dataState?.asOf || coverageData?.generatedAt || null;
  const missingInputs = envelope?.dataState?.missingInputs || [];
  const completenessScore = envelope?.dataState?.completenessScore;

  const providersRaw = coverageData?.providers as Record<string, ProviderEntry> | undefined;
  const providerEntries = providersRaw ? Object.entries(providersRaw).filter(([key]) => !SKIP_PROVIDERS.has(key)) : [];
  const activeProviderEntries = providerEntries.filter(([, entry]) => entry.lifecycle !== "archived");
  const archivedProviderEntries = providerEntries.filter(([, entry]) => entry.lifecycle === "archived");

  const coverage = coverageData?.coverage;
  const generatedAt = coverageData?.generatedAt;

  const coverageTables = [
    { key: "symbols" as const, label: "Companies" },
    { key: "dailyPrices" as const, label: "Daily Prices" },
    { key: "financialSnapshots" as const, label: "Financial Snapshots" },
    { key: "featureSnapshots" as const, label: "Features" },
    { key: "factorSnapshots" as const, label: "Factors" },
    { key: "predictionRegistry" as const, label: "Predictions" },
  ];

  const freshnessItems = [
    { label: "Companies", date: coverage?.symbols?.latestUpdatedAt ?? null },
    { label: "Daily Prices", date: coverage?.dailyPrices?.latestPriceDate ?? null },
    { label: "Financial Snapshots", date: coverage?.financialSnapshots?.latestSnapshotDate ?? null },
    { label: "Features", date: coverage?.featureSnapshots?.latestSnapshotDate ?? null },
    { label: "Factors", date: coverage?.factorSnapshots?.latestSnapshotDate ?? null },
    { label: "Predictions", date: coverage?.predictionRegistry?.latestPredictionDate ?? null },
  ];

  return (
    <PremiumPage nav={<><TopNav /><MobileNav /></>} className="ss-page-trust">
      <div className="w-full space-y-6 px-6 pb-16 pt-20 md:px-10 md:pt-28 lg:px-16 xl:px-24">

        {/* Data Intelligence Centre header */}
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#E6EDF3]">Data Intelligence Centre</h1>
          </div>
          <p className="mt-1 text-xs text-[#8B949E]">Methodology, provider health, data coverage, pipeline freshness, and verified performance metrics.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => navigatePage("rankings")} className="h-9 px-3 text-[11px]">View rankings</Button>
            <Button type="button" onClick={() => navigatePage("about")} variant="secondary" className="h-9 px-3 text-[11px]">Read mission</Button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-px">
          {[
            { key: "overview" as const, label: "Overview" },
            { key: "providers" as const, label: "Providers" },
            { key: "coverage" as const, label: "Coverage" },
            { key: "gaps" as const, label: "Gaps & Methodology" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-t-lg px-4 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? "bg-white/[0.04] text-[#E6EDF3] border-b-2 border-[#2962FF]"
                  : "text-[#484F58] hover:text-[#8B949E]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {rawState !== "ok" && (
          <div className="flex items-start gap-3 rounded-2xl border border-[#EF9A09]/10 bg-[#EF9A09]/[0.03] p-4 text-xs" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF9A09]" />
            <div>
              <p className="font-medium text-[#E6EDF3]">{rawState === "error" ? "Temporarily unavailable" : "Partial data"}</p>
              <p className="mt-1 text-[#8B949E]">{error || envelope?.message || "Some metrics are unavailable because required data sources are not connected."}</p>
              {missingInputs.length > 0 && <p className="mt-1 text-[#484F58]">Some fields require additional verified data updates.</p>}
            </div>
          </div>
        )}

        {activeTab === "overview" && (<>
        {/* Performance audit */}
        <RoundedDepthPanel padding="md">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Performance audit</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Alpha", value: formatMetric(metrics?.alpha) },
              { label: "Hit Rate", value: formatMetric(metrics?.hit_rate, "%") },
              { label: "Sharpe", value: formatMetric(metrics?.sharpe_ratio) },
              { label: "Calibration", value: formatMetric(metrics?.calibration_score, "%") },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">{m.label}</span>
                <div className="mt-1 font-mono text-lg font-bold text-[#E6EDF3]">{m.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Total predictions generated</span>
              <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">
                {metrics?.total_predictions ? metrics.total_predictions >= 1000 ? `${(metrics.total_predictions / 1000).toFixed(1)}K` : metrics.total_predictions.toLocaleString("en-IN") : "N/A"}
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Total outcomes tracked</span>
              <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">
                {metrics?.total_outcomes ? metrics.total_outcomes >= 1000 ? `${(metrics.total_outcomes / 1000).toFixed(1)}K` : metrics.total_outcomes.toLocaleString("en-IN") : "N/A"}
              </div>
            </div>
          </div>
        </RoundedDepthPanel>

        {/* Scored symbols coverage */}
        <RoundedDepthPanel padding="md">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Scored symbols coverage</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-[#E6EDF3]">
              {coverage?.predictionRegistry?.symbolCount ? coverage.predictionRegistry.symbolCount.toLocaleString("en-IN") : "—"}
            </span>
            <span className="text-xs text-[#8B949E]">symbols scored</span>
          </div>
          {coverage?.predictionRegistry?.latestPredictionDate && (
            <ModelRunBadge runDate={coverage.predictionRegistry.latestPredictionDate} className="mt-2" />
          )}
        </RoundedDepthPanel>
        </>)} {/* end overview tab */}

        {activeTab === "providers" && (<>
        {/* Provider Domain Health — Active Sources */}
        {activeProviderEntries.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Active data sources</h2>
            <p className="mt-1 text-[10px] text-[#8B949E]">Provider status is reported per domain, not per provider. A single provider may be Active for some domains and Blocked/Unavailable for others.</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {activeProviderEntries.map(([key, entry]) => {
                const domains = inferDomains(key, entry);
                const s = getProviderStyle(entry.status);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDetailSheet({ provider: key, entry })}
                    className="rounded-2xl border border-white/5 bg-[#0D1117] p-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-[#E6EDF3]">{PROVIDER_LABELS[key] || key.replace(/_/g, " ")}</h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${s.color} border-current/10`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </div>
                    {Object.keys(domains).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(domains).map(([domain, info]) => {
                          const dh = info.healthy;
                          return (
                            <span key={domain} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${dh ? "border-[#22AB94]/10 text-[#22AB94]" : "border-[#484F58]/10 text-[#484F58]"}`}>
                              <span className={`h-1 w-1 rounded-full ${dh ? "bg-[#22AB94]" : "bg-[#484F58]"}`} />
                              {DOMAIN_LABELS[domain] || domain}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {entry.message && <p className="mt-2 text-[10px] leading-relaxed text-[#8B949E]">{entry.message}</p>}
                    {generatedAt && <p className="mt-2 text-[10px] text-[#484F58]">As of {formatDate(generatedAt)}</p>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Archived evaluations */}
        {archivedProviderEntries.length > 0 && (
          <section>
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#8B949E] hover:text-[#E6EDF3] transition-colors">
                <span>Archived evaluations ({archivedProviderEntries.length})</span>
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {archivedProviderEntries.map(([key, entry]) => {
                  const s = getProviderStyle(entry.status);
                  return (
                    <div key={key} className="rounded-2xl border border-white/5 bg-[#0D1117] p-4 opacity-60">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-[#E6EDF3]">{PROVIDER_LABELS[key] || "Provider"}</h3>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${s.color} border-current/10`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      {entry.message && <p className="mt-2 text-[10px] leading-relaxed text-[#8B949E]">{entry.message}</p>}
                    </div>
                  );
                })}
              </div>
            </details>
          </section>
        )} {/* end providers tab */}
        </>)} {/* end providers tab */}

        {activeTab === "coverage" && (<>
        {/* Data Coverage Summary */}
        <RoundedDepthPanel padding="md">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Data coverage summary</h2>
          {coverageLoading ? (
            <p className="mt-3 text-xs text-[#8B949E]">Loading coverage data...</p>
          ) : coverage ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-semibold uppercase tracking-wider text-[#484F58]">
                    <th className="text-left px-4 py-3">Table</th>
                    <th className="text-right px-4 py-3">Rows</th>
                    <th className="text-right px-4 py-3">Symbols</th>
                    <th className="text-right px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageTables.map((row) => {
                    const stats = coverage[row.key];
                    const avail = stats?.status === "available";
                    const isFinancialSnapshots = row.key === "financialSnapshots";
                    const hasPartialRows = isFinancialSnapshots && (stats?.rowCount ?? 0) > 0;
                    const label = hasPartialRows ? "Partial" : avail ? "Available" : "Unavailable";
                    return (
                      <tr key={row.key} className="border-t border-white/5">
                        <td className="px-4 py-3 font-medium text-[#E6EDF3]">{row.label}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#8B949E]">{(stats?.rowCount ?? stats?.count ?? null)?.toLocaleString("en-IN") || "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#8B949E]">{(stats?.symbolCount ?? null)?.toLocaleString("en-IN") || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            label === "Available" ? "bg-[#22AB94]/10 text-[#22AB94]" :
                            label === "Partial" ? "bg-[#EF9A09]/10 text-[#EF9A09]" :
                            "bg-[#484F58]/10 text-[#484F58]"
                          }`}>{label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {generatedAt && <div className="border-t border-white/5 px-4 py-2"><ModelRunBadge runDate={generatedAt} /></div>}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#8B949E]">Coverage data is temporarily unavailable.</p>
          )}
        </RoundedDepthPanel>

        {/* Freshness Dashboard */}
        <RoundedDepthPanel padding="md">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Freshness dashboard</h2>
          {coverage ? (
            <div className="mt-3">
              <DataFreshnessLine items={freshnessItems.map((item) => ({
                label: item.label,
                status: item.date ? "fresh" as const : "unavailable" as const,
              }))} />
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {freshnessItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-[#484F58]">{item.label}</span>
                    <span className="mt-0.5 block font-mono text-xs font-semibold text-[#E6EDF3]">{formatDate(item.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#8B949E]">Freshness data is temporarily unavailable.</p>
          )}
        </RoundedDepthPanel>

        {/* Data status & Evidence completeness */}
        <RoundedDepthPanel padding="md">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Data status</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Scoring database", value: rawState === "ok" || rawState === "partial" ? "Connected" : "Pending" },
              { label: "As of date", value: asOf !== "N/A" ? formatDate(asOf) : "Pending" },
              { label: "Evidence completeness", value: completenessScore ? `${completenessScore}% verified` : "Pending" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-[#484F58]">{item.label}</span>
                <span className="mt-0.5 block text-xs font-semibold text-[#E6EDF3]">{item.value}</span>
              </div>
            ))}
          </div>
        </RoundedDepthPanel>

        {/* Fundamentals coverage */}
        <RoundedDepthPanel padding="md">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Fundamentals coverage</h2>
          <p className="mt-1 text-[10px] text-[#8B949E]">Financial snapshots are the primary source for fundamentals. Coverage is tracked per-symbol with source provenance.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Symbols with snapshots", value: fundamentalsCoverage ? `${fundamentalsCoverage.covered}/${fundamentalsCoverage.total}` : coverage?.financialSnapshots?.symbolCount?.toLocaleString("en-IN") || "—", detail: `${coverage?.financialSnapshots?.rowCount?.toLocaleString("en-IN") || "—"} total rows`, tone: (coverage?.financialSnapshots?.symbolCount ?? 0) > 0 ? "ok" : "warn" },
              { label: "Total tracked", value: fundamentalsCoverage?.total?.toLocaleString("en-IN") || coverage?.symbols?.count?.toLocaleString("en-IN") || "—", detail: "In company registry", tone: "ok" },
              { label: "Missing", value: `${fundamentalsCoverage?.missing ?? Math.max(0, (coverage?.symbols?.count ?? 0) - (coverage?.financialSnapshots?.symbolCount ?? 0))} symbols`, detail: "No financial snapshot available", tone: "warn" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">{item.label}</span>
                <div className="mt-1 font-mono text-sm font-bold text-[#E6EDF3]">{item.value}</div>
                <p className="mt-0.5 text-[10px] text-[#8B949E]">{item.detail}</p>
              </div>
            ))}
          </div>
          {fundamentalsCoverage && fundamentalsCoverage.missingSymbols.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#EF9A09]/10 bg-[#EF9A09]/[0.03] p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#EF9A09]">Missing symbols:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {fundamentalsCoverage.missingSymbols.map((s) => (
                  <span key={s} className="inline-flex items-center rounded-md border border-[#EF9A09]/20 bg-[#EF9A09]/[0.06] px-2 py-0.5 font-mono text-[10px] font-medium text-[#EF9A09]">{s}</span>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setFundamentalsGapSheet(true)}
            className="mt-3 flex w-full items-center gap-2 rounded-xl border border-[#EF9A09]/10 bg-[#EF9A09]/[0.03] px-4 py-2.5 text-left text-[10px] leading-relaxed text-[#8B949E] hover:bg-[#EF9A09]/[0.06] transition-colors"
          >
            <MinusCircle className="h-3.5 w-3.5 shrink-0 text-[#EF9A09]" aria-hidden="true" />
            <span>View fundamentals gap details and import workflow</span>
          </button>
        </RoundedDepthPanel>
        </>)} {/* end coverage tab */}

        {activeTab === "gaps" && (<>
        {/* Symbol data gaps */}
        <RoundedDepthPanel padding="md">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Symbol data gaps</h2>
          <p className="mt-1 text-[10px] text-[#8B949E]">Currently tracked symbols with missing data domains. These are known limitations — no provider returns reliable data for these symbols without bypassing restrictions.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => setSymbolGapSheet(true)} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left hover:bg-white/[0.04] transition-colors">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">No quote</span>
              <span className="mt-1 block text-xs font-semibold text-[#EF9A09]">3 symbols</span>
              <p className="mt-1 text-[10px] text-[#8B949E]">No real-time price available. Provider coverage incomplete. Tap for details.</p>
            </button>
            <button type="button" onClick={() => setSymbolGapSheet(true)} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left hover:bg-white/[0.04] transition-colors">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">No history</span>
              <span className="mt-1 block text-xs font-semibold text-[#EF9A09]">3 symbols</span>
              <p className="mt-1 text-[10px] text-[#8B949E]">Historical price data unavailable. Affects scoring pipeline. Tap for details.</p>
            </button>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Not on leaderboard</span>
              <span className="mt-1 block text-xs font-semibold text-[#EF9A09]">1 symbol</span>
              <p className="mt-1 text-[10px] text-[#8B949E]">Not in latest scoring slice. Re-run scoring pipeline.</p>
            </div>
          </div>
        </RoundedDepthPanel>

        {/* Lineage coverage */}
        <RoundedDepthPanel padding="md">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Lineage coverage</h2>
          <p className="mt-1 text-[10px] text-[#8B949E]">Source trace availability per data domain. Lineage_unavailable means no provenance metadata was recorded at ingestion time.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Prediction input lineage", status: "available", detail: "Consumed via GET /api/research/lineage/:symbol" },
              { label: "Feature snapshots", status: coverage?.featureSnapshots?.status === "available" ? "partial" : "unavailable", detail: "Source columns available after migration 022; backfill pending" },
              { label: "Factor snapshots", status: coverage?.factorSnapshots?.status === "available" ? "partial" : "unavailable", detail: "Source columns available after migration 022; backfill pending" },
              { label: "Financial snapshots", status: coverage?.financialSnapshots?.status === "available" ? "partial" : "unavailable", detail: "source_label, source_url, ingestion_timestamp populated" },
              { label: "Daily prices", status: coverage?.dailyPrices?.status === "available" ? "available" : "unavailable", detail: `Latest: ${formatDate(coverage?.dailyPrices?.latestPriceDate)}` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#E6EDF3]">{item.label}</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    item.status === "available" ? "bg-[#22AB94]/10 text-[#22AB94]" :
                    item.status === "partial" ? "bg-[#EF9A09]/10 text-[#EF9A09]" :
                    "bg-[#484F58]/10 text-[#484F58]"
                  }`}>{item.status}</span>
                </div>
                <p className="mt-1 text-[10px] text-[#8B949E]">{item.detail}</p>
              </div>
            ))}
          </div>
        </RoundedDepthPanel>

        {/* Scoring factors */}
        <RoundedDepthPanel padding="md">
          <h2 className="text-xs font-semibold text-[#E6EDF3]">Scoring factors</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {[
              { title: "Growth", body: "Measures revenue, EPS, profit, and free cash flow trajectory when data is available." },
              { title: "Quality", body: "Evaluates capital returns (ROE, ROIC), profit margins, and operational asset efficiency." },
              { title: "Valuation", body: "Reviews relative pricing multiples and cash yields against industry peers." },
              { title: "Stability & risk", body: "Monitors leverage, cash buffer, accounting flags, and price volatility." },
              { title: "Momentum", body: "Reviews trend strength and relative market signals." },
              { title: "Confidence", body: "Separates score visibility from data completeness, freshness, and consistency." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold text-[#E6EDF3]">{f.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#8B949E]">{f.body}</p>
              </div>
            ))}
          </div>
        </RoundedDepthPanel>
        </>)} {/* end gaps tab */}

        <div className="border-t border-white/5 pt-6">
          <p className="text-[10px] leading-relaxed text-[#484F58]">
            Research only. Scores are derived from verified market data and model calculations. This is not investment advice.
          </p>
        </div>
      </div>

      {/* Fundamentals gap sheet */}
      <SpatialSheet open={fundamentalsGapSheet} onClose={() => setFundamentalsGapSheet(false)} title="Fundamentals coverage gap" subtitle="Financial snapshots are the primary fundamentals data source.">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Coverage</span>
              <span className="text-xs font-semibold text-[#E6EDF3]">{(fundamentalsCoverage?.covered ?? coverage?.financialSnapshots?.symbolCount)?.toLocaleString("en-IN") || "—"} / {(fundamentalsCoverage?.total ?? coverage?.symbols?.count)?.toLocaleString("en-IN") || "—"} symbols</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Missing</span>
              <span className="text-xs font-semibold text-[#EF9A09]">{fundamentalsCoverage?.missing ?? Math.max(0, (coverage?.symbols?.count ?? 0) - (coverage?.financialSnapshots?.symbolCount ?? 0))} symbols</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Total rows</span>
              <span className="text-xs font-semibold text-[#E6EDF3]">{coverage?.financialSnapshots?.rowCount?.toLocaleString("en-IN") || "—"}</span>
            </div>
            {fundamentalsCoverage && fundamentalsCoverage.missingSymbols.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Missing symbols</span>
                <span className="text-xs font-semibold text-[#EF9A09]">{fundamentalsCoverage.missingSymbols.join(", ")}</span>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-[#EF9A09]/10 bg-[#EF9A09]/[0.03] p-3">
            <p className="text-[10px] leading-relaxed text-[#8B949E]">
              <strong>Why is there a gap?</strong> Financial snapshots are populated via DB ingestion and CSV/manual import. The project has verified these sources:
            </p>
            <ul className="mt-2 space-y-1 text-[10px] text-[#8B949E]">
              <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#22AB94]" /> Screener.in (company page, consolidated, quarterly) — viable but HTML parsing is brittle</li>
              <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#F23645]" /> Moneycontrol (financials) — blocked</li>
              <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#F23645]" /> NSE (company info) — blocked</li>
              <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#2962FF]" /> CSV/manual import — preferred workflow</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Next steps</h3>
            <p className="mt-1 text-[10px] text-[#8B949E]">
              To fill fundamentals gaps, use the CSV import workflow. Run <code>npm run import:fundamentals</code> with a properly formatted CSV containing ticker, period, and field values. The importer validates and stores source_label, source_url, and period_type automatically.
            </p>
          </div>
          <MethodologyLink />
        </div>
      </SpatialSheet>

      {/* Symbol gap sheet */}
      <SpatialSheet open={symbolGapSheet} onClose={() => setSymbolGapSheet(false)} title="Symbol data gaps" subtitle="Known limitations for which no safe provider source exists.">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">No quote (3 symbols)</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-[#8B949E]">
              Real-time price is not available for these symbols from any configured provider. Indian API (primary quote source) does not return data for these tickers. Yahoo Finance is blocked. No other verified provider covers these symbols.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">No history (3 symbols)</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-[#8B949E]">
              Historical price data is not available for these symbols. This affects the feature/factor scoring pipeline. tanpa historical data, these symbols cannot receive a complete score.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <h3 className="text-xs font-semibold text-[#E6EDF3]">Not on leaderboard (1 symbol)</h3>
            <p className="mt-1 text-[10px] leading-relaxed text-[#8B949E]">
              This symbol is in the company registry and has a prediction registry entry but is not included in the current scoring leaderboard slice. The scoring pipeline needs to be re-run to include it.
            </p>
          </div>
          <p className="text-[10px] leading-relaxed text-[#484F58]">
            These gaps are known limitations. No provider bypass (proxy, CAPTCHA evasion, cookie theft) is used. The gaps are surfaced honestly so you can decide whether to include these symbols in your research.
          </p>
        </div>
      </SpatialSheet>

      {/* Provider detail sheet */}
      <IntelligenceModal
        open={detailSheet !== null}
        onClose={() => setDetailSheet(null)}
        title={detailSheet ? PROVIDER_LABELS[detailSheet.provider] || detailSheet.provider.replace(/_/g, " ") : ""}
        subtitle="Provider domain health and lifecycle status."
      >
        {detailSheet && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Lifecycle</span>
                <span className="text-xs font-semibold text-[#E6EDF3]">{detailSheet.entry.lifecycle}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Required</span>
                <span className="text-xs font-semibold text-[#E6EDF3]">{detailSheet.entry.required ? "Yes" : "No"}</span>
              </div>
            </div>
            {detailSheet.entry.message && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-xs text-[#8B949E]">{detailSheet.entry.message}</p>
              </div>
            )}
            {detailSheet.entry.domains && Object.keys(detailSheet.entry.domains).length > 0 && (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#484F58]">Domains</span>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(detailSheet.entry.domains).map(([domain, info]) => (
                    <div key={domain} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                      <span className="text-xs text-[#8B949E]">{DOMAIN_LABELS[domain] || domain}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${info.healthy ? "text-[#22AB94]" : "text-[#F23645]"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${info.healthy ? "bg-[#22AB94]" : "bg-[#F23645]"}`} />
                        {info.healthy ? "Healthy" : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <MethodologyLink />
          </div>
        )}
      </IntelligenceModal>
    </PremiumPage>
  );
};

export default TrustCentrePage;
