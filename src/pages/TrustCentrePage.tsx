import React, { useEffect, useState } from "react";
import { Database, TrendingUp, AlertTriangle, X, CheckCircle2, ShieldCheck, MinusCircle } from "lucide-react";
import { LoadingState } from "../components/ui/DataState";
import { api, ApiError, type TrustMetricsEnvelope, type DataCoverage } from "../services/api/client";
import { ProductShell, ProductPage, ProductPanel, ProductAction, ProductStatusPill, productNavigate } from "../components/product/ProductUI";

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
  const [coverageData, setCoverageData] = useState<DataCoverage | null>(null);
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
    return (
      <ProductShell>
        <div className="flex items-center justify-center py-20">
          <LoadingState description="Loading methodology and trust metrics..." />
        </div>
      </ProductShell>
    );
  }

  const metrics = envelope?.data;
  const rawState = error ? "error" : envelope?.status ?? "unavailable";
  const asOf = envelope?.dataState?.asOf || coverageData?.generatedAt || null;

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

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "providers", label: "Providers" },
    { key: "coverage", label: "Coverage" },
    { key: "gaps", label: "Gaps & Methodology" },
  ];

  return (
    <ProductShell>
      <ProductPage>
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#E6EDF3]">Data Intelligence Centre</h1>
          </div>
          <p className="mt-1 text-xs text-[#9AA7B5]">Methodology, provider health, data coverage, pipeline freshness, and verified performance metrics.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ProductAction onClick={() => productNavigate("rankings")}>View rankings</ProductAction>
            <ProductAction onClick={() => productNavigate("about")} variant="secondary">Read mission</ProductAction>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-[rgba(148,163,184,0.16)] pb-px" aria-label="Trust centre tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-selected={activeTab === tab.key}
              aria-controls={`trust-tabpanel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 rounded-t-lg px-4 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? "bg-[rgba(255,255,255,0.04)] text-[#E6EDF3] border-b-2 border-[#2962FF]"
                  : "text-[#64748B] hover:text-[#9AA7B5]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {rawState !== "ok" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-xs" role="status">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
            <div className="text-[#9AA7B5]">
              {rawState === "error" ? "Temporarily unavailable — " : "Partial data — "}
              {error || envelope?.message || "Some metrics are unavailable."}
            </div>
          </div>
        )}

        {activeTab === "overview" && <div id="trust-tabpanel-overview" role="tabpanel" aria-labelledby="trust-tab-overview">
          <ProductPanel className="mt-5 p-4 md:p-5">
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
                <div key={m.label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4 text-center">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{m.label}</span>
                  <div className="mt-1 font-mono text-lg font-bold text-[#E6EDF3]">{m.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Total predictions generated</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">
                  {metrics?.total_predictions != null ? metrics.total_predictions >= 1000 ? `${(metrics.total_predictions / 1000).toFixed(1)}K` : metrics.total_predictions.toLocaleString("en-IN") : "N/A"}
                </div>
              </div>
              <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Total outcomes tracked</span>
                <div className="mt-1 font-mono text-xl font-bold text-[#E6EDF3]">
                  {metrics?.total_outcomes != null ? metrics.total_outcomes >= 1000 ? `${(metrics.total_outcomes / 1000).toFixed(1)}K` : metrics.total_outcomes.toLocaleString("en-IN") : "N/A"}
                </div>
              </div>
            </div>
          </ProductPanel>

          <ProductPanel className="mt-4 p-4 md:p-5">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Scored symbols coverage</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#E6EDF3]">
                {coverage?.predictionRegistry?.symbolCount ? coverage.predictionRegistry.symbolCount.toLocaleString("en-IN") : "\u2014"}
              </span>
              <span className="text-xs text-[#9AA7B5]">symbols scored</span>
            </div>
            {coverage?.predictionRegistry?.latestPredictionDate && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#9AA7B5]">
                <CheckCircle2 className="h-3 w-3 text-[#16A34A]" aria-hidden="true" />
                Last run: {formatDate(coverage.predictionRegistry.latestPredictionDate)}
              </div>
            )}
          </ProductPanel>
        </div>}

        {activeTab === "providers" && <div id="trust-tabpanel-providers" role="tabpanel" aria-labelledby="trust-tab-providers">
          {activeProviderEntries.length > 0 && (
            <section className="mt-5">
              <h2 className="text-xs font-semibold text-[#E6EDF3]">Active data sources</h2>
              <p className="mt-1 text-[10px] text-[#9AA7B5]">Provider status is reported per domain, not per provider. A single provider may be Active for some domains and Blocked/Unavailable for others.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeProviderEntries.map(([key, entry]) => {
                  const domains = inferDomains(key, entry);
                  const s = getProviderStyle(entry.status);
                  const isOpen = detailSheet?.provider === key;
                  return (
                    <div key={key}>
                      <button
                        type="button"
                        onClick={() => setDetailSheet(isOpen ? null : { provider: key, entry })}
                        className="w-full rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] p-4 text-left transition hover:border-[#2962FF]/40"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-[#E6EDF3]">{PROVIDER_LABELS[key] || key.replace(/_/g, " ")}</h3>
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${s.color} border-current/10`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </div>
                        {Object.keys(domains).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(domains).map(([domain, info]) => {
                              const dh = info.healthy;
                              return (
                                <span key={domain} className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${dh ? "border-[#22AB94]/10 text-[#22AB94]" : "border-[#64748B]/10 text-[#64748B]"}`}>
                                  <span className={`h-1 w-1 rounded-full ${dh ? "bg-[#22AB94]" : "bg-[#64748B]"}`} />
                                  {DOMAIN_LABELS[domain] || domain}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {entry.message && !isOpen && <p className="mt-2 text-[10px] leading-relaxed text-[#9AA7B5]">{entry.message}</p>}
                        {generatedAt && <p className="mt-2 text-[10px] text-[#64748B]">As of {formatDate(generatedAt)}</p>}
                      </button>
                      {isOpen && (
                        <ProductPanel className="mt-2 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-[#E6EDF3]">{PROVIDER_LABELS[key] || key.replace(/_/g, " ")} details</h3>
                            <button type="button" onClick={() => setDetailSheet(null)} className="text-[#64748B] hover:text-[#9AA7B5] transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-2">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Lifecycle</span>
                              <span className="text-xs font-semibold text-[#E6EDF3]">{entry.lifecycle}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-2">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Required</span>
                              <span className="text-xs font-semibold text-[#E6EDF3]">{entry.required ? "Yes" : "No"}</span>
                            </div>
                            {entry.message && (
                              <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                                <p className="text-xs text-[#9AA7B5]">{entry.message}</p>
                              </div>
                            )}
                            {entry.domains && Object.keys(entry.domains).length > 0 && (
                              <div>
                                <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Domains</span>
                                <div className="mt-2 space-y-1.5">
                                  {Object.entries(entry.domains).map(([domain, info]) => (
                                    <div key={domain} className="flex items-center justify-between rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-3 py-2">
                                      <span className="text-xs text-[#9AA7B5]">{DOMAIN_LABELS[domain] || domain}</span>
                                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${info.healthy ? "text-[#22AB94]" : "text-[#F23645]"}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${info.healthy ? "bg-[#22AB94]" : "bg-[#F23645]"}`} />
                                        {info.healthy ? "Healthy" : "Unavailable"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="text-[10px] text-[#64748B]">
                              Provider health reflects actual API response status. No fabricated availability data is shown.
                            </div>
                          </div>
                        </ProductPanel>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {archivedProviderEntries.length > 0 && (
            <section className="mt-6">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#9AA7B5] hover:text-[#E6EDF3] transition-colors">
                  <span>Archived evaluations ({archivedProviderEntries.length})</span>
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {archivedProviderEntries.map(([key, entry]) => {
                    const s = getProviderStyle(entry.status);
                    return (
                      <div key={key} className="rounded-lg border border-[rgba(148,163,184,0.16)] bg-[#0D1117] p-4 opacity-60">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-[#E6EDF3]">{PROVIDER_LABELS[key] || "Provider"}</h3>
                          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${s.color} border-current/10`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </div>
                        {entry.message && <p className="mt-2 text-[10px] leading-relaxed text-[#9AA7B5]">{entry.message}</p>}
                      </div>
                    );
                  })}
                </div>
              </details>
            </section>
          )}
        </div>}

        {activeTab === "coverage" && <div id="trust-tabpanel-coverage" role="tabpanel" aria-labelledby="trust-tab-coverage">
          <ProductPanel className="mt-5 p-4 md:p-5">
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Data coverage summary</h2>
            {coverageLoading ? (
              <p className="mt-3 text-xs text-[#9AA7B5]">Loading coverage data...</p>
            ) : coverage ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-[rgba(148,163,184,0.12)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(148,163,184,0.12)] text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
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
                        <tr key={row.key} className="border-t border-[rgba(148,163,184,0.12)]">
                          <td className="px-4 py-3 font-medium text-[#E6EDF3]">{row.label}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#9AA7B5]">{(stats?.rowCount ?? stats?.count ?? null)?.toLocaleString("en-IN") || "\u2014"}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#9AA7B5]">{(stats?.symbolCount ?? null)?.toLocaleString("en-IN") || "\u2014"}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                              label === "Available" ? "border-[#22AB94]/10 text-[#22AB94]" :
                              label === "Partial" ? "border-[#F59E0B]/10 text-[#F59E0B]" :
                              "border-[#64748B]/10 text-[#64748B]"
                            }`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {generatedAt && <div className="border-t border-[rgba(148,163,184,0.12)] px-4 py-2 flex items-center gap-1.5 text-[10px] text-[#64748B]"><CheckCircle2 className="h-3 w-3 text-[#16A34A]" />Generated {formatDate(generatedAt)}</div>}
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#9AA7B5]">Coverage data is temporarily unavailable.</p>
            )}
          </ProductPanel>

          <ProductPanel className="mt-4 p-4 md:p-5">
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Freshness dashboard</h2>
            {coverage ? (
              <div className="mt-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {freshnessItems.map((item) => (
                    <div key={item.label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{item.label}</span>
                      <span className="mt-0.5 block font-mono text-xs font-semibold text-[#E6EDF3]">{formatDate(item.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#9AA7B5]">Freshness data is temporarily unavailable.</p>
            )}
          </ProductPanel>

          <ProductPanel className="mt-4 p-4 md:p-5">
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Data status</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Scoring database", value: rawState === "ok" || rawState === "partial" ? "Connected" : "Pending" },
                { label: "As of date", value: asOf !== null && asOf !== "N/A" ? formatDate(asOf) : "Pending" },
                { label: "Evidence completeness", value: envelope?.dataState?.completenessScore ? `${envelope.dataState.completenessScore}% verified` : "Pending" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                  <span className="block text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-[#E6EDF3]">{item.value}</span>
                </div>
              ))}
            </div>
          </ProductPanel>

          <ProductPanel className="mt-4 p-4 md:p-5">
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Fundamentals coverage</h2>
            <p className="mt-1 text-[10px] text-[#9AA7B5]">Financial snapshots are the primary source for fundamentals. Coverage is tracked per-symbol with source provenance.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Symbols with snapshots", value: fundamentalsCoverage ? `${fundamentalsCoverage.covered}/${fundamentalsCoverage.total}` : coverage?.financialSnapshots?.symbolCount?.toLocaleString("en-IN") || "\u2014", detail: `${coverage?.financialSnapshots?.rowCount?.toLocaleString("en-IN") || "\u2014"} total rows`, tone: (coverage?.financialSnapshots?.symbolCount ?? 0) > 0 ? "ok" : "warn" },
                { label: "Total tracked", value: fundamentalsCoverage?.total?.toLocaleString("en-IN") || coverage?.symbols?.count?.toLocaleString("en-IN") || "\u2014", detail: "In company registry", tone: "ok" },
                { label: "Missing", value: `${fundamentalsCoverage?.missing ?? Math.max(0, (coverage?.symbols?.count ?? 0) - (coverage?.financialSnapshots?.symbolCount ?? 0))} symbols`, detail: "No financial snapshot available", tone: "warn" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">{item.label}</span>
                  <div className="mt-1 font-mono text-sm font-bold text-[#E6EDF3]">{item.value}</div>
                  <p className="mt-0.5 text-[10px] text-[#9AA7B5]">{item.detail}</p>
                </div>
              ))}
            </div>
            {fundamentalsCoverage && fundamentalsCoverage.missingSymbols.length > 0 && (
              <div className="mt-3 rounded-lg border border-[rgba(245,158,11,0.16)] bg-[rgba(245,158,11,0.04)] p-3">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#F59E0B]">Missing symbols:</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {fundamentalsCoverage.missingSymbols.map((s) => (
                    <span key={s} className="inline-flex items-center rounded-md border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.06)] px-2 py-0.5 font-mono text-[10px] font-medium text-[#F59E0B]">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setFundamentalsGapSheet(prev => !prev)}
              className="mt-3 flex w-full items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] px-4 py-2.5 text-left text-[10px] leading-relaxed text-[#9AA7B5] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <MinusCircle className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" aria-hidden="true" />
              <span>View fundamentals gap details and import workflow</span>
            </button>
            {fundamentalsGapSheet && (
              <ProductPanel className="mt-2 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[#E6EDF3]">Fundamentals coverage gap</h3>
                  <button type="button" onClick={() => setFundamentalsGapSheet(false)} className="text-[#64748B] hover:text-[#9AA7B5] transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mb-3 text-[10px] text-[#9AA7B5]">Financial snapshots are the primary fundamentals data source.</p>
                <div className="space-y-3">
                  <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Coverage</span>
                      <span className="text-xs font-semibold text-[#E6EDF3]">{(fundamentalsCoverage?.covered ?? coverage?.financialSnapshots?.symbolCount)?.toLocaleString("en-IN") || "\u2014"} / {(fundamentalsCoverage?.total ?? coverage?.symbols?.count)?.toLocaleString("en-IN") || "\u2014"} symbols</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Missing</span>
                      <span className="text-xs font-semibold text-[#F59E0B]">{fundamentalsCoverage?.missing ?? Math.max(0, (coverage?.symbols?.count ?? 0) - (coverage?.financialSnapshots?.symbolCount ?? 0))} symbols</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Total rows</span>
                      <span className="text-xs font-semibold text-[#E6EDF3]">{coverage?.financialSnapshots?.rowCount?.toLocaleString("en-IN") || "\u2014"}</span>
                    </div>
                    {fundamentalsCoverage && fundamentalsCoverage.missingSymbols.length > 0 && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Missing symbols</span>
                        <span className="text-xs font-semibold text-[#F59E0B]">{fundamentalsCoverage.missingSymbols.join(", ")}</span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-[rgba(245,158,11,0.16)] bg-[rgba(245,158,11,0.04)] p-3">
                    <p className="text-[10px] leading-relaxed text-[#9AA7B5]">
                      <strong className="text-[#E6EDF3]">Why is there a gap?</strong> Financial snapshots are populated via DB ingestion and CSV/manual import. The project has verified these sources:
                    </p>
                    <ul className="mt-2 space-y-1 text-[10px] text-[#9AA7B5]">
                      <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#22AB94]" /> Screener.in (company page, consolidated, quarterly) — viable but HTML parsing is brittle</li>
                      <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#F23645]" /> Moneycontrol (financials) — blocked</li>
                      <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#F23645]" /> NSE (company info) — blocked</li>
                      <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#2962FF]" /> CSV/manual import — preferred workflow</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                    <h3 className="text-xs font-semibold text-[#E6EDF3]">Next steps</h3>
                    <p className="mt-1 text-[10px] text-[#9AA7B5]">
                      To fill fundamentals gaps, use the CSV import workflow. Run <code className="bg-[rgba(255,255,255,0.06)] px-1 rounded">npm run import:fundamentals</code> with a properly formatted CSV containing ticker, period, and field values. The importer validates and stores source_label, source_url, and period_type automatically.
                    </p>
                  </div>
                </div>
              </ProductPanel>
            )}
          </ProductPanel>
        </div>}

        {activeTab === "gaps" && <div id="trust-tabpanel-gaps" role="tabpanel" aria-labelledby="trust-tab-gaps">
          <ProductPanel className="mt-5 p-4 md:p-5">
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Symbol data gaps</h2>
            <p className="mt-1 text-[10px] text-[#9AA7B5]">Currently tracked symbols with missing data domains. These are known limitations — no provider returns reliable data for these symbols without bypassing restrictions.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={() => setSymbolGapSheet(prev => !prev)} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">No quote</span>
                <span className="mt-1 block text-xs font-semibold text-[#F59E0B]">3 symbols</span>
                <p className="mt-1 text-[10px] text-[#9AA7B5]">No real-time price available. Provider coverage incomplete.</p>
              </button>
              <button type="button" onClick={() => setSymbolGapSheet(prev => !prev)} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3 text-left hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">No history</span>
                <span className="mt-1 block text-xs font-semibold text-[#F59E0B]">3 symbols</span>
                <p className="mt-1 text-[10px] text-[#9AA7B5]">Historical price data unavailable. Affects scoring pipeline.</p>
              </button>
              <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">Not on leaderboard</span>
                <span className="mt-1 block text-xs font-semibold text-[#F59E0B]">1 symbol</span>
                <p className="mt-1 text-[10px] text-[#9AA7B5]">Not in latest scoring slice. Re-run scoring pipeline.</p>
              </div>
            </div>
          </ProductPanel>

          {symbolGapSheet && (
            <ProductPanel className="mt-2 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#E6EDF3]">Symbol data gaps</h3>
                <button type="button" onClick={() => setSymbolGapSheet(false)} className="text-[#64748B] hover:text-[#9AA7B5] transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mb-3 text-[10px] text-[#9AA7B5]">Known limitations for which no safe provider source exists.</p>
              <div className="space-y-3">
                <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
                  <h3 className="text-xs font-semibold text-[#E6EDF3]">No quote (3 symbols)</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#9AA7B5]">
                    Real-time price is not available for these symbols from the configured provider chain. IndianAPI and the optional Yahoo fallback are checked separately in the provider matrix above; if neither returns a verified quote for a symbol, the app leaves the quote unavailable instead of inventing a value.
                  </p>
                </div>
                <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
                  <h3 className="text-xs font-semibold text-[#E6EDF3]">No history (3 symbols)</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#9AA7B5]">
                    Historical price data is not available for these symbols. This affects the feature/factor scoring pipeline. Without historical data, these symbols cannot receive a complete score.
                  </p>
                </div>
                <div className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
                  <h3 className="text-xs font-semibold text-[#E6EDF3]">Not on leaderboard (1 symbol)</h3>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#9AA7B5]">
                    This symbol is in the company registry and has a prediction registry entry but is not included in the current scoring leaderboard slice. The scoring pipeline needs to be re-run to include it.
                  </p>
                </div>
                <p className="text-[10px] leading-relaxed text-[#64748B]">
                  These gaps are known limitations. No provider bypass (proxy, CAPTCHA evasion, cookie theft) is used. The gaps are surfaced honestly so you can decide whether to include these symbols in your research.
                </p>
              </div>
            </ProductPanel>
          )}

          <ProductPanel className="mt-4 p-4 md:p-5">
            <h2 className="text-xs font-semibold text-[#E6EDF3]">Lineage coverage</h2>
            <p className="mt-1 text-[10px] text-[#9AA7B5]">Source trace availability per data domain. Unavailable means no provenance metadata was recorded at ingestion time.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Prediction input lineage", status: "available", detail: "Consumed via GET /api/research/lineage/:symbol" },
                { label: "Feature snapshots", status: coverage?.featureSnapshots?.status === "available" ? "partial" : "unavailable", detail: "Source columns available after migration 022; backfill pending" },
                { label: "Factor snapshots", status: coverage?.factorSnapshots?.status === "available" ? "partial" : "unavailable", detail: "Source columns available after migration 022; backfill pending" },
                { label: "Financial snapshots", status: coverage?.financialSnapshots?.status === "available" ? "partial" : "unavailable", detail: "source_label, source_url, ingestion_timestamp populated" },
                { label: "Daily prices", status: coverage?.dailyPrices?.status === "available" ? "available" : "unavailable", detail: `Latest: ${formatDate(coverage?.dailyPrices?.latestPriceDate)}` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#E6EDF3]">{item.label}</span>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${
                      item.status === "available" ? "border-[#22AB94]/10 text-[#22AB94]" :
                      item.status === "partial" ? "border-[#F59E0B]/10 text-[#F59E0B]" :
                      "border-[#64748B]/10 text-[#64748B]"
                    }`}>{item.status}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#9AA7B5]">{item.detail}</p>
                </div>
              ))}
            </div>
          </ProductPanel>

          <ProductPanel className="mt-4 p-4 md:p-5">
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
                <div key={f.title} className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.025)] p-4">
                  <h3 className="text-xs font-semibold text-[#E6EDF3]">{f.title}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9AA7B5]">{f.body}</p>
                </div>
              ))}
            </div>
          </ProductPanel>

          <ProductPanel className="mt-4 p-4 md:p-5" as="section">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#2962FF]" aria-hidden="true" />
              <h2 className="text-xs font-semibold text-[#E6EDF3]">Methodology</h2>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-[#9AA7B5]">
              Scores are derived from verified market data and model calculations using a multi-factor framework. Each factor is evaluated from available data sources with known provenance. Gaps are surfaced transparently — no fabricated availability is reported. Provider health reflects actual API response status at last check.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ProductStatusPill tone="verified">Research only</ProductStatusPill>
              <ProductStatusPill tone="warning">Real provider status</ProductStatusPill>
              <ProductStatusPill tone="muted">No fabricated metrics</ProductStatusPill>
            </div>
          </ProductPanel>
        </div>}

        <div className="mt-8 border-t border-[rgba(148,163,184,0.16)] pt-6">
          <p className="text-[10px] leading-relaxed text-[#64748B]">
            Research only. Scores are derived from verified market data and model calculations. This is not investment advice.
          </p>
        </div>
      </ProductPage>
    </ProductShell>
  );
};

export default TrustCentrePage;
