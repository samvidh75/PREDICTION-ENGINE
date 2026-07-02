import type { NormalizedFundamentals } from "../normalization/types";
import { mean } from "@/utils/statisticalUtils";

export interface QualityFeatures {
  profitabilityScore: number | null;
  marginScore: number | null;
  efficiencyScore: number | null;
  balanceSheetScore: number | null;
  overallQuality: number | null;
  confidence: number;
  missingInputs: string[];
}

export function computeQualityFeatures(f: NormalizedFundamentals): QualityFeatures {
  const missing: string[] = [];
  if (f.roe === null && f.roa === null) missing.push("roe/roa");
  if (f.grossMargin === null && f.operatingMargin === null) missing.push("margins");
  if (f.debtToEquity === null && f.currentRatio === null) missing.push("balanceSheet");

  let profitabilityScore: number | null = null;
  if (f.roe !== null) {
    profitabilityScore = f.roe >= 20 ? 85 : f.roe >= 15 ? 70 : f.roe >= 10 ? 55 : f.roe >= 0 ? 40 : 15;
  }
  if (f.roa !== null && profitabilityScore !== null) {
    const roaScore = f.roa >= 10 ? 85 : f.roa >= 7 ? 70 : f.roa >= 4 ? 55 : f.roa >= 0 ? 40 : 15;
    profitabilityScore = Math.round((profitabilityScore + roaScore) / 2);
  } else if (f.roa !== null) {
    profitabilityScore = f.roa >= 10 ? 85 : f.roa >= 7 ? 70 : f.roa >= 4 ? 55 : f.roa >= 0 ? 40 : 15;
  }

  let marginScore: number | null = null;
  if (f.grossMargin !== null && f.operatingMargin !== null) {
    const gm = f.grossMargin >= 50 ? 85 : f.grossMargin >= 30 ? 70 : f.grossMargin >= 15 ? 55 : 30;
    const om = f.operatingMargin >= 20 ? 85 : f.operatingMargin >= 10 ? 70 : f.operatingMargin >= 5 ? 55 : 25;
    marginScore = Math.round((gm + om) / 2);
  } else if (f.grossMargin !== null) {
    marginScore = f.grossMargin >= 50 ? 85 : f.grossMargin >= 30 ? 70 : f.grossMargin >= 15 ? 55 : 30;
  } else if (f.operatingMargin !== null) {
    marginScore = f.operatingMargin >= 20 ? 85 : f.operatingMargin >= 10 ? 70 : f.operatingMargin >= 5 ? 55 : 25;
  }

  let balanceSheetScore: number | null = null;
  if (f.debtToEquity !== null) {
    balanceSheetScore = f.debtToEquity <= 0.3 ? 85 : f.debtToEquity <= 0.7 ? 70 : f.debtToEquity <= 1.5 ? 50 : 25;
  }

  const present = [f.roe, f.roa, f.grossMargin, f.operatingMargin, f.debtToEquity].filter(v => v !== null).length;
  const confidence = Math.round((present / 5) * 100);

  const scores = [profitabilityScore, marginScore, balanceSheetScore].filter((s): s is number => s !== null);
  const overallQuality = scores.length >= 2 ? mean(scores) : null;

  return { profitabilityScore, marginScore, efficiencyScore: null, balanceSheetScore, overallQuality, confidence, missingInputs: missing };
}
