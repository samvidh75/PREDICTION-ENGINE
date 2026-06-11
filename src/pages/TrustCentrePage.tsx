/**
 * Public Trust Centre.
 * F0A invariant: never fabricate financial performance or scale metrics.
 */
import React, { useEffect, useState } from "react";

type TrustUiState = "loading" | "available" | "partially available" | "unavailable" | "error";

interface TrustMetrics {
  alpha?: number | null;
  hit_rate?: number | null;
  sharpe_ratio?: number | null;
  calibration_score?: number | null;
  total_predictions?: number | null;
  total_outcomes?: number | null;
}

interface TrustLineageEntry {
  sourceTable?: string | null;
  sourceField?: string | null;
  asOf?: string | null;
  isFallback?: boolean;
  isSynthetic?: boolean;
}

interface TrustMetricsEnvelope {
  status?: "ok" | "partial" | "unavailable" | "empty" | "error" | "demo";
  data?: TrustMetrics | null;
  dataState?: {
    availability?: "available" | "partial" | "unavailable" | "demo";
    asOf?: string | null;
    missingInputs?: string[];
    lineage?: TrustLineageEntry[];
  };
  asOf?: string | null;
  lineage?: TrustLineageEntry[];
  missingInputs?: string[];
  isSynthetic?: boolean;
  isFallback?: boolean;
  message?: string | null;
}

const DATA_UNAVAILABLE = "Data unavailable";

function deriveUiState(envelope: TrustMetricsEnvelope | null, failed: boolean): TrustUiState {
  if (failed || envelope?.status === "error") return "error";
  if (envelope?.status === "unavailable" || envelope?.dataState?.availability === "unavailable") return "unavailable";
  if (envelope?.status === "partial" || envelope?.dataState?.availability === "partial") return "partially available";
  if (envelope?.status === "ok" && envelope?.dataState?.availability === "available") return "available";
  return "unavailable";
}

function hasEvidence(envelope: TrustMetricsEnvelope | null): boolean {
  if (!envelope || envelope.isSynthetic || envelope.isFallback) return false;
  const lineage = envelope.lineage ?? envelope.dataState?.lineage ?? [];
  return lineage.some(entry => entry?.sourceTable === "prediction_registry" && !entry.isFallback && !entry.isSynthetic);
}

function formatMetric(value: number | null | undefined, suffix = "", digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  return value.toLocaleString();
}

function formatAsOf(value: string | null | undefined): string {
  if (!value) return DATA_UNAVAILABLE;
  return value.split("T")[0] || DATA_UNAVAILABLE;
}

