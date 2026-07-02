import type { NormalizedCandle } from "../normalization/types";
import { mean } from "@/utils/statisticalUtils";

export interface MomentumFeatures {
  priceTrendScore: number | null;
  relativeStrengthScore: number | null;
  shortTermScore: number | null;
  mediumTermScore: number | null;
  overallMomentum: number | null;
  confidence: number;
  missingInputs: string[];
}

export function computeMomentumFeatures(
  candles: NormalizedCandle[],
  relativeStrength: number | null,
): MomentumFeatures {
  const missing: string[] = [];
  if (candles.length < 5) missing.push("priceHistory");
  if (relativeStrength === null) missing.push("relativeStrength");

  let priceTrendScore: number | null = null;
  if (candles.length >= 5) {
    const sorted = [...candles].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sorted.slice(-20);
    if (recent.length >= 5) {
      const firstClose = recent[0].close;
      const lastClose = recent[recent.length - 1].close;
      const change = ((lastClose - firstClose) / firstClose) * 100;
      priceTrendScore = change >= 10 ? 80 : change >= 5 ? 65 : change >= 0 ? 50 : change >= -10 ? 35 : 20;
    }
  }

  let relativeStrengthScore: number | null = null;
  if (relativeStrength !== null) {
    relativeStrengthScore = relativeStrength >= 70 ? 80 : relativeStrength >= 55 ? 65 : relativeStrength >= 45 ? 50 : relativeStrength >= 30 ? 35 : 20;
  }

  const present = [candles.length >= 5 ? 1 : null, relativeStrength].filter(v => v !== null).length;
  const confidence = Math.round((present / 2) * 100);

  const scores = [priceTrendScore, relativeStrengthScore].filter((s): s is number => s !== null);
  const overallMomentum = mean(scores);

  return { priceTrendScore, relativeStrengthScore, shortTermScore: null, mediumTermScore: null, overallMomentum, confidence, missingInputs: missing };
}
