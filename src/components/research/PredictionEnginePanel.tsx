import React from "react";
import { Activity, ShieldAlert, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { buildPredictionViewModel } from "../../lib/product/predictionEngine/predictionViewModel";
import { buildHealthometerViewModel } from "../../lib/product/predictionEngine/healthometerViewModel";
import { ProductPanel, ProductStatusPill } from "../product/ProductUI";

interface PredictionEnginePanelProps {
  symbol: string;
  score: number | null | undefined;
  riskScore: number | null | undefined;
  qualityScore?: number | null | undefined;
  valuationScore?: number | null | undefined;
  growthScore?: number | null | undefined;
  stabilityScore?: number | null | undefined;
  momentumScore?: number | null | undefined;
  rawMetrics?: Record<string, unknown> | null | undefined;
}

export const PredictionEnginePanel: React.FC<PredictionEnginePanelProps> = ({
  symbol,
  score,
  riskScore,
  qualityScore,
  valuationScore,
  growthScore,
  stabilityScore,
  momentumScore,
  rawMetrics,
}) => {
  const model = buildPredictionViewModel(symbol, score, riskScore, rawMetrics);
  const health = buildHealthometerViewModel(
    qualityScore,
    valuationScore,
    growthScore,
    stabilityScore,
    riskScore,
    momentumScore
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. Prediction Engine Panel */}
      <ProductPanel className="p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#2962FF]" />
              <h3 className="text-sm font-semibold text-[#E6EDF3]">Prediction Engine</h3>
            </div>
            <span className="text-[10px] font-mono text-[#9AA7B5]">{model.activeFactorCount} active parameters</span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#64748B] block mb-1">Research Stance</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#E6EDF3]">{model.stance.stance}</span>
                <ProductStatusPill tone={model.stance.stance === "High conviction" || model.stance.stance === "Thesis improving" ? "verified" : model.stance.stance === "Watch" ? "blue" : "warning"}>
                  {model.isReady ? "Ready" : "Preparing context"}
                </ProductStatusPill>
              </div>
              <p className="mt-1 text-xs text-[#9AA7B5] leading-relaxed">{model.stance.description}</p>
            </div>

            {model.categoriesUsed.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#64748B] block mb-2">Evaluated Categories</span>
                <div className="flex flex-wrap gap-1.5">
                  {model.categoriesUsed.map((cat) => (
                    <span key={cat} className="rounded border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[9px] font-mono capitalize text-[#9AA7B5]">
                      {cat.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-white/[0.04] pt-3 text-[10px] text-[#64748B] flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Research context is based on available data.</span>
        </div>
      </ProductPanel>

      {/* 2. Healthometer Panel */}
      <ProductPanel className="p-5">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#2962FF]" />
            <h3 className="text-sm font-semibold text-[#E6EDF3]">Healthometer</h3>
          </div>
          <span className="text-[10px] text-[#9AA7B5]">{health.overallStatus}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {health.dimensions.map((dim) => {
            const hasScore = dim.score !== null;
            return (
              <div key={dim.id} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 transition hover:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-[#9AA7B5]">{dim.label}</span>
                  {hasScore ? (
                    <span className="text-xs font-bold font-mono" style={{ color: dim.color }}>
                      {Math.round(dim.score!)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-[#64748B]">Pending</span>
                  )}
                </div>
                <div className="mt-2 h-1 w-full rounded-full overflow-hidden bg-white/[0.06]">
                  <div className="h-full rounded-full transition-all" style={{ width: hasScore ? `${dim.score}%` : "0%", backgroundColor: dim.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </ProductPanel>
    </div>
  );
};

export default PredictionEnginePanel;
