import type { NormalizedFundamentals } from "../normalization/types";

export interface StabilityFeatures {
  scoreVariability: number | null;
  earningsStability: number | null;
  priceStability: number | null;
  overallStability: number | null;
  confidence: number;
  missingInputs: string[];
}

export function computeStabilityFeatures(
  f: NormalizedFundamentals,
  qualityScore: number | null,
  growthScore: number | null,
): StabilityFeatures {
  const missing: string[] = [];
  if (qualityScore === null && growthScore === null) missing.push("factorScores");
  if (f.profitGrowth === null && f.revenueGrowth === null) missing.push("earningsHistory");

  let scoreVariability: number | null = null;
  if (qualityScore !== null && growthScore !== null) {
    const diff = Math.abs(qualityScore - growthScore);
    scoreVariability = diff <= 10 ? 80 : diff <= 20 ? 60 : diff <= 35 ? 40 : 20;
  }

  let earningsStability: number | null = null;
  if (f.profitGrowth !== null && f.revenueGrowth !== null) {
    const diff = Math.abs(f.profitGrowth - f.revenueGrowth);
    earningsStability = diff <= 5 ? 80 : diff <= 15 ? 60 : diff <= 30 ? 40 : 20;
  } else if (f.profitGrowth !== null) {
    earningsStability = 50;
  }

  let overallStability: number | null = null;
  const scores = [scoreVariability, earningsStability].filter((s): s is number => s !== null);
  if (scores.length >= 1) {
    overallStability = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  const present = [qualityScore, growthScore, f.profitGrowth, f.revenueGrowth].filter(v => v !== null).length;
  const confidence = Math.round((present / 4) * 100);

  return { scoreVariability, earningsStability, priceStability: null, overallStability, confidence, missingInputs: missing };
}
