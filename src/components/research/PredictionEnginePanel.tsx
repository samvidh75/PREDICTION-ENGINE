import React from "react";
import { Activity, ShieldAlert } from "lucide-react";
import { buildPredictionViewModel } from "../../lib/product/predictionEngine/predictionViewModel";
import { buildHealthometerViewModel } from "../../lib/product/predictionEngine/healthometerViewModel";
import { ProductPanel } from "../product/ProductUI";

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
}

export const PredictionEnginePanel: React.FC<PredictionEnginePanelProps> = ({
  symbol, score, riskScore, qualityScore, valuationScore,
  growthScore, stabilityScore, momentumScore, financialStrengthScore,
  rawMetrics,
}) => {
  const model = buildPredictionViewModel(symbol, score, riskScore, rawMetrics);
  const health = buildHealthometerViewModel(
    qualityScore, valuationScore, growthScore,
    stabilityScore, riskScore, momentumScore,
    financialStrengthScore
  );

  const hasRealData = model.activeFactorCount >= 2 && model.overallScore !== null;

  const realDrivers = model.topPositiveDrivers.filter(
    (d) => !d.includes("N/A") && !d.toLowerCase().includes("unavailable")
  );
  const realRisks = model.topRiskDrivers.filter(
    (d) => !d.includes("N/A") && !d.toLowerCase().includes("unavailable")
  );

  const realDimensions = health.dimensions.filter((d) => d.score !== null);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ProductPanel className="p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2962FF]" />
              <h3 className="text-sm font-semibold text-[#E6EDF3]">Research context</h3>
            </div>
            <span className="text-[10px] font-mono text-[#9AA7B5]">{model.activeFactorCount} active parameters</span>
          </div>

          <div className="space-y-4">
            {hasRealData && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] block mb-1">Research stance</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#E6EDF3]">{model.publicResearchStance}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[#9AA7B5]">
                  Score: {model.overallScore}/100 · {model.activeDimensionCount} of {model.totalDimensionCount} dimensions active
                </p>
              </div>
            )}

            {hasRealData && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] block mb-1">Confidence</span>
                <span className="text-xs font-semibold text-[#E6EDF3] capitalize">{model.confidence}</span>
              </div>
            )}

            {hasRealData && model.productSafeNote && (
              <p className="text-xs text-[#9AA7B5] leading-relaxed">{model.productSafeNote}</p>
            )}

            {!hasRealData && (
              <p className="text-xs text-[#64748B] leading-relaxed">
                Not enough information for this view yet. Search for a company to begin research.
              </p>
            )}

            {realDrivers.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] block mb-1">Strongest signals</span>
                <div className="flex flex-wrap gap-1.5">
                  {realDrivers.map((d) => (
                    <span key={d} className="rounded border border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.06)] px-2 py-0.5 text-[9px] font-medium text-[#16A34A]">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {realRisks.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] block mb-1">Risk indicators</span>
                <div className="flex flex-wrap gap-1.5">
                  {realRisks.map((d) => (
                    <span key={d} className="rounded border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] px-2 py-0.5 text-[9px] font-medium text-[#EF4444]">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {hasRealData && model.explanationBullets.length > 0 && (
              <div className="text-[10px] text-[#64748B] space-y-1">
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
            <ShieldAlert className="h-4 w-4 text-[#2962FF]" />
            <h3 className="text-sm font-semibold text-[#E6EDF3]">Healthometer</h3>
          </div>
          <span className="text-[10px] text-[#9AA7B5]">{health.overallStatus}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {realDimensions.length > 0 ? realDimensions.map((dim) => (
            <div key={dim.id} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-[#9AA7B5]">{dim.label}</span>
                <span className="text-xs font-bold font-mono text-[#E6EDF3]">
                  {Math.round(dim.score!)}
                </span>
              </div>
            </div>
          )) : (
            <div className="col-span-2 text-center py-6">
              <p className="text-xs text-[#64748B]">Not enough information for this view yet.</p>
            </div>
          )}
        </div>
      </ProductPanel>
    </div>
  );
};

export default PredictionEnginePanel;
