import { FACTOR_REGISTRY } from "./factorRegistry";
import { normalizeNumericValue } from "./factorNormalization";
import type { FactorDefinition } from "./factorTypes";

export interface CoverageSummary {
  totalRegistered: number;
  activeCount: number;
  plannedCount: number;
  unavailableCount: number;
  coverageRatio: number;
  availableFactors: string[];
}

export function computeFactorCoverage(stockData: Record<string, unknown> | null | undefined): CoverageSummary {
  const totalRegistered = FACTOR_REGISTRY.length;
  const plannedCount = FACTOR_REGISTRY.filter(f => f.availability === "planned").length;
  const unavailableCount = FACTOR_REGISTRY.filter(f => f.availability === "unavailable").length;

  const availableFactors: string[] = [];

  if (stockData) {
    FACTOR_REGISTRY.forEach((factor) => {
      if (factor.availability === "active") {
        const value = stockData[factor.expectedInputField];
        const normalized = normalizeNumericValue(value);
        if (normalized !== null) {
          availableFactors.push(factor.id);
        }
      }
    });
  }

  const activeCount = availableFactors.length;
  const coverageRatio = totalRegistered > 0 ? activeCount / totalRegistered : 0;

  return {
    totalRegistered,
    activeCount,
    plannedCount,
    unavailableCount,
    coverageRatio,
    availableFactors,
  };
}
