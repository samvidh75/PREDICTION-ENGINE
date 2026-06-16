import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { LoadingState } from "../components/ui/DataState";
import { PageHeader, ResearchDisclaimer, ProviderStatusPill } from "../components/ui/PageHeader";
import { formatNumber } from "../services/ui/dataFormatting";

interface TrustMetrics {
  alpha: number | null;
  hit_rate: number | null;
  sharpe_ratio: number | null;
  calibration_score: number | null;
  total_predictions: number | null;
  total_outcomes: number | null;
}

interface TrustEnvelope {
  status: "ok" | "partial" | "unavailable" | "empty" | "error" | "demo";
  message: string | null;
  data: TrustMetrics | null;
  dataState?: {
    availability?: string;
    asOf?: string | null;
    missingInputs?: string[];
    completenessScore?: number;
  };
}

interface CoverageStats {
  count: number;
  status: string;
  latestUpdatedAt?: string | null;
  latestPriceDate?: string | null;
  latestSnapshotDate?: string | null;
  latestPredictionDate?: string | null;
  rowCount?: number;
}

interface CoverageData {
  ok: boolean;
  generatedAt: string;
  database: { status: string; migrationsReady: boolean };
  coverage: {
    symbols: CoverageStats;
    dailyPrices: CoverageStats;
    financialSnapshots: CoverageStats;
    predictionRegistry: CoverageStats;
  };
  providers: Record<string, string>;
}

function formatMetric(value: number | null | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Data unavailable";
  return `${value.toFixed(2)}${suffix}`;
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Data unavailable";
  return value.toLocaleString("en-IN");
}

function coverageStatusLabel(status: string): string {
  if (status === "available") return "Available";
  return "Unavailable";
}

export const TrustCentrePage: React.FC = () => {
  const [envelope, setEnvelope] = useState<TrustEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [coverageLoading, setCoverageLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/intelligence/trust-metrics", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.message || body?.reason || "TRUST_METRICS_UNAVAILABLE");
        return body as TrustEnvelope;
      })
      .then((data) => {
        setEnvelope(data);
        setLoading(false);
      })
      .catch((fetchError: Error) => {
        if (controller.signal.aborted) return;
        setError(fetchError.message || "Trust metrics are temporarily unavailable.");
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    fetch("/api/ops/data-coverage")
      .then(res => res.json())
      .then((data) => {
        if (data.ok) {
          setCoverageData(data);
        }
        setCoverageLoading(false);
      })
      .catch(() => setCoverageLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-10">
        <LoadingState description="Loading methodology and trust metrics." />
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
    partial: "Partial — some evidence sources are not yet connected",
    unavailable: "Unavailable — verified scoring data is not ready yet",
    empty: "No data — scoring registry is empty",
    error: "Temporarily unavailable",
    demo: "Demo mode",
  };
  const humanState = stateLabel[rawState] ?? rawState;

  return (
    <div className="mx-auto max-w-4xl space-y-7 p-4 text-slate-900">
      <PageHeader
        title="Methodology & Trust Centre"
        subtitle="Scoring inputs, availability labels, and performance metrics when evidence is available."
      />

      {rawState !== "ok" && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800" role="status">
          <p className="font-semibold text-xs">{humanState}</p>
          <p className="mt-1">{error || envelope?.message || "Some trust metrics are unavailable because required evidence sources are not connected."}</p>
          {missingInputs.length > 0 && (
            <p className="text-xs mt-2 text-amber-700">Some performance fields require additional verified data updates before they are available.</p>
          )}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Performance audit</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Alpha</span>
            <span className="text-xl font-semibold text-slate-950">{formatMetric(metrics?.alpha)}</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Hit Rate</span>
            <span className="text-xl font-semibold text-slate-950">{formatMetric(metrics?.hit_rate, "%")}</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Sharpe</span>
            <span className="text-xl font-semibold text-slate-950">{formatMetric(metrics?.sharpe_ratio)}</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Calibration</span>
            <span className="text-xl font-semibold text-slate-950">{formatMetric(metrics?.calibration_score, "%")}</span>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Total predictions generated</span>
          <span className="text-2xl font-semibold text-slate-950">{formatCount(metrics?.total_predictions)}</span>
        </Card>
        <Card className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Total outcomes tracked</span>
          <span className="text-2xl font-semibold text-slate-950">{formatCount(metrics?.total_outcomes)}</span>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Data coverage summary</h2>
        {coverageLoading ? (
          <Card className="p-5">
            <p className="text-xs text-slate-500">Loading coverage data...</p>
          </Card>
        ) : coverageData ? (
          <Card className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Indexed symbols</span>
                <span className="block text-sm font-semibold text-slate-950">
                  {coverageData.coverage.symbols.status === "available"
                    ? formatNumber(coverageData.coverage.symbols.count)
                    : "Unavailable"}
                </span>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Price rows</span>
                <span className="block text-sm font-semibold text-slate-950">
                  {coverageData.coverage.dailyPrices.status === "available"
                    ? formatNumber(coverageData.coverage.dailyPrices.rowCount ?? 0)
                    : "Unavailable"}
                </span>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Financial snapshots</span>
                <span className="block text-sm font-semibold text-slate-950">
                  {coverageData.coverage.financialSnapshots.status === "available"
                    ? formatNumber(coverageData.coverage.financialSnapshots.rowCount ?? 0)
                    : "Unavailable"}
                </span>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Prediction rows</span>
                <span className="block text-sm font-semibold text-slate-950">
                  {coverageData.coverage.predictionRegistry.status === "available"
                    ? formatNumber(coverageData.coverage.predictionRegistry.rowCount ?? 0)
                    : "Unavailable"}
                </span>
              </div>
            </div>
            <div className="mt-3 text-[9px] text-slate-400">
              As of {coverageData.generatedAt ? new Date(coverageData.generatedAt).toISOString().split("T")[0] : "N/A"}
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <p className="text-xs text-slate-500">Coverage data is temporarily unavailable.</p>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Scoring engines</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Growth engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Measures revenue, EPS, profit, and free cash flow trajectory when data is available.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Quality engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Evaluates capital returns (ROE, ROIC), profit margins, and operational asset efficiency.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Valuation engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Reviews relative pricing multiples and cash yields against industry peers.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Stability and risk engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Monitors leverage, cash buffer, accounting flags, and price volatility.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Momentum engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Reviews trend strength and relative market signals.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Confidence rating</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Separates score visibility from data completeness, freshness, and consistency.
            </p>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Data system status</h2>
        <Card className="p-5">
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            StockStory India runs automated queries across live registry components to ensure database updates match production specifications. Below is the active data readiness.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Scoring Database</span>
              <span className="text-xs font-semibold text-slate-900">
                {rawState === "ok" || rawState === "partial" ? "Connected (Live)" : "Ready (Syncing)"}
              </span>
            </div>
            <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">As of Date</span>
              <span className="text-xs font-semibold text-slate-900">{asOf}</span>
            </div>
            <div className="rounded border border-slate-100 bg-slate-50/50 p-3">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Evidence Completeness</span>
              <span className="text-xs font-semibold text-slate-900">
                {completenessScore ? `${completenessScore}% Verified` : "Pending audit"}
              </span>
            </div>
          </div>
        </Card>
      </section>

      {coverageData && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Provider readiness</h2>
          <Card className="p-5">
            <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50">
              {Object.entries(coverageData.providers).map(([key, val]) => (
                <ProviderStatusPill key={key} name={key} status={val} />
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className="border-t border-slate-200 pt-6">
        <ResearchDisclaimer />
      </section>
    </div>
  );
};

export default TrustCentrePage;
