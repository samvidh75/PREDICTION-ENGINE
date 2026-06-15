import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import { LoadingState } from "../components/ui/DataState";
import { PageHeader, ResearchDisclaimer } from "../components/ui/PageHeader";

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

function formatMetric(value: number | null | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Data unavailable";
  return `${value.toFixed(2)}${suffix}`;
}

function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Data unavailable";
  return value.toLocaleString("en-IN");
}

export const TrustCentrePage: React.FC = () => {
  const [envelope, setEnvelope] = useState<TrustEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="p-16">
        <LoadingState description="Loading trust and methodology data from the intelligence API." />
      </div>
    );
  }

  const metrics = envelope?.data;
  const state = error ? "error" : envelope?.status ?? "unavailable";
  const asOf = envelope?.dataState?.asOf || "Data unavailable";
  const missingInputs = envelope?.dataState?.missingInputs || [];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 text-slate-900">
      <PageHeader
        title="Methodology & Trust Centre"
        subtitle="Auditable performance metrics and scoring explanations for StockStory India."
      />

      {state !== "ok" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="status">
          <p className="font-semibold uppercase tracking-wider text-xs">Trust metrics status: {state}</p>
          <p className="mt-1">{error || envelope?.message || "Some trust metrics are unavailable because required evidence sources are not connected."}</p>
          {missingInputs.length > 0 && (
            <p className="text-xs mt-2 text-amber-700">Missing inputs: {missingInputs.join(", ")}</p>
          )}
        </div>
      )}

      {/* Performance Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Performance audit</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Scale */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Total predictions generated</span>
          <span className="text-2xl font-semibold text-slate-950">{formatCount(metrics?.total_predictions)}</span>
        </Card>
        <Card className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">Total outcomes tracked</span>
          <span className="text-2xl font-semibold text-slate-950">{formatCount(metrics?.total_outcomes)}</span>
        </Card>
      </section>

      {/* Scoring Engines Explanation */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Scoring engines</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Growth engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Measures historical revenue, EPS, profit, and Free Cash Flow (FCF) trajectory over multiple quarters and fiscal years.
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
              Inspects relative multiple pricing (P/E, P/B, EV/EBITDA) and cash yields vs industry peers.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Stability and risk engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Monitors debt stress, leverage ratios, cash buffer, accounting flags, and historical price volatility.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Momentum engine</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Analyzes price trend strength, moving average alignments, and relative market strength signals.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-slate-950 text-sm">Confidence rating</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Calculates prediction validity based on data completeness, source freshness, and signal consistency.
            </p>
          </Card>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-slate-200 pt-6">
        <ResearchDisclaimer />
      </section>
    </div>
  );
};

export default TrustCentrePage;
