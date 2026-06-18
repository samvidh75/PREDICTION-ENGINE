import React, { useEffect, useState } from "react";
import { PageHeader, ResearchDisclaimer, ProviderStatusPill, DataFreshnessBadge } from "../components/ui/PageHeader";
import { LoadingState } from "../components/ui/DataState";
import { formatNumber } from "../services/ui/dataFormatting";
import { api, ApiError, type TrustMetricsEnvelope, type DataCoverage } from "../services/api/client";
import TopNav from "../components/navigation/TopNav";
import MobileNav from "../components/navigation/MobileNav";
import Button from "../components/ui/Button";
import { navigatePage } from "../components/premium/PremiumUI";

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
  NSELIB: "NSELib",
  NSEPYTHON: "NSE Python",
  FUNDAMENTALS_AUTOMATIC: "Fundamentals",
  CSV_FALLBACK: "CSV Import",
};

const SKIP_PROVIDERS = new Set(["REDIS_URL"]);

const STATUS_STYLE: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
  healthy: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Healthy" },
  degraded: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Degraded" },
  unavailable: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Unavailable" },
  local_only: { dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", label: "Local Only" },
  missing_required: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Unavailable" },
};

const LEFT_BORDER: Record<string, string> = {
  healthy: "border-l-emerald-400",
  degraded: "border-l-amber-400",
  unavailable: "border-l-red-400",
  local_only: "border-l-slate-300",
  missing_required: "border-l-red-400",
};

const DOMAIN_LABELS: Record<string, string> = {
  quote: "Quote",
  historical: "Historical",
  bhavcopy: "Bhavcopy",
  index: "Index",
  fundamentals: "Fundamentals",
  macro: "Macro",
  delivery: "Delivery",
  sector: "Sector",
  nse_lib: "NSELib",
};

function getStatusStyle(status: string) {
  return STATUS_STYLE[status] || STATUS_STYLE.unavailable;
}

