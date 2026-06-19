import { DEFAULT_WEIGHTS, ENGINE_VERSION, MINIMUM_INPUTS_FOR_SCORE, MINIMUM_WEIGHT_FOR_SCORE, validateWeights } from "./scoringMethodology";
import { clampScore } from "../normalization/numericUtils";

export interface ResearchConvictionScore {
  overallScore: number | null;
  conviction: ConvictionLabel;
  confidence: number;
  factorScores: Record<string, number | null>;
  weights: Record<string, number>;
  topContributors: string[];
  topRisks: string[];
  explanation: string | null;
  methodology: string;
}

export type ConvictionLabel =
  | "High conviction research case"
  | "Moderate conviction"
  | "Needs review"
  | "Track before investing"
  | "Research signals pending";

function convictionLabel(score: number | null, confidence: number): ConvictionLabel {
  if (score === null) return "Research signals pending";
  if (score >= 75 && confidence >= 50) return "High conviction research case";
  if (score >= 55) return "Moderate conviction";
  if (score >= 35) return "Needs review";
  return "Track before investing";
}

export function computeResearchConviction(
  factorScores: Record<string, number | null>,
  weights: Record<string, number> = DEFAULT_WEIGHTS,
): ResearchConvictionScore {
  if (!validateWeights(weights)) {
    return {
      overallScore: null, conviction: "Research signals pending", confidence: 0,
      factorScores: {}, weights, topContributors: [], topRisks: [],
      explanation: "Research signals pending due to configuration error.", methodology: ENGINE_VERSION,
    };
  }

  let weightedSum = 0;
  let availableWeight = 0;
  const contributors: Array<{ factor: string; score: number }> = [];

  const entries = Object.entries(factorScores).filter(([key]) => key in weights);

  for (const [factor, score] of entries) {
    const w = weights[factor] ?? 0;
    if (w === 0) continue;
    if (score !== null) {
      weightedSum += score * w;
      availableWeight += w;
      contributors.push({ factor, score });
    }
  }

  const allNull = entries.every(([, s]) => s === null);
  if (allNull) {
    return {
      overallScore: null, conviction: "Research signals pending", confidence: 0,
      factorScores, weights, topContributors: [], topRisks: [],
      explanation: "Research signals pending — insufficient data to generate a research case.",
      methodology: ENGINE_VERSION,
    };
  }

  const presentCount = Object.values(factorScores).filter(s => s !== null).length;
  if (presentCount < MINIMUM_INPUTS_FOR_SCORE || availableWeight < MINIMUM_WEIGHT_FOR_SCORE) {
    return {
      overallScore: null, conviction: "Research signals pending", confidence: 0,
      factorScores, weights, topContributors: [], topRisks: [],
      explanation: "Research signals pending — not enough data inputs for a reliable research case.",
      methodology: ENGINE_VERSION,
    };
  }

  const overallScore = clampScore(weightedSum / availableWeight);
  const confidence = Math.round((availableWeight / Object.keys(weights).reduce((s, k) => s + weights[k], 0)) * 100);

  const sorted = [...contributors].sort((a, b) => b.score - a.score);
  const topContributors = sorted.slice(0, 3).map(c => {
    const labels: Record<string, string> = { quality: "Quality", valuation: "Valuation", growth: "Growth", risk: "Risk context", momentum: "Momentum", stability: "Stability" };
    return `${labels[c.factor] ?? c.factor} is a key contributor`;
  });

  const topRisks = sorted.slice(-2).filter(c => c.score < 40).map(c => {
    const labels: Record<string, string> = { quality: "Quality concerns", valuation: "Valuation context", growth: "Growth concerns", risk: "Risk profile", momentum: "Momentum weakness", stability: "Stability concerns" };
    return labels[c.factor] ?? `${c.factor} needs review`;
  });

  const explanation = topContributors.length > 0
    ? `Research case driven by ${topContributors[0].toLowerCase()}.`
    : null;

  return { overallScore, conviction: convictionLabel(overallScore, confidence), confidence, factorScores, weights, topContributors, topRisks, explanation, methodology: ENGINE_VERSION };
}
