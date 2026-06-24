import React, { useMemo } from "react";
import { Activity, ShieldAlert } from "lucide-react";
import { buildPredictionViewModel } from "../../lib/product/predictionEngine/predictionViewModel";
import { buildHealthometerViewModel } from "../../lib/product/predictionEngine/healthometerViewModel";
import { ProductPanel } from "../product/ProductUI";

const LABEL_STYLES: Record<string, string> = {
  "Very healthy": "bg-[rgba(45,212,191,0.12)] border-[rgba(45,212,191,0.2)] text-[#2DD4BF]",
  "Healthy": "bg-[rgba(91,124,250,0.12)] border-[rgba(91,124,250,0.2)] text-[#5B7CFA]",
  "Stable": "bg-[rgba(148,163,184,0.12)] border-[rgba(148,163,184,0.2)] text-[#94A3B8]",
  "Needs review": "bg-[rgba(244,183,64,0.12)] border-[rgba(244,183,64,0.2)] text-[#F4B740]",
  "Risk rising": "bg-[rgba(251,146,60,0.12)] border-[rgba(251,146,60,0.2)] text-[#FB923C]",
  "Fragile": "bg-[rgba(248,113,113,0.12)] border-[rgba(248,113,113,0.2)] text-[#F87171]",
};

const DIM_COLORS: Record<string, string> = {
  quality: "#5B7CFA",
  financial_strength: "#2DD4BF",
  growth: "#1746A2",
  valuation: "#F4B740",
  risk: "#FB923C",
  momentum: "#38BDF8",
  stability: "#94A3B8",
  capital_efficiency: "#6B7280",
};

interface PredictionEnginePanelProps {
  symbol: string;
  score: number | null | undefined;
  riskScore: number | null | undefined;
  qualityScore?: number | null | undefined;
  valuationScore?: number | null | undefined;
  growthScore?: number | null | undefined;
  stabilityScore?: number | null | undefined;
  momentumScore?: number | null | undefined;
  financialStrengthScore?: number | null | undefined;
  rawMetrics?: Record<string, unknown> | null | undefined;
  healthometerLabel?: string | null;
}

export const PredictionEnginePanel: React.NamedExoticComponent<PredictionEnginePanelProps> = React.memo(({
  symbol, score, riskScore, qualityScore, valuationScore,
  growthScore, stabilityScore, momentumScore, financialStrengthScore,
  rawMetrics, healthometerLabel,
}) => {
  const model = useMemo(
    () => buildPredictionViewModel(symbol, score, riskScore, rawMetrics),
    [symbol, score, riskScore, rawMetrics]
  );
  const health = useMemo(
    () => buildHealthometerViewModel(
      qualityScore, valuationScore, growthScore,
      stabilityScore, riskScore, momentumScore,
      financialStrengthScore
    ),
    [qualityScore, valuationScore, growthScore, stabilityScore, riskScore, momentumScore, financialStrengthScore]
  );

  const hasRealData = model.activeFactorCount >= 2 && model.overallScore !== null;

  const realDrivers = useMemo(
    () => Array.from(new Set(model.topPositiveDrivers.filter(
      (d) => !d.includes("N/A") && !d.toLowerCase().includes("unavailable")
    ))),
    [model.topPositiveDrivers]
  );
  const realRisks = useMemo(
    () => Array.from(new Set(model.topRiskDrivers.filter(
      (d) => !d.includes("N/A") && !d.toLowerCase().includes("unavailable")
    ))),
    [model.topRiskDrivers]
  );

  const realDimensions = useMemo(() => health.dimensions.filter((d) => d.score !== null), [health.dimensions]);
  const missingDimensions = useMemo(() => health.dimensions.filter((d) => d.score === null), [health.dimensions]);
  const labelClass = healthometerLabel && LABEL_STYLES[healthometerLabel] ? LABEL_STYLES[healthometerLabel] : LABEL_STYLES["Stable"];
  const displayLabel = healthometerLabel || "Stable";

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ProductPanel className="p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--color-accent)]" />
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Prediction Engine</h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{model.activeFactorCount} active parameters</span>
          </div>

          <div className="space-y-4">
            {hasRealData && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Research stance</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[var(--color-text-primary)]">{model.publicResearchStance}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                  Score: {model.overallScore}/100 · {model.activeDimensionCount} of {model.totalDimensionCount} dimensions active
                </p>
              </div>
            )}

            {hasRealData && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Confidence</span>
                <span className="text-xs font-medium text-[var(--color-text-secondary)] capitalize">{model.confidence}</span>
              </div>
            )}

            {hasRealData && model.productSafeNote && (
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{model.productSafeNote}</p>
            )}

            {!hasRealData && (
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Not enough information for this view yet. Search for a company to begin research.
              </p>
            )}

            {realDrivers.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Strongest signals</span>
                <div className="flex flex-wrap gap-1.5">
                  {realDrivers.map((d) => (
                    <span key={d} className="rounded border border-[var(--color-active-border)] bg-[var(--color-active-bg)] px-2 py-0.5 text-[9px] font-medium text-[var(--color-active)]">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {realRisks.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1">Risk indicators</span>
                <div className="flex flex-wrap gap-1.5">
                  {realRisks.map((d) => (
                    <span key={d} className="rounded border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-2 py-0.5 text-[9px] font-medium text-[var(--color-danger)]">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {hasRealData && model.explanationBullets.length > 0 && (
              <div className="text-[10px] text-[var(--color-text-muted)] space-y-1">
                {model.explanationBullets.map((b, i) => (
                  <p key={i}>{b}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </ProductPanel>

      <ProductPanel className="p-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Healthometer</h3>
          </div>
          <span className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold ${labelClass}`}>
            {displayLabel}
          </span>
        </div>

        {health.overallScore !== null && (
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-[var(--color-text-primary)]">{health.overallScore}</span>
            <span className="text-[10px] text-[var(--color-text-secondary)]">/ 100</span>
            <span className="text-[9px] text-[var(--color-text-muted)] ml-auto">{realDimensions.length} of {health.dimensions.length} active</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {realDimensions.length > 0 ? (
            realDimensions.map((dim) => {
              const barColor = DIM_COLORS[dim.id] || "#64748B";
              const barWidth = dim.score !== null ? `${Math.round(dim.score)}%` : "0%";
              return (
                <div key={dim.id} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{dim.label}</span>
                    <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                      {dim.score !== null ? Math.round(dim.score) : "—"}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full overflow-hidden bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: barWidth, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-6">
              <p className="text-xs text-[var(--color-text-muted)]">Not enough information for this view yet.</p>
            </div>
          )}

          {missingDimensions.length > 0 && realDimensions.length > 0 && (
            <div className="col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.005] p-3 text-[10px] text-[var(--color-text-muted)]">
              <span className="font-semibold block mb-0.5 text-[var(--color-text-secondary)]">Needs more research context:</span>
              <span>{missingDimensions.map((d) => d.label).join(", ")}</span>
            </div>
          )}
        </div>
      </ProductPanel>
    </div>
  );
});

export default PredictionEnginePanel;