function MetricCard({ label, value, description = "" }: { label: string; value: string; description?: string }) {
  const unavailable = value === DATA_UNAVAILABLE;
  return (
    <div className="border-4 border-black bg-white p-4 text-center" style={{ boxShadow: "4px 4px 0px #000" }}>
      <p className="text-xs font-bold uppercase text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl md:text-3xl font-extrabold ${unavailable ? "text-gray-500" : "text-black"}`}>
        {value}
      </p>
      {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-4 border-black bg-white p-5" style={{ boxShadow: "6px 6px 0px #000" }}>
      <h3 className="font-extrabold text-lg uppercase border-b-4 border-black pb-2 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function TrustCentrePage() {
  const [envelope, setEnvelope] = useState<TrustMetricsEnvelope | null>(null);
  const [uiState, setUiState] = useState<TrustUiState>("loading");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/intelligence/trust-metrics")
      .then(async response => {
        if (!response.ok) throw new Error(`Trust metrics request failed: ${response.status}`);
        return response.json() as Promise<TrustMetricsEnvelope>;
      })
      .then(data => {
        if (cancelled) return;
        setEnvelope(data);
        setUiState(deriveUiState(data, false));
      })
      .catch(() => {
        if (cancelled) return;
        setEnvelope(null);
        setUiState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (uiState === "loading") {
    return (
      <div className="p-16 text-center" role="status" aria-live="polite">
        <div className="inline-block w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="mt-6 font-extrabold text-xl uppercase">Loading trust metrics...</p>
      </div>
    );
  }

  const metrics = envelope?.data ?? {};
  const asOf = envelope?.asOf ?? envelope?.dataState?.asOf ?? null;
  const missingInputs = envelope?.missingInputs ?? envelope?.dataState?.missingInputs ?? [];
  const evidenceAvailable = hasEvidence(envelope);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <div className="border-4 border-black bg-gray-900 p-8 text-center text-white" style={{ boxShadow: "8px 8px 0px #000" }}>
        <h1 className="font-extrabold text-4xl uppercase tracking-widest mb-4">Trust Centre</h1>
        <p className="text-2xl font-extrabold text-yellow-400 mb-2">DON'T TRUST US. VERIFY US.</p>
        <p className="text-gray-300 text-sm max-w-lg mx-auto">
          {evidenceAvailable
            ? "Validated prediction outcomes are shown with source lineage and missing-input disclosure."
            : "Performance evidence is not available right now, so financial metrics are withheld."}
        </p>
      </div>

      <div className="border-4 border-black bg-yellow-50 p-4" style={{ boxShadow: "4px 4px 0px #000" }}>
        <p className="font-extrabold uppercase">Data state: {uiState}</p>
        <p className="text-sm font-bold text-gray-700 mt-1">As of: {formatAsOf(asOf)}</p>
        {missingInputs.length > 0 && (
          <p className="text-sm text-gray-700 mt-1">Missing inputs: {missingInputs.join(", ")}</p>
        )}
      </div>

      <div>
        <h2 className="font-extrabold text-2xl uppercase mb-4">Performance at a Glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Alpha" value={formatMetric(metrics.alpha, "%")} description="Excess return vs benchmark" />
          <MetricCard label="Hit Rate" value={formatMetric(metrics.hit_rate, "%")} description="Positive-alpha outcomes" />
          <MetricCard label="Sharpe" value={formatMetric(metrics.sharpe_ratio)} description="Risk-adjusted return" />
          <MetricCard label="Calibration" value={formatMetric(metrics.calibration_score, "%")} description="Score-to-outcome alignment" />
        </div>
      </div>

      <div>
        <h2 className="font-extrabold text-2xl uppercase mb-4">Scale</h2>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Predictions Generated" value={formatCount(metrics.total_predictions)} />
          <MetricCard label="Outcomes Tracked" value={formatCount(metrics.total_outcomes)} />
        </div>
      </div>

      <Section title="Methodology">
        <div className="space-y-2 text-sm leading-relaxed">
          <p><strong>Factor Model:</strong> Quality, Growth, Value, Momentum, and Risk are scored through the internal factor pipeline.</p>
          <p><strong>Outcome Validation:</strong> Performance metrics require validated prediction outcomes with benchmark comparison fields.</p>
          <p><strong>Missing Data Rule:</strong> Any absent metric is displayed as {DATA_UNAVAILABLE} until source evidence exists.</p>
          <p><strong>Sector-Neutral:</strong> Companies are ranked within their sectors to reduce sector bias.</p>
        </div>
      </Section>

      <Section title="Data Sources">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>Prediction registry:</strong> Stored prediction records and validated outcomes</li>
          <li><strong>Feature snapshots:</strong> Internal market and technical snapshot pipeline</li>
          <li><strong>Factor snapshots:</strong> Internal quality, value, growth, momentum, and risk factors</li>
        </ul>
      </Section>

      <Section title="Limitations">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>Missing outcomes:</strong> Metrics remain unavailable until predictions have matured and been validated.</li>
          <li><strong>No guarantees:</strong> Forward-looking projections are statistical estimates, not investment advice.</li>
          <li><strong>Changing markets:</strong> Model behaviour can drift during unusual market conditions.</li>
        </ul>
      </Section>

      {evidenceAvailable && (
        <Section title="Validation Reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {[
              { name: "Factor Backtest Report", path: "FACTOR_BACKTEST_REPORT.json" },
              { name: "Factor Validation Report", path: "FACTOR_VALIDATION_REPORT.json" },
              { name: "Feature Importance Report", path: "FEATURE_IMPORTANCE_REPORT.json" },
              { name: "Intelligence Validation", path: "INTELLIGENCE_VALIDATION_REPORT.json" },
            ].map(report => (
              <a
                key={report.path}
                href={`/reports/${report.path}`}
                className="block p-3 border-2 border-black hover:bg-gray-900 hover:text-white font-bold text-sm uppercase transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {report.name}
              </a>
            ))}
          </div>
        </Section>
      )}

      <div className="border-t-4 border-black pt-4 text-center text-xs text-gray-500 font-bold uppercase">
        <p>StockStory India — Financial Intelligence Operating System</p>
        <p className="mt-1">Methodology version: 4.0 | Last updated: {formatAsOf(asOf)}</p>
        <p className="mt-2">Trust is earned by showing what is known and what is missing.</p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
