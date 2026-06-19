import type { FactorScoreMap } from "./factorScoring";
import { computeFactorScores, countActiveFactors, getTopFactors, getBottomFactors } from "./factorScoring";
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

const MIN_ACTIVE_FACTORS_FOR_SCORE = 3;
const TOTAL_PLANNED = 195;
const DIM_LABELS: Record<string, string> = {
  quality: "Business quality", financial_strength: "Financial strength",
  valuation: "Valuation context", growth: "Growth",
  stability: "Stability", risk: "Risk context", momentum: "Momentum",
};

export function computeResearchScore(rawData: Record<string, unknown> | null | undefined, riskScore?: number | null): ResearchScoreResult {
  if (!rawData) {
    const stance = mapScoreToStance(null, riskScore ?? null, 0);
    return {
      overallScore: null, confidence: "low",
      activeFactorCount: 0, plannedFactorCount: TOTAL_PLANNED,
      activeDimensionCount: 0, totalDimensionCount: 7, stance,
      positiveDrivers: [], riskDrivers: [],
      explanationBullets: [stance.description],
      partialContextNote: "Not enough information for this view yet.",
    };
  }

  const factorScores: FactorScoreMap = computeFactorScores(rawData);
  const activeCount = countActiveFactors(factorScores);
  const dimResults: DimensionScoringResult = computeDimensionScores(factorScores);

  if (activeCount < MIN_ACTIVE_FACTORS_FOR_SCORE) {
    const stance = mapScoreToStance(null, riskScore ?? null, Math.round((activeCount / MIN_ACTIVE_FACTORS_FOR_SCORE) * 40));
    return {
      overallScore: null, confidence: "low",
      activeFactorCount: activeCount, plannedFactorCount: TOTAL_PLANNED,
      activeDimensionCount: dimResults.activeDimensionCount, totalDimensionCount: dimResults.totalDimensionCount, stance,
      positiveDrivers: [], riskDrivers: [],
      explanationBullets: [stance.description],
      partialContextNote: "Not enough information for this view yet.",
    };
  }

  const dimScores = dimResults.dimensions.map((d) => d.score).filter((s): s is number => s !== null);
  let rawScore = dimScores.length > 0 ? Math.round(dimScores.reduce((a, b) => a + b, 0) / dimScores.length) : null;

  const riskDim = dimResults.dimensions.find((d) => d.id === "risk");
  if (rawScore !== null && riskDim && riskDim.score !== null) {
    const riskPenalty = Math.max(0, (100 - riskDim.score) * 0.25);
    rawScore = Math.max(0, Math.round(rawScore - riskPenalty));
  }

  const activeDimCount = dimResults.activeDimensionCount;
  const dataCompleteness = Math.min(100, Math.round((activeCount / 18) * 100));

  const stance = mapScoreToStance(rawScore, riskScore ?? null, dataCompleteness);

  const confidence: "low" | "medium" | "high" = activeDimCount >= 5 ? "high" : activeDimCount >= 3 ? "medium" : "low";

  const topFactors = getTopFactors(factorScores, 3);
  const bottomFactors = getBottomFactors(factorScores, 3);

  const positiveDrivers: string[] = [];
  const riskDrivers: string[] = [];

  topFactors.forEach((f) => {
    const dimLabel = Object.entries(DIM_LABELS).find(([id]) =>
      dimResults.dimensions.find((d) => d.id === id && d.factors.some((fx) => fx.id === f.id))
    );
    if (dimLabel) positiveDrivers.push(`${dimLabel[1]} (${f.score})`);
  });

  if (riskDim && riskDim.score !== null && riskDim.score < 40) {
    riskDrivers.push("Elevated risk indicators");
  }
  if (factorScores.debt_equity !== null && factorScores.debt_equity < 40) {
    riskDrivers.push("Above-average leverage");
  }
  bottomFactors.forEach((f) => {
    if (f.score < 40 && f.id !== "debt_equity") {
      const label = f.id.replace(/_/g, " ");
      if (!riskDrivers.includes(label)) riskDrivers.push(label);
    }
  });

  const explanationBullets: string[] = [];
  if (rawScore !== null) {
    explanationBullets.push(`Overall research score: ${rawScore}/100 based on ${activeCount} active factors across ${activeDimCount} dimensions.`);
  }
  if (positiveDrivers.length > 0) {
    explanationBullets.push(`Strengths: ${positiveDrivers.slice(0, 3).join(", ")}.`);
  }
  if (riskDrivers.length > 0) {
    explanationBullets.push(`Risks: ${riskDrivers.slice(0, 2).join(", ")}.`);
  }
  if (activeCount < 10) {
    explanationBullets.push("Research context is based on available data.");
  }

  const partialContextNote = activeDimCount < 4 ? "Partial research context" : null;

  return {
    overallScore: rawScore, confidence,
    activeFactorCount: activeCount, plannedFactorCount: TOTAL_PLANNED,
    activeDimensionCount: activeDimCount, totalDimensionCount: dimResults.totalDimensionCount,
    stance, positiveDrivers, riskDrivers,
    explanationBullets: explanationBullets.slice(0, 4),
    partialContextNote,
  };
}

export function computeHealthometerFromResearch(rawData: Record<string, unknown> | null | undefined): {
  quality: number | null; valuation: number | null; growth: number | null;
  stability: number | null; risk: number | null; momentum: number | null;
  financialStrength: number | null;
} {
  if (!rawData) return { quality: null, valuation: null, growth: null, stability: null, risk: null, momentum: null, financialStrength: null };
  const factorScores = computeFactorScores(rawData);
  const dimResults = computeDimensionScores(factorScores);
  const getScore = (id: string): number | null => dimResults.dimensions.find((d) => d.id === id)?.score ?? null;
  return {
    quality: getScore("quality"), valuation: getScore("valuation"), growth: getScore("growth"),
    stability: getScore("stability"), risk: getScore("risk"), momentum: getScore("momentum"),
    financialStrength: getScore("financial_strength"),
  };
}
