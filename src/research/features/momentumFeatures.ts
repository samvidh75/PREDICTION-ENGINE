import type { NormalizedCandle } from "../normalization/types";

export interface MomentumFeatures {
  priceTrendScore: number | null;
  relativeStrengthScore: number | null;
  shortTermScore: number | null;
  mediumTermScore: number | null;
  overallMomentum: number | null;
  confidence: number;
  missingInputs: string[];
}

/**
 * Score a trailing price change into a 0-100 bucket using consistent,
 * monotonic thresholds. `wide` selects horizon-appropriate bands:
 * short horizons (≈1 week) use tight bands around 0, longer horizons
 * (≈1 quarter) need wider bands to avoid collapsing everything into a
 * single bucket on ordinary moves.
 */
function bucketChange(changePct: number, wide: boolean): number {
  if (wide) {
    if (changePct >= 25) return 80;
    if (changePct >= 8) return 65;
    if (changePct >= 0) return 50;
    if (changePct >= -25) return 35;
    return 20;
  }
  if (changePct >= 10) return 80;
  if (changePct >= 5) return 65;
  if (changePct >= 0) return 50;
  if (changePct >= -10) return 35;
  return 20;
}

/**
 * Compute the trailing `window`-bar percentage change, measuring the most
 * recent `window` closes against the `window` closes immediately before
 * them. Returns null when there aren't enough bars to define the window.
 */
function windowChange(sorted: NormalizedCandle[], window: number): number | null {
  if (sorted.length < window * 2) return null;
  const start = sorted.length - window;
  const base = sorted[start - 1].close;
  if (base <= 0) return null;
  const last = sorted[sorted.length - 1].close;
  return ((last - base) / base) * 100;
}

export function computeMomentumFeatures(
  candles: NormalizedCandle[],
  relativeStrength: number | null,
): MomentumFeatures {
  const missing: string[] = [];
  if (candles.length < 5) missing.push("priceHistory");
  if (candles.length < 62) missing.push("mediumTermHistory");
  if (relativeStrength === null) missing.push("relativeStrength");

  const sorted = [...candles].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 20-day price trend (existing signal — unchanged thresholds/behavior).
  let priceTrendScore: number | null = null;
  const trendChange = windowChange(sorted, 20);
  if (trendChange !== null) priceTrendScore = bucketChange(trendChange, false);

  // Short-term (≈1 week) momentum — recently added, was previously always null.
  let shortTermScore: number | null = null;
  const shortChange = windowChange(sorted, 5);
  if (shortChange !== null) shortTermScore = bucketChange(shortChange, false);

  // Medium-term (≈1 quarter) momentum — recently added, was previously always null.
  let mediumTermScore: number | null = null;
  const mediumChange = windowChange(sorted, 60);
  if (mediumChange !== null) mediumTermScore = bucketChange(mediumChange, true);

  let relativeStrengthScore: number | null = null;
  if (relativeStrength !== null) {
    relativeStrengthScore = relativeStrength >= 70 ? 80 : relativeStrength >= 55 ? 65 : relativeStrength >= 45 ? 50 : relativeStrength >= 30 ? 35 : 20;
  }

  const present = [priceTrendScore, shortTermScore, mediumTermScore, relativeStrengthScore].filter((s): s is number => s !== null).length;
  const total = 4;
  const confidence = Math.round((present / total) * 100);

  const scores = [priceTrendScore, shortTermScore, mediumTermScore, relativeStrengthScore].filter((s): s is number => s !== null);
  const overallMomentum = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return { priceTrendScore, relativeStrengthScore, shortTermScore, mediumTermScore, overallMomentum, confidence, missingInputs: missing };
}
