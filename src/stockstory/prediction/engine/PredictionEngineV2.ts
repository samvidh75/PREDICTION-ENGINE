import { FACTOR_REGISTRY, getActiveFactors, getFactorsByDimension } from "../factors/FactorRegistry";
import type { FactorDefinition, FactorInput, FactorResult, DimensionScore, PredictionV2Output } from "../factors/FactorTypes";
import { FACTOR_DIMENSIONS } from "../factors/FactorCategories";

const MODEL_VERSION = "prediction-engine-v2.0.0";

function safeScore(value: number | null | undefined, min = 0, max = 100): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function computeFactorScore(factor: FactorDefinition, input: FactorInput): FactorResult {
  if (factor.status !== "active") {
    return { factorId: factor.id, value: null, score: null, status: factor.status, active: false, reason: "Factor inactive" };
  }

  // Check if pre-computed value is provided directly (factor ID matches input key)
  const allInputs = { ...input.financials, ...input.prices, ...input.metrics, ...input.fundamentals };
  const directVal = (allInputs as Record<string, unknown>)[factor.id];
  const hasDirectValue = typeof directVal === "number" && Number.isFinite(directVal);

  if (!hasDirectValue) {
    const hasAllInputs = factor.requiredRawInputs.every((r) => {
      const val = (input.financials as any)[r] ?? (input.prices as any)[r] ?? (input.metrics as any)[r] ?? null;
      return val !== null && val !== undefined;
    });
    if (!hasAllInputs) {
      if (factor.missingDataBehavior === "return_null") {
        return { factorId: factor.id, value: null, score: null, status: factor.status, active: true, reason: "Missing required data" };
      }
      if (factor.missingDataBehavior === "reduce_confidence") {
        return { factorId: factor.id, value: null, score: null, status: factor.status, active: true, reason: "Missing data, confidence reduced" };
      }
    }
  }

  const value = getFactorValue(factor, input);

  if (value === null) {
    return { factorId: factor.id, value: null, score: null, status: factor.status, active: true, reason: "Cannot compute value" };
  }

  const score = normalizeFactorValue(value, factor);
  return { factorId: factor.id, value, score: safeScore(score), status: factor.status, active: true, reason: null };
}

function getFactorValue(factor: FactorDefinition, input: FactorInput): number | null {
  const allData = { ...input.financials, ...input.prices, ...input.metrics, ...input.fundamentals };

  // Direct pre-computed value: if factor ID matches a key in input, use directly
  const directValue = (allData as Record<string, unknown>)[factor.id];
  if (typeof directValue === "number" && Number.isFinite(directValue)) {
    return directValue;
  }

  const vals = factor.requiredRawInputs.map((r) => {
    const v = (allData as any)[r];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  });

  if (vals.some((v) => v === null)) {
    if (factor.missingDataBehavior === "return_null") return null;
    if (factor.missingDataBehavior === "reduce_confidence") return null;
    return null;
  }

  const numericVals = vals as number[];

  switch (factor.id) {
    case "gross_margin": return numericVals[1] !== 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "operating_margin": return numericVals[1] !== 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "net_margin": return numericVals[1] !== 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "return_on_equity": return numericVals[1] !== 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "return_on_assets": return numericVals[1] !== 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "debt_to_equity": return numericVals[1] !== 0 ? numericVals[0] / numericVals[1] : null;
    case "net_debt_to_equity": return numericVals[2] !== 0 ? (numericVals[0] - numericVals[1]) / numericVals[2] : null;
    case "current_ratio": return numericVals[1] !== 0 ? numericVals[0] / numericVals[1] : null;
    case "interest_coverage": return numericVals[1] !== 0 ? numericVals[0] / numericVals[1] : null;
    case "pe_ratio": return numericVals[1] !== 0 ? numericVals[0] / numericVals[1] : null;
    case "pb_ratio": return numericVals[1] !== 0 ? numericVals[0] / numericVals[1] : null;
    case "price_to_sales": return numericVals[0] > 0 && numericVals[1] > 0 ? numericVals[0] / numericVals[1] : null;
    case "earnings_yield": return numericVals[1] !== 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "fcf_yield": case "fcf_yield_v2": return numericVals[1] > 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "dividend_yield": case "dividend_yield_v2": return numericVals[1] !== 0 ? (numericVals[0] / numericVals[1]) * 100 : null;
    case "cash_conversion_ratio": return numericVals[1] !== 0 ? numericVals[0] / numericVals[1] : null;
    case "cash_to_debt": return numericVals[1] > 0 ? numericVals[0] / numericVals[1] : null;
    default: return numericVals[0];
  }
}

function normalizeFactorValue(value: number, factor: FactorDefinition): number | null {
  if (!Number.isFinite(value)) return null;
  const min = factor.winsorizeMin !== undefined ? factor.winsorizeMin : -Infinity;
  const max = factor.winsorizeMax !== undefined ? factor.winsorizeMax : Infinity;
  const clipped = Math.max(min, Math.min(max, value));

  switch (factor.normalization) {
    case "identity": return clipToScore(clipped, 0, 100);
    case "inverse": return clipToScore(100 - (clipped / (max !== Infinity ? max : 100)) * 100, 0, 100);
    case "sigmoid": return clipToScore((1 / (1 + Math.exp(-clipped))) * 100, 0, 100);
    case "percentile": return clipToScore(clipped, 0, 100);
    case "binary_flag": return clipped > 0 ? 100 : 0;
    case "log": return clipToScore(Math.log10(clipped + 1) * 20, 0, 100);
    case "minmax": return max !== min ? clipToScore(((clipped - min) / (max - min)) * 100, 0, 100) : 50;
    default: return clipToScore(clipped, 0, 100);
  }
}

