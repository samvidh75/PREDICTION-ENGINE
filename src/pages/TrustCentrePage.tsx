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
    <main className="min-h-screen antialiased" style={{ background: "#f7f8fb", color: "#0f1419", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="mx-auto max-w-4xl space-y-8 p-4 pt-[76px] md:pt-28">

        <PageHeader
          title="Research Methodology & Trust Centre"
          subtitle="Scoring inputs, availability labels, and verified performance metrics."
        />

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
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "#0f1419" }}>{formatCount(metrics?.total_predictions)}</span>
          </div>
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <span className="text-[11px] uppercase tracking-wider font-semibold block mb-1" style={{ color: "#536471" }}>Total outcomes tracked</span>
            <span className="text-2xl font-semibold tabular-nums" style={{ color: "#0f1419" }}>{formatCount(metrics?.total_outcomes)}</span>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Data coverage summary</h2>
          {coverageLoading ? (
            <div
              className="rounded-xl p-6"
              style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)" }}
            >
              <p className="text-sm" style={{ color: "#536471" }}>Loading coverage data...</p>
            </div>
          ) : coverageData?.coverage ? (
            <div
              className="rounded-xl p-6"
              style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Companies covered", value: coverageData.coverage.symbols?.status === "available" ? formatNumber(coverageData.coverage.symbols?.count ?? 0) : "Unavailable" },
                  { label: "Price rows", value: coverageData.coverage.dailyPrices?.status === "available" ? formatNumber(coverageData.coverage.dailyPrices?.rowCount ?? 0) : "Unavailable" },
                  { label: "Financial records", value: coverageData.coverage.financialSnapshots?.status === "available" ? formatNumber(coverageData.coverage.financialSnapshots?.rowCount ?? 0) : "Unavailable" },
                  { label: "Scored records", value: coverageData.coverage.predictionRegistry?.status === "available" ? formatNumber(coverageData.coverage.predictionRegistry?.rowCount ?? 0) : "Unavailable" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                    <span className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#536471" }}>{item.label}</span>
                    <span className="block text-sm font-semibold tabular-nums" style={{ color: "#0f1419" }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <DataFreshnessBadge date={coverageData.generatedAt ?? null} />
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-6"
              style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)" }}
            >
              <p className="text-sm" style={{ color: "#536471" }}>Coverage data is temporarily unavailable.</p>
            </div>
          )}
        </section>

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

        <section className="space-y-5">
          <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Data status</h2>
          <div
            className="rounded-xl p-6"
            style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Scoring database", value: rawState === "ok" || rawState === "partial" ? "Connected" : "Pending" },
                { label: "As of date", value: asOf !== "Data unavailable" ? asOf : "Pending" },
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

        {coverageData?.providers && Object.keys(coverageData.providers).length > 0 && (
          <section className="space-y-5">
            <h2 className="text-lg font-semibold" style={{ color: "#0f1419" }}>Provider status</h2>
            <div
              className="rounded-xl p-6"
              style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.8)" }}
            >
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)" }}>
                {Object.entries(coverageData.providers).map(([key, val]) => (
                  <ProviderStatusPill key={key} name={key} status={val} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.3)" }}>
          <ResearchDisclaimer />
        </section>
      </div>
    </main>
  );
};

export default TrustCentrePage;
