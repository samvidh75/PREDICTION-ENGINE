import type { NormalizedFundamentals } from "../normalization/types";

export interface GrowthFeatures {
  revenueGrowthScore: number | null;
  profitGrowthScore: number | null;
  epsGrowthScore: number | null;
  overallGrowth: number | null;
  confidence: number;
  missingInputs: string[];
}

export function computeGrowthFeatures(f: NormalizedFundamentals): GrowthFeatures {
  const missing: string[] = [];
  if (f.revenueGrowth === null) missing.push("revenueGrowth");
  if (f.profitGrowth === null) missing.push("profitGrowth");

  let revenueGrowthScore: number | null = null;
  if (f.revenueGrowth !== null) {
    revenueGrowthScore = f.revenueGrowth >= 20 ? 85 : f.revenueGrowth >= 10 ? 70 : f.revenueGrowth >= 5 ? 55 : f.revenueGrowth >= 0 ? 40 : 15;
  }

  let profitGrowthScore: number | null = null;
  if (f.profitGrowth !== null) {
    profitGrowthScore = f.profitGrowth >= 20 ? 85 : f.profitGrowth >= 10 ? 70 : f.profitGrowth >= 5 ? 55 : f.profitGrowth >= 0 ? 40 : 15;
  }

  let epsGrowthScore: number | null = null;
  if (f.epsGrowth !== null) {
    epsGrowthScore = f.epsGrowth >= 20 ? 85 : f.epsGrowth >= 10 ? 70 : f.epsGrowth >= 5 ? 55 : f.epsGrowth >= 0 ? 40 : 15;
  }

  const present = [f.revenueGrowth, f.profitGrowth, f.epsGrowth].filter(v => v !== null).length;
  const confidence = Math.round((present / 3) * 100);

  let overallGrowth: number | null = null;
  const scores = [revenueGrowthScore, profitGrowthScore, epsGrowthScore].filter((s): s is number => s !== null);
  if (scores.length >= 1) {
    overallGrowth = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return { revenueGrowthScore, profitGrowthScore, epsGrowthScore, overallGrowth, confidence, missingInputs: missing };
}
