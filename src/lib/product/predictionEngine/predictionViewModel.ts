import { FACTOR_REGISTRY } from "./factorRegistry";
import { computeFactorCoverage, type CoverageSummary } from "./factorCoverage";
import { mapScoreToStance, type StanceEvaluation } from "./recommendationPolicy";
import type { FactorCategory } from "./factorTypes";

export interface PredictionViewState {
  symbol: string;
  isReady: boolean;
  activeFactorCount: number;
  coverage: CoverageSummary;
  stance: StanceEvaluation;
  categoriesUsed: FactorCategory[];
}

export function buildPredictionViewModel(
  symbol: string,
  score: number | null | undefined,
  riskScore: number | null | undefined,
  rawStockMetrics: Record<string, unknown> | null | undefined
): PredictionViewState {
  const coverage = computeFactorCoverage(rawStockMetrics);
  const activeFactorCount = coverage.activeCount;
  const isReady = activeFactorCount >= 2 && score !== null && score !== undefined;

  const stance = mapScoreToStance(score, riskScore, isReady ? 100 : 0);

  // Determine which categories have active factors
  const categoriesUsedSet = new Set<FactorCategory>();
  if (rawStockMetrics) {
    FACTOR_REGISTRY.forEach((factor) => {
      if (factor.availability === "active" && coverage.availableFactors.includes(factor.id)) {
        categoriesUsedSet.add(factor.category);
      }
    });
  }

  return {
    symbol,
    isReady,
    activeFactorCount,
    coverage,
    stance,
    categoriesUsed: Array.from(categoriesUsedSet),
  };
}
