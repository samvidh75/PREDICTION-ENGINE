import type { FactorScoreMap } from "./factorScoring";
import { computeFactorScores, countActiveFactors } from "./factorScoring";
import { computeDimensionScores, type DimensionScoringResult } from "./dimensionScoring";
import { mapScoreToStance, type StanceEvaluation } from "./recommendationPolicy";

export interface ResearchScoreResult {
  overallScore: number | null;
  confidence: "low" | "medium" | "high";
  activeFactorCount: number;
  plannedFactorCount: number;
  activeDimensionCount: number;
  totalDimensionCount: number;
  stance: StanceEvaluation;
  positiveDrivers: string[];
  riskDrivers: string[];
  explanationBullets: string[];
  partialContextNote: string | null;
}

const MIN_ACTIVE_FACTORS_FOR_SCORE = 2;
const TOTAL_PLANNED = 195;

export function computeResearchScore(rawData: Record<string, unknown> | null | undefined, riskScore?: number | null): ResearchScoreResult {
  if (!rawData) {
    const stance = mapScoreToStance(null, riskScore ?? null, 0);
    return {
      overallScore: null,
      confidence: "low",
      activeFactorCount: 0,
      plannedFactorCount: TOTAL_PLANNED,
      activeDimensionCount: 0,
      totalDimensionCount: 7,
      stance,
      positiveDrivers: [],
      riskDrivers: [],
      explanationBullets: [stance.description],
      partialContextNote: "Not enough information for this view yet.",
    };
  }

  const factorScores: FactorScoreMap = computeFactorScores(rawData);
  const activeCount = countActiveFactors(factorScores);
  const dimResults: DimensionScoringResult = computeDimensionScores(factorScores);

  if (activeCount < MIN_ACTIVE_FACTORS_FOR_SCORE) {
    const stance = mapScoreToStance(null, riskScore ?? null, activeCount * 20);
    return {
      overallScore: null,
      confidence: "low",
      activeFactorCount: activeCount,
      plannedFactorCount: TOTAL_PLANNED,
      activeDimensionCount: dimResults.activeDimensionCount,
      totalDimensionCount: dimResults.totalDimensionCount,
      stance,
      positiveDrivers: [],
      riskDrivers: [],
      explanationBullets: [stance.description],
      partialContextNote: "Not enough information for this view yet.",
    };
  }

  const dimScores = dimResults.dimensions.map((d) => d.score).filter((s): s is number => s !== null);
  const weightedSum = dimResults.dimensions.reduce((sum, d) => {
    if (d.score === null) return sum;

    let weight = 1;
    if (d.id === "quality") weight = 1.5;
    if (d.id === "valuation") weight = 1.2;
    if (d.id === "risk") weight = 1.3;
    if (d.id === "momentum") weight = 0.5;

    return sum + d.score * weight;
  }, 0);

  const totalWeight = dimResults.dimensions.reduce((sum, d) => {
    if (d.score === null) return sum;
    let weight = 1;
    if (d.id === "quality") weight = 1.5;
    if (d.id === "valuation") weight = 1.2;
    if (d.id === "risk") weight = 1.3;
    if (d.id === "momentum") weight = 0.5;
    return sum + weight;
  }, 0);

  let rawScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

  const riskDimension = dimResults.dimensions.find((d) => d.id === "risk");
  if (rawScore !== null && riskDimension && riskDimension.score !== null) {
    const riskPenalty = Math.max(0, (100 - riskDimension.score) * 0.3);
    rawScore = Math.max(0, Math.round(rawScore - riskPenalty));
  }

  const activeDimCount = dimResults.activeDimensionCount;
  const dataCompleteness = Math.min(100, Math.round((activeCount / MIN_ACTIVE_FACTORS_FOR_SCORE) * 50));

  const stance = mapScoreToStance(rawScore, riskScore ?? null, dataCompleteness);

  const confidence: "low" | "medium" | "high" = activeDimCount >= 4 ? "high" : activeDimCount >= 2 ? "medium" : "low";

  const positiveDrivers: string[] = [];
  const riskDrivers: string[] = [];

  dimResults.dimensions.forEach((d) => {
    if (d.score !== null && d.score >= 70 && d.id !== "risk") {
      positiveDrivers.push(d.label);
    }
    if (d.id === "risk" && d.score !== null && d.score < 40) {
      riskDrivers.push("Elevated risk indicators");
    }
  });

  if (factorScores.debt_equity !== null && factorScores.debt_equity < 40) {
    riskDrivers.push("Above-average leverage");
  }

  const explanationBullets: string[] = [];

  if (rawScore !== null) {
    explanationBullets.push(`Overall research score: ${rawScore}/100 based on ${activeCount} active factors across ${activeDimCount} dimensions.`);
  }
  if (positiveDrivers.length > 0) {
    explanationBullets.push(`Positive drivers: ${positiveDrivers.slice(0, 3).join(", ")}.`);
  }
  if (riskDrivers.length > 0) {
    explanationBullets.push(`Risk factors: ${riskDrivers.slice(0, 2).join(", ")}.`);
  }
  if (activeCount < 8) {
    explanationBullets.push("Research context is based on available data.");
  }

  const partialContextNote = activeDimCount < 4
    ? "Partial research context"
    : null;

  return {
    overallScore: rawScore,
    confidence,
    activeFactorCount: activeCount,
    plannedFactorCount: TOTAL_PLANNED,
    activeDimensionCount: activeDimCount,
    totalDimensionCount: dimResults.totalDimensionCount,
    stance,
    positiveDrivers,
    riskDrivers,
    explanationBullets,
    partialContextNote,
  };
}

export function computeHealthometerFromResearch(
  rawData: Record<string, unknown> | null | undefined
): {
  quality: number | null;
  valuation: number | null;
  growth: number | null;
  stability: number | null;
  risk: number | null;
  momentum: number | null;
} {
  if (!rawData) {
    return { quality: null, valuation: null, growth: null, stability: null, risk: null, momentum: null };
  }

  const factorScores = computeFactorScores(rawData);
  const dimResults = computeDimensionScores(factorScores);

  const getScore = (id: string): number | null => {
    const dim = dimResults.dimensions.find((d) => d.id === id);
    return dim?.score ?? null;
  };

  return {
    quality: getScore("quality"),
    valuation: getScore("valuation"),
    growth: getScore("growth"),
    stability: getScore("stability"),
    risk: getScore("risk"),
    momentum: getScore("momentum"),
  };
}
