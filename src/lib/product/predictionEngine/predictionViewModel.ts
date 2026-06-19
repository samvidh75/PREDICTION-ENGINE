import { computeResearchScore, type ResearchScoreResult } from "./researchScore";
import { mapScoreToStance } from "./recommendationPolicy";
import { FACTOR_REGISTRY } from "./factorRegistry";
import type { FactorCategory } from "./factorTypes";

export type PredictionReadiness = "ready" | "partial" | "limited";

export interface PredictionViewState {
  symbol: string;
  readiness: PredictionReadiness;
  overallScore: number | null;
  confidence: "low" | "medium" | "high";
  publicResearchStance: string;
  activeFactorCount: number;
  totalPlannedFactorCount: number;
  activeDimensionCount: number;
  totalDimensionCount: number;
  topPositiveDrivers: string[];
  topRiskDrivers: string[];
  factorCategorySummary: string[];
  explanationBullets: string[];
  productSafeNote: string | null;
  researchScoreResult: ResearchScoreResult | null;
}

export function buildPredictionViewModel(
  symbol: string,
  score: number | null | undefined,
  _riskScore: number | null | undefined,
  rawStockMetrics: Record<string, unknown> | null | undefined
): PredictionViewState {
  const researchResult = computeResearchScore(rawStockMetrics, _riskScore ?? null);

  const readiness: PredictionReadiness = researchResult.activeFactorCount >= 5
    ? "ready"
    : researchResult.activeFactorCount >= 2
      ? "partial"
      : "limited";

  const categoriesUsedSet = new Set<FactorCategory>();
  if (rawStockMetrics) {
    FACTOR_REGISTRY.forEach((factor) => {
      if (factor.availability === "active" && rawStockMetrics[factor.expectedInputField] !== undefined) {
        categoriesUsedSet.add(factor.category);
      }
    });
  }

  const finalScore = (score !== null && score !== undefined) ? score : researchResult.overallScore;
  const isReady = researchResult.activeFactorCount >= 2 && finalScore !== null;
  const finalStanceObj = (score !== null && score !== undefined)
    ? mapScoreToStance(finalScore, _riskScore ?? null, isReady ? 100 : 0)
    : researchResult.stance;

  const stance = finalStanceObj?.stance ?? "Not enough information";
  const productSafeNote = researchResult.partialContextNote;

  return {
    symbol,
    readiness,
    overallScore: finalScore,
    confidence: researchResult.confidence,
    publicResearchStance: stance,
    activeFactorCount: researchResult.activeFactorCount,
    totalPlannedFactorCount: researchResult.plannedFactorCount,
    activeDimensionCount: researchResult.activeDimensionCount,
    totalDimensionCount: researchResult.totalDimensionCount,
    topPositiveDrivers: researchResult.positiveDrivers.slice(0, 3),
    topRiskDrivers: researchResult.riskDrivers.slice(0, 3),
    factorCategorySummary: Array.from(categoriesUsedSet).map((c) => String(c)),
    explanationBullets: researchResult.explanationBullets,
    productSafeNote,
    researchScoreResult: researchResult,
  };
}
