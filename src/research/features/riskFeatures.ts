import type { NormalizedFundamentals } from "../normalization/types";

export interface RiskFeatures {
  leverageScore: number | null;
  volatilityScore: number | null;
  earningsRiskScore: number | null;
  liquidityScore: number | null;
  overallRisk: number | null;
  riskFlags: string[];
  confidence: number;
  missingInputs: string[];
}

export function computeRiskFeatures(f: NormalizedFundamentals, beta: number | null): RiskFeatures {
  const missing: string[] = [];
  const flags: string[] = [];

  if (f.debtToEquity === null) missing.push("debtToEquity");
  if (f.netProfit === null && f.eps === null) missing.push("earnings");

  let leverageScore: number | null = null;
  if (f.debtToEquity !== null) {
    leverageScore = f.debtToEquity <= 0.3 ? 85 : f.debtToEquity <= 0.7 ? 70 : f.debtToEquity <= 1.5 ? 50 : f.debtToEquity <= 3 ? 30 : 10;
    if (f.debtToEquity > 2) flags.push("High leverage");
  }

  let volatilityScore: number | null = null;
  if (beta !== null) {
    volatilityScore = beta <= 0.8 ? 80 : beta <= 1.2 ? 60 : beta <= 1.5 ? 40 : 20;
    if (beta > 1.5) flags.push("High volatility");
  }

  let earningsRiskScore: number | null = null;
  if (f.netProfit !== null) {
    earningsRiskScore = f.netProfit > 0 ? 70 : 15;
    if (f.netProfit <= 0) flags.push("Negative earnings");
  }
  if (f.eps !== null && earningsRiskScore !== null) {
    if (f.eps <= 0) flags.push("Negative EPS");
  }

  let liquidityScore: number | null = null;
  if (f.currentRatio !== null) {
    liquidityScore = f.currentRatio >= 2 ? 80 : f.currentRatio >= 1.2 ? 60 : f.currentRatio >= 0.8 ? 40 : 20;
    if (f.currentRatio < 0.8) flags.push("Low liquidity");
  }

  const present = [f.debtToEquity, beta, f.netProfit, f.currentRatio].filter(v => v !== null).length;
  const confidence = Math.round((present / 4) * 100);

  let overallRisk: number | null = null;
  const scores = [leverageScore, volatilityScore, earningsRiskScore, liquidityScore].filter((s): s is number => s !== null);

  if (scores.length >= 2) {
    overallRisk = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return { leverageScore, volatilityScore, earningsRiskScore, liquidityScore, overallRisk, riskFlags: flags, confidence, missingInputs: missing };
}