function clipToScore(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function computeDimensionScores(activeFactors: FactorDefinition[], factorResults: FactorResult[]): DimensionScore[] {
  const dimScores: DimensionScore[] = [];
  for (const [dimKey, dimMeta] of Object.entries(FACTOR_DIMENSI)) {
    const dimFactors = activeFactors.filter((f) => f.dimension === dimKey);
    const dimResults = factorResults.filter((r) => dimFactors.some((f) => f.id === r.factorId) && r.score !== null);
    const totalInDim = dimFactors.length;
    const activeInDim = dimResults.length;
    const coverage = totalInDim > 0 ? activeInDim / totalInDim : 0;
    const avgScore = activeInDim > 0 ? Math.round(dimResults.reduce((s, r) => s + (r.score ?? 0), 0) / activeInDim) : null;
    dimScores.push({
      dimension: dimKey as any,
      score: avgScore !== null ? Math.max(0, Math.min(100, avgScore)) : null,
      activeFactorCount: activeInDim,
      totalFactorCount: totalInDim,
      coverageRatio: coverage,
    });
  }
  return dimScores;
}

function computeResearchState(score: number | null, confidence: number | null): string {
  if (score === null) return "Not enough information";
  if (confidence !== null && confidence < 25) return "Not enough information";
  if (score >= 80) return "High conviction";
  if (score >= 65) return "Watch";
  if (score >= 50) return "Needs review";
  if (score >= 35) return "Risk rising";
  return "Avoid for now";
}

function computeConfidence(
  activeFactorCount: number,
  totalFactorCount: number,
  dimensionScores: DimensionScore[],
): number | null {
  const coverage = totalFactorCount > 0 ? activeFactorCount / totalFactorCount : 0;
  const dimCoverage = dimensionScores.length > 0
    ? dimensionScores.reduce((s, d) => s + d.coverageRatio, 0) / dimensionScores.length
    : 0;
  if (activeFactorCount < 5) return null;
  const raw = (coverage * 50 + dimCoverage * 50);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getTopDrivers(factorResults: FactorResult[], count: number, higherBetter: boolean): string[] {
  const scored = factorResults.filter((r) => r.score !== null && r.active);
  const sorted = scored.sort((a, b) => higherBetter ? (b.score ?? 0) - (a.score ?? 0) : (a.score ?? 0) - (b.score ?? 0));
  const factorMap = new Map(FACTOR_REGISTRY.map((f) => [f.id, f]));
  return sorted.slice(0, count).map((r) => factorMap.get(r.factorId)?.publicName ?? r.factorId);
}

function computeExplanation(score: number | null, state: string, activeCount: number, totalCount: number): string {
  if (score === null) return "Not enough information for this view yet.";
  const coverage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  if (state === "High conviction") return `Strong research profile based on ${activeCount} active factors (${coverage}% factor coverage).`;
  if (state === "Watch") return `Solid fundamentals with ${activeCount} active factors supporting the outlook. Continue to monitor.`;
  if (state === "Needs review") return `Mixed signals across ${activeCount} active factors. Review risk and valuation before acting.`;
  if (state === "Risk rising") return `Risk indicators dominate with ${activeCount} active factors. Reassess thesis carefully.`;
  if (state === "Avoid for now") return `Multiple risk flags across ${activeCount} active factors suggest caution.`;
  return `Research context based on ${activeCount} of ${totalCount} available factors.`;
}

export async function evaluatePredictionV2(input: FactorInput): Promise<PredictionV2Output> {
  const totalFactors = FACTOR_REGISTRY.length;
  const activeDefs = getActiveFactors();

  const factorResults: FactorResult[] = activeDefs.map((f) => computeFactorScore(f, input));
  const scoredResults = factorResults.filter((r) => r.score !== null);
  const activeFactorCount = scoredResults.length;

  const dimensionScores = computeDimensionScores(activeDefs, factorResults);

  const dimScoreAvg = dimensionScores
    .filter((d) => d.score !== null)
    .reduce((s, d) => s + (d.score ?? 0), 0);
  const dimScoreCount = dimensionScores.filter((d) => d.score !== null).length;
  const rawScore = dimScoreCount > 0 ? dimScoreAvg / dimScoreCount : null;

  const weightedScore = (() => {
    let total = 0;
    let totalWeight = 0;
    for (const ds of dimensionScores) {
      if (ds.score === null) continue;
      const weight = FACTOR_DIMENSIONS[ds.dimension]?.weight ?? 0.1;
      total += ds.score * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? total / totalWeight : null;
  })();

  const score = safeScore(weightedScore ?? rawScore);
  const confidence = computeConfidence(activeFactorCount, totalFactors, dimensionScores);
  const state = computeResearchState(score, confidence);

  return {
    symbol: input.symbol,
    modelVersion: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    researchState: state,
    score,
    confidence,
    activeFactorCount,
    totalFactorCount: totalFactors,
    factorCoverageRatio: totalFactors > 0 ? activeFactorCount / totalFactors : 0,
    dimensionScores,
    topPositiveDrivers: getTopDrivers(factorResults, 5, true),
    topRiskDrivers: getTopDrivers(factorResults, 5, false),
    missingContextSummary: dimensionScores.filter((d) => d.score === null).map((d) => d.dimension),
    explanation: computeExplanation(score, state, activeFactorCount, totalFactors),
    validationStatus: "unvalidated",
  };
}
