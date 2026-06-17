import React, { useEffect, useState } from "react";
import { PageHeader, ResearchDisclaimer, ProviderStatusPill, DataFreshnessBadge } from "../components/ui/PageHeader";
import { LoadingState } from "../components/ui/DataState";
import { formatNumber } from "../services/ui/dataFormatting";
import { api, ApiError, type TrustMetricsEnvelope, type DataCoverage } from "../services/api/client";

function formatMetric(value: number | null | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Data unavailable";
  return `${value.toFixed(2)}${suffix}`;
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Data unavailable";
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
        <LoadingState description="Loading methodology and trust metrics..." />
      </div>
    );
  }

  const metrics = envelope?.data;
  const rawState = error ? "error" : envelope?.status ?? "unavailable";
  const asOf = envelope?.dataState?.asOf || coverageData?.generatedAt || "Data unavailable";
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

  return (
    <main className="min-h-screen"><div className="mx-auto max-w-4xl space-y-8 p-4 pt-[76px] md:pt-28 text-slate-900">
      <PageHeader
        title="Research Methodology & Trust Centre"
        subtitle="Scoring inputs, availability labels, and verified performance metrics."
      />

      {rawState !== "ok" && (
        <div className="rounded-xl bg-amber-50/60 backdrop-blur-sm border border-amber-200/50 p-4 text-sm text-amber-800" role="status">
          <p className="font-semibold text-xs">{humanState}</p>
          <p className="mt-1">{error || envelope?.message || "Some metrics are unavailable because required data sources are not connected."}</p>
          {missingInputs.length > 0 && (
            <p className="text-xs mt-2 text-amber-700">Some fields require additional verified data updates.</p>
          )}
        </div>
      )}

      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Performance audit</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-5 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Alpha</span>
            <span className="text-xl font-semibold text-slate-900 tabular-nums">{formatMetric(metrics?.alpha)}</span>
          </div>
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-5 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Hit Rate</span>
            <span className="text-xl font-semibold text-slate-900 tabular-nums">{formatMetric(metrics?.hit_rate, "%")}</span>
          </div>
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-5 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Sharpe</span>
            <span className="text-xl font-semibold text-slate-900 tabular-nums">{formatMetric(metrics?.sharpe_ratio)}</span>
          </div>
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-5 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Calibration</span>
            <span className="text-xl font-semibold text-slate-900 tabular-nums">{formatMetric(metrics?.calibration_score, "%")}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Total predictions generated</span>
          <span className="text-2xl font-semibold text-slate-900">{formatCount(metrics?.total_predictions)}</span>
        </div>
        <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Total outcomes tracked</span>
          <span className="text-2xl font-semibold text-slate-900">{formatCount(metrics?.total_outcomes)}</span>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Data coverage summary</h2>
        {coverageLoading ? (
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
            <p className="text-sm text-slate-500">Loading coverage data...</p>
          </div>
        ) : coverageData?.coverage ? (
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Companies covered</span>
                <span className="block text-sm font-semibold text-slate-900 tabular-nums">
                  {coverageData.coverage.symbols?.status === "available"
                    ? formatNumber(coverageData.coverage.symbols?.count ?? 0)
                    : "Unavailable"}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Price rows</span>
                <span className="block text-sm font-semibold text-slate-900 tabular-nums">
                  {coverageData.coverage.dailyPrices?.status === "available"
                    ? formatNumber(coverageData.coverage.dailyPrices?.rowCount ?? 0)
                    : "Unavailable"}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Financial records</span>
                <span className="block text-sm font-semibold text-slate-900 tabular-nums">
                  {coverageData.coverage.financialSnapshots?.status === "available"
                    ? formatNumber(coverageData.coverage.financialSnapshots?.rowCount ?? 0)
                    : "Unavailable"}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Scored records</span>
                <span className="block text-sm font-semibold text-slate-900 tabular-nums">
                  {coverageData.coverage.predictionRegistry?.status === "available"
                    ? formatNumber(coverageData.coverage.predictionRegistry?.rowCount ?? 0)
                    : "Unavailable"}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <DataFreshnessBadge date={coverageData.generatedAt ?? null} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
            <p className="text-sm text-slate-500">Coverage data is temporarily unavailable.</p>
          </div>
        )}
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Scoring factors</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: "Growth", body: "Measures revenue, EPS, profit, and free cash flow trajectory when data is available." },
            { title: "Quality", body: "Evaluates capital returns (ROE, ROIC), profit margins, and operational asset efficiency." },
            { title: "Valuation", body: "Reviews relative pricing multiples and cash yields against industry peers." },
            { title: "Stability & risk", body: "Monitors leverage, cash buffer, accounting flags, and price volatility." },
            { title: "Momentum", body: "Reviews trend strength and relative market signals." },
            { title: "Confidence", body: "Separates score visibility from data completeness, freshness, and consistency." },
          ].map(f => (
            <div key={f.title} className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
              <h3 className="font-semibold text-slate-900 text-sm">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Data status</h2>
        <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Scoring database</span>
              <span className="text-sm font-semibold text-slate-900">
                {rawState === "ok" || rawState === "partial" ? "Connected" : "Pending"}
              </span>
            </div>
            <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">As of date</span>
              <span className="text-sm font-semibold text-slate-900">
                <DataFreshnessBadge date={asOf !== "Data unavailable" ? asOf : null} />
              </span>
            </div>
            <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Evidence completeness</span>
              <span className="text-sm font-semibold text-slate-900">
                {completenessScore ? `${completenessScore}% verified` : "Pending"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {coverageData?.providers && Object.keys(coverageData.providers).length > 0 && (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Provider status</h2>
          <div className="rounded-xl bg-white/70 backdrop-blur-glass border border-white/50 shadow-glass p-6">
            <div className="rounded-xl bg-slate-50/60 backdrop-blur-sm border border-slate-200/30 overflow-hidden">
              {Object.entries(coverageData.providers).map(([key, val]) => (
                <ProviderStatusPill key={key} name={key} status={val} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-white/30 pt-6">
        <ResearchDisclaimer />
      </section>
    </div></main>
  );
};

export default TrustCentrePage;
