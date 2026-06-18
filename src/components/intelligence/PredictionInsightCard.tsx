import React from "react";
import { TrendingUp, AlertCircle, HelpCircle } from "lucide-react";
import { PredictionConfidenceBar } from "./PredictionConfidenceBar";
import { ModelRunBadge } from "./ModelRunBadge";
import { FactorDriverCard } from "./FactorDriverCard";
import { DataFreshnessLine } from "./DataFreshnessLine";

export interface PredictionData {
  rankingScore: number | null;
  classification: string | null;
  confidenceScore: number | null;
  confidenceLevel: string | null;
  factors?: Record<string, number | null>;
  factorDescriptions?: Record<string, string | null>;
  modelVersion?: string | null;
  predictionDate?: string | null;
  dataFreshness?: {
    price?: { label: string; status: "fresh" | "stale" | "critical" | "unavailable" };
    factor?: { label: string; status: "fresh" | "stale" | "critical" | "unavailable" };
    prediction?: { label: string; status: "fresh" | "stale" | "critical" | "unavailable" };
  } | null;
}

interface PredictionInsightCardProps {
  symbol: string;
  companyName?: string;
  prediction: PredictionData | null;
  onOpenExplanation?: () => void;
  className?: string;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  Exceptional: "Exceptional",
  Excellent: "Excellent",
  Good: "Good",
  Fair: "Fair",
  Weak: "Weak",
  Critical: "Critical",
};

export function PredictionInsightCard({ symbol, companyName, prediction, onOpenExplanation, className = "" }: PredictionInsightCardProps) {
  if (!prediction) {
    return (
      <div className={`rounded-[22px] border border-white/5 bg-[#0D1117] p-5 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
            <HelpCircle className="h-5 w-5 text-[#484F58]" />
          </div>
          <div>
            <span className="text-sm font-semibold text-[#E6EDF3]">{symbol}</span>
            {companyName && <span className="ml-2 text-xs text-[#8B949E]">{companyName}</span>}
            <p className="mt-0.5 text-xs text-[#484F58]">Prediction explanation unavailable</p>
          </div>
        </div>
      </div>
    );
  }

  const hasScore = typeof prediction.rankingScore === "number" && Number.isFinite(prediction.rankingScore);
  const hasFactors = prediction.factors && Object.keys(prediction.factors).length > 0;
  const topFactors = hasFactors
    ? Object.entries(prediction.factors!)
      .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([k]) => k)
    : [];

  return (
    <div className={`rounded-[22px] border border-white/5 bg-[#0D1117] ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-[#E6EDF3]">{symbol}</span>
            {companyName && (
              <span className="truncate text-xs text-[#8B949E]">{companyName}</span>
            )}
          </div>
          {prediction.predictionDate && (
            <ModelRunBadge modelVersion={prediction.modelVersion} runDate={prediction.predictionDate} className="mt-2" />
          )}
        </div>
        {hasScore && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-2xl font-bold tabular-nums text-[#E6EDF3]">
              {Math.round(prediction.rankingScore!)}
            </span>
            {prediction.classification && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">
                {CLASSIFICATION_LABELS[prediction.classification] || prediction.classification}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-4 px-5 py-4">
        {/* Confidence */}
        <PredictionConfidenceBar
          score={prediction.confidenceScore}
          level={prediction.confidenceLevel}
        />

        {/* Top factor drivers */}
        {topFactors.length > 0 && (
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#8B949E]">Top factors</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {topFactors.map((key) => (
                <FactorDriverCard
                  key={key}
                  label={key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  score={prediction.factors![key]}
                  description={prediction.factorDescriptions?.[key]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Data freshness */}
        {prediction.dataFreshness && (
          <DataFreshnessLine items={Object.values(prediction.dataFreshness)} />
        )}

        {/* Score not available notice */}
        {!hasScore && (
          <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF9A09]" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[#8B949E]">
              Model output available; explanation layer pending
            </p>
          </div>
        )}

        {/* Explanation button */}
        {onOpenExplanation && (
          <button
            type="button"
            onClick={onOpenExplanation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-[#E6EDF3] hover:bg-white/[0.08] transition-colors"
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Open explanation
          </button>
        )}
      </div>
    </div>
  );
}
