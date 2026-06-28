/**
 * StockStory Intelligence — Shared Scoring Utilities
 *
 * Standardised helpers every engine uses:
 *   - clampScore        bound a value to [0, 100]
 *   - toScoreBand       map a 0–100 number → label
 *   - weightedAverage   weighted mean with variance
 *   - zScoreToScore     convert a z-score to 0–100
 *   - percentileToScore map a 0–1 rank to 0–100
 *   - confidenceWeight  compute weight based on data availability
 *   - gradeNumeric      bucket a raw number → 0–100
 *   - linearScale       map a domain range → [0, 100]
 */

import type { ScoreBand } from './types';

/** Clamp a number to the closed interval [0, 100] and round. */
export function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.max(0, Math.min(100, n)));
}

/** Map a 0–100 score to a qualitative band. */
export function toScoreBand(score: number): ScoreBand {
  const s = clampScore(score);
  if (s >= 80) return 'excellent';
  if (s >= 60) return 'good';
  if (s >= 40) return 'fair';
  if (s >= 20) return 'poor';
  return 'critical';
}

/** Weighted average with optional variance tracking. */
export function weightedAverage(
  values: number[],
  weights: number[]
): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  const sum = values.reduce((acc, v, i) => acc + v * weights[i], 0);
  return sum / totalWeight;
}

/** Convert a z-score to a 0–100 scale (assumes normality). */
export function zScoreToScore(z: number): number {
  // Standard normal CDF approximation
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return clampScore(cdf * 100);
}

/** Convert a percentile rank (0–1) to 0–100. */
export function percentileToScore(p: number): number {
  return clampScore(p * 100);
}

/** Compute a confidence multiplier (0–1) from the fraction of non-null fields. */
export function confidenceWeight(
  values: (number | null | undefined)[],
  requiredCount: number
): number {
  const present = values.filter(
    (v) => v !== null && v !== undefined && Number.isFinite(v)
  ).length;
  const ratio = requiredCount > 0 ? present / requiredCount : 1;
  return Math.min(1, ratio);
}

/**
 * Grade a numeric value against sector-normal thresholds.
 *
 * @param raw       The value to grade
 * @param ranges    Ordered [min, max, score] thresholds
 *                  First match wins (high to low).
 */
export function gradeNumeric(
  raw: number | null | undefined,
  ranges: Array<[number, number, number]> // [lower, upper, score]
): number {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return 0;
  for (const [low, high, score] of ranges) {
    if (raw >= low && raw < high) return clampScore(score);
  }
  return 0;
}

/**
 * Linearly map a raw value from [domainMin, domainMax] to [0, 100].
 * Values outside the domain are clamped to 0 or 100.
 */
export function linearScale(
  raw: number | null | undefined,
  domainMin: number,
  domainMax: number,
  invert: boolean = false
): number {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return 0;
  const clamped = Math.max(domainMin, Math.min(domainMax, raw));
  let ratio = (clamped - domainMin) / (domainMax - domainMin);
  if (invert) ratio = 1 - ratio;
  return clampScore(ratio * 100);
}

/** Helper: safely convert a DB value to a finite number or null. */
export function toFinite(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// ----- Private helpers -----

function erf(x: number): number {
  // Abramowitz & Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
