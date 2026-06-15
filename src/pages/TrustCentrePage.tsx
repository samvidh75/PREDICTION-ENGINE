import React, { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import ScorePill from "../components/ui/ScorePill";

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
      <div className="p-16 text-center text-slate-400">
        <div className="inline-block w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full animate-spin" />
        <p className="mt-6 font-semibold uppercase text-xs tracking-wider">Loading Trust & Methodology Data...</p>
      </div>
    );
  }

  const metrics = envelope?.data;
  const state = error ? "error" : envelope?.status ?? "unavailable";
  const asOf = envelope?.dataState?.asOf || "Data unavailable";
  const missingInputs = envelope?.dataState?.missingInputs || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 text-slate-200">
      <header className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          Methodology & Trust Centre
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Auditable performance metrics and scoring explanations for StockStory India.
        </p>
      </header>

      {state !== "ok" && (
        <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl text-amber-200 text-sm" role="status">
          <p className="font-semibold uppercase tracking-wider text-xs">Trust metrics status: {state}</p>
          <p className="mt-1">{error || envelope?.message || "Some trust metrics are unavailable because required evidence sources are not connected."}</p>
          {missingInputs.length > 0 && (
            <p className="text-xs mt-2 text-amber-400">Missing inputs: {missingInputs.join(", ")}</p>
          )}
        </div>
      )}

      {/* Performance Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Performance Audit</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Alpha</span>
            <span className="text-xl font-bold text-white">{formatMetric(metrics?.alpha)}</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Hit Rate</span>
            <span className="text-xl font-bold text-white">{formatMetric(metrics?.hit_rate, "%")}</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Sharpe</span>
            <span className="text-xl font-bold text-white">{formatMetric(metrics?.sharpe_ratio)}</span>
          </Card>
          <Card className="p-4 text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Calibration</span>
            <span className="text-xl font-bold text-white">{formatMetric(metrics?.calibration_score, "%")}</span>
          </Card>
        </div>
      </section>

      {/* Scale */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Total Predictions Generated</span>
          <span className="text-2xl font-bold text-white">{formatCount(metrics?.total_predictions)}</span>
        </Card>
        <Card className="p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Total Outcomes Tracked</span>
          <span className="text-2xl font-bold text-white">{formatCount(metrics?.total_outcomes)}</span>
        </Card>
      </section>

      {/* Scoring Engines Explanation */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Scoring Engines</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-semibold text-white text-sm">Growth Engine</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Measures historical revenue, EPS, profit, and Free Cash Flow (FCF) trajectory over multiple quarters and fiscal years.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-white text-sm">Quality Engine</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Evaluates capital returns (ROE, ROIC), profit margins, and operational asset efficiency.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-white text-sm">Valuation Engine</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Inspects relative multiple pricing (P/E, P/B, EV/EBITDA) and cash yields vs industry peers.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-white text-sm">Stability & Risk Engine</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Monitors debt stress, leverage ratios, cash buffer, accounting flags, and historical price volatility.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-white text-sm">Momentum Engine</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Analyzes price trend strength, moving average alignments, and relative market strength signals.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-white text-sm">Confidence Rating</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Calculates prediction validity based on data completeness, source freshness, and signal consistency.
            </p>
          </Card>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-slate-800 pt-6">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-xs text-slate-400 leading-relaxed">
          <p className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">Disclaimer</p>
          This is research software, not financial advice. All information is provided for educational and analytical purposes only. StockStory India does not provide investment recommendations, tax advice, or asset allocations. Please consult with a qualified financial advisor before making any investment decisions.
        </div>
      </section>
    </div>
  );
};

export default TrustCentrePage;