function inferDomains(key: string, entry: ProviderEntry): Record<string, ProviderDomainEntry> {
  if (entry.domains && Object.keys(entry.domains).length > 0) return entry.domains;
  switch (key) {
    case "INDIANAPI_KEY": {
      const h = entry.status === "healthy";
      return {
        quote: { healthy: h, provider: key, detail: h ? "Available" : "Not configured" },
        fundamentals: { healthy: h, provider: key, detail: h ? "Available" : "Not configured" },
        macro: { healthy: h, provider: key, detail: h ? "Available" : "Not configured" },
      };
    }
    case "FUNDAMENTALS_AUTOMATIC": {
      const h = entry.status === "healthy";
      return { fundamentals: { healthy: h, provider: key, detail: h ? "Available" : "Not configured" } };
    }
    case "CSV_FALLBACK":
      return { bhavcopy: { healthy: false, provider: key, detail: "Local/dev only" } };
    case "NSELIB":
      return { nse_lib: { healthy: false, provider: key, detail: entry.message } };
    default:
      return {};
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "---";
  return value.toLocaleString("en-IN");
}

function formatMetric(value: number | null | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "---";
  return `${value.toFixed(2)}${suffix}`;
}

function formatOrdinal(value: number): string {
  if (value <= 0) return "N/A";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString("en-IN");
}

export const TrustCentrePage: React.FC = () => {
  const [envelope, setEnvelope] = useState<TrustMetricsEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverageData, setCoverageData] = useState<DataCoverage | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();

    api.getTrustMetrics()
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setEnvelope(data);
        setLoading(false);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Trust metrics are temporarily unavailable.");
        setLoading(false);
      });

    api.getDataCoverage()
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setCoverageData(data);
        setCoverageLoading(false);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setCoverageLoading(false);
      });

    return () => ctrl.abort();
  }, []);

  if (loading) {
    return (
      <div className="p-10">
        <TopNav /><MobileNav />
        <LoadingState description="Loading methodology and trust metrics..." />
      </div>
    );
  }

  const metrics = envelope?.data;
  const rawState = error ? "error" : envelope?.status ?? "unavailable";
  const asOf = envelope?.dataState?.asOf || coverageData?.generatedAt || null;
  const missingInputs = envelope?.dataState?.missingInputs || [];
  const completenessScore = envelope?.dataState?.completenessScore;

  const stateLabel: Record<string, string> = {
    ok: "All metrics available",
    partial: "Partial — some data sources not yet connected",
    unavailable: "Unavailable — verified scoring data pending",
    empty: "No data — scoring registry is empty",
    error: "Temporarily unavailable",
    demo: "Demo mode",
  };
  const humanState = stateLabel[rawState] ?? rawState;

  const providersRaw = coverageData?.providers as Record<string, ProviderEntry> | undefined;
  const providerEntries = providersRaw
    ? Object.entries(providersRaw).filter(([key]) => !SKIP_PROVIDERS.has(key))
    : [];

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
    <main className="min-h-screen antialiased" style={{ background: "#f7f8fb", color: "#0f1419", fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopNav /><MobileNav />
      <div className="mx-auto max-w-5xl space-y-8 p-4 pt-[76px] md:pt-28">

        <PageHeader
          title="Trust Centre"
          subtitle="Methodology, provider health, data coverage, pipeline freshness, and verified performance metrics."
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => navigatePage("rankings")} className="h-10 px-4 text-xs">View rankings</Button>
          <Button type="button" onClick={() => navigatePage("about")} variant="secondary" className="h-10 px-4 text-xs">Read mission</Button>
        </div>

        {rawState !== "ok" && (
          <div
            className="rounded-xl p-4 text-sm"
            role="status"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#b8860b" }}
          >
            <p className="font-semibold text-xs">{humanState}</p>
            <p className="mt-1">{error || envelope?.message || "Some metrics are unavailable because required data sources are not connected."}</p>
            {missingInputs.length > 0 && (
              <p className="text-xs mt-2">Some fields require additional verified data updates.</p>
            )}
          </div>
        )}

        <section className="space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Performance audit</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Alpha", value: formatMetric(metrics?.alpha) },
              { label: "Hit Rate", value: formatMetric(metrics?.hit_rate, "%") },
              { label: "Sharpe", value: formatMetric(metrics?.sharpe_ratio) },
              { label: "Calibration", value: formatMetric(metrics?.calibration_score, "%") },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl p-5 text-center"
                style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
              >
                <span className="text-[11px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#536471" }}>{m.label}</span>
                <span className="text-xl font-semibold tabular-nums" style={{ color: "#0f1419" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#536471" }}>Total predictions generated</span>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "#0f1419" }}>{formatOrdinal(metrics?.total_predictions ?? 0)}</span>
          </div>
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#536471" }}>Total outcomes tracked</span>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "#0f1419" }}>{formatOrdinal(metrics?.total_outcomes ?? 0)}</span>
          </div>
        </section>

        {/* Scored Symbols Coverage */}
        <section>
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#536471" }}>Scored symbols coverage</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums" style={{ color: "#0f1419" }}>
                {formatCount(coverage?.predictionRegistry?.symbolCount)}
              </span>
              <span className="text-sm" style={{ color: "#536471" }}>symbols scored</span>
            </div>
            {coverage?.predictionRegistry?.latestPredictionDate && (
              <p className="mt-1 text-[11px]" style={{ color: "#536471" }}>
                Latest: {formatDate(coverage.predictionRegistry.latestPredictionDate)}
              </p>
            )}
          </div>
        </section>

        {/* Provider Domain Health Cards */}
        {providerEntries.length > 0 && (
          <section className="space-y-5">
            <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Provider domain health</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {providerEntries.map(([key, entry]) => {
                const domains = inferDomains(key, entry);
                const s = getStatusStyle(entry.status);
                const border = LEFT_BORDER[entry.status] || "border-l-slate-300";
                return (
                  <div
                    key={key}
                    className={`rounded-xl p-5 border-l-4 ${border}`}
                    style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", borderWidth: "1px 1px 1px 0", borderStyle: "solid", borderColor: "rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold" style={{ color: "#0f1419" }}>
                        {PROVIDER_LABELS[key] || key.replace(/_/g, " ")}
                      </h3>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${s.bg} ${s.text} border ${s.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </div>
                    {Object.keys(domains).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(domains).map(([domain, info]) => {
                          const dh = info.healthy;
                          const pillBg = dh ? "bg-emerald-50" : entry.status === "local_only" ? "bg-slate-50" : "bg-red-50";
                          const pillText = dh ? "text-emerald-700" : entry.status === "local_only" ? "text-slate-500" : "text-red-700";
                          const pillBorder = dh ? "border-emerald-200" : entry.status === "local_only" ? "border-slate-200" : "border-red-200";
                          const pillDot = dh ? "bg-emerald-500" : entry.status === "local_only" ? "bg-slate-400" : "bg-red-500";
                          return (
                            <span
                              key={domain}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium border ${pillBg} ${pillText} ${pillBorder}`}
                              title={info.detail}
                            >
                              <span className={`w-1 h-1 rounded-full ${pillDot}`} />
                              {DOMAIN_LABELS[domain] || domain}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {entry.message && (
                      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "#536471" }}>
                        {entry.message}
                      </p>
                    )}
                    <div className="mt-3 text-[10px]" style={{ color: "#8899a6" }}>
                      As of {formatDate(generatedAt || null)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Data Coverage Summary Table */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Data coverage summary</h2>
          {coverageLoading ? (
            <div className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <p className="text-sm" style={{ color: "#536471" }}>Loading coverage data...</p>
            </div>
          ) : coverage ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#536471" }}>Table</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#536471" }}>Rows</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#536471" }}>Symbols</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#536471" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageTables.map((row, i) => {
                    const stats = coverage[row.key];
                    const avail = stats?.status === "available";
                    return (
                      <tr key={row.key} className="border-t border-white/20">
                        <td className="px-5 py-3 font-medium" style={{ color: "#0f1419" }}>{row.label}</td>
                        <td className="px-5 py-3 text-right tabular-nums" style={{ color: "#536471" }}>
                          {formatCount(stats?.rowCount ?? stats?.count ?? null)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums" style={{ color: "#536471" }}>
                          {formatCount(stats?.symbolCount ?? null)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            avail
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-50 text-slate-400"
                          }`}>
                            {avail ? "Available" : "Unavailable"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {generatedAt && (
                <div className="px-5 py-3 border-t border-white/20">
                  <DataFreshnessBadge date={generatedAt} />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-6" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <p className="text-sm" style={{ color: "#536471" }}>Coverage data is temporarily unavailable.</p>
            </div>
          )}
        </section>

        {/* Freshness Dashboard */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Freshness dashboard</h2>
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            {coverage ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {freshnessItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}
                  >
                    <span className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#536471" }}>{item.label}</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: "#0f1419" }}>{formatDate(item.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#536471" }}>Freshness data is temporarily unavailable.</p>
            )}
            {generatedAt && (
              <div className="mt-4">
                <DataFreshnessBadge date={generatedAt} />
              </div>
            )}
          </div>
        </section>

        {/* Data status */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Data status</h2>
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Scoring database", value: rawState === "ok" || rawState === "partial" ? "Connected" : "Pending" },
                { label: "As of date", value: asOf !== "N/A" ? asOf : "Pending" },
                { label: "Evidence completeness", value: completenessScore ? `${completenessScore}% verified` : "Pending" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#536471" }}>{item.label}</span>
                  <span className="text-sm font-semibold" style={{ color: "#0f1419" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scoring factors */}
        <section className="space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Scoring factors</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Growth", body: "Measures revenue, EPS, profit, and free cash flow trajectory when data is available." },
              { title: "Quality", body: "Evaluates capital returns (ROE, ROIC), profit margins, and operational asset efficiency." },
              { title: "Valuation", body: "Reviews relative pricing multiples and cash yields against industry peers." },
              { title: "Stability & risk", body: "Monitors leverage, cash buffer, accounting flags, and price volatility." },
              { title: "Momentum", body: "Reviews trend strength and relative market signals." },
              { title: "Confidence", body: "Separates score visibility from data completeness, freshness, and consistency." },
            ].map(f => (
              <div
                key={f.title}
                className="rounded-xl p-6"
                style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
              >
                <h3 className="font-semibold text-sm" style={{ color: "#0f1419" }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "#536471" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}>
          <ResearchDisclaimer />
        </section>

      </div>
    </main>
  );
};

export default TrustCentrePage;
