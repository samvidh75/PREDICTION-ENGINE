/**
 * Percentile Engine
 * 
 * Computes percentile rank, z-score, and score mapping for numeric values.
 * Supports both raw arrays and pre-computed distribution objects.
 */

import { normalize, getBand, type ScoreBand } from './ScoreNormalizer';

// ─── Distribution ─────────────────────────────────────────────────

export interface Distribution {
  /** Pre-sorted values in ascending order */
  values: number[];
  /** Count of values */
  count: number;
  /** Mean */
  mean: number;
  /** Standard deviation (population) */
  stdDev: number;
  /** Percentile boundaries: P10, P25, P50, P75, P90 */
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

// ─── Score Mapping ────────────────────────────────────────────────

export interface PercentileScoreMap {
  p90: number;  // Score at 90th percentile
  p75: number;  // Score at 75th percentile
  p50: number;  // Score at 50th percentile
  p25: number;  // Score at 25th percentile
  p10: number;  // Score at 10th percentile
  below: number; // Score below 10th percentile
}

/** Standard score map — higher percentile = higher score */
export const STANDARD_SCORE_MAP: PercentileScoreMap = {
  p90: 95,
  p75: 85,
  p50: 65,
  p25: 45,
  p10: 30,
  below: 15,
};

/** Inverse score map — lower percentile = higher score (for D/E, PE, volatility) */
export const INVERSE_SCORE_MAP: PercentileScoreMap = {
  p90: 95,
  p75: 85,
  p50: 65,
  p25: 45,
  p10: 30,
  below: 15,
};

// ─── Engine ───────────────────────────────────────────────────────

export class PercentileEngine {
  /**
   * Build a Distribution from raw values.
   */
  static buildDistribution(values: number[]): Distribution {
    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const mean = count > 0 ? sorted.reduce((s, v) => s + v, 0) / count : 0;
    const variance =
      count > 1
        ? sorted.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / count
        : 0;
    const stdDev = Math.sqrt(variance);

    const percentileAt = (p: number) => {
      if (count === 0) return 0;
      const idx = Math.ceil((p / 100) * count) - 1;
      return sorted[Math.max(0, Math.min(count - 1, idx))];
    };

    return {
      values: sorted,
      count,
      mean,
      stdDev,
      percentiles: {
        p10: percentileAt(10),
        p25: percentileAt(25),
        p50: percentileAt(50),
        p75: percentileAt(75),
        p90: percentileAt(90),
      },
    };
  }

  /**
   * Compute percentile rank (0-1) for a value in a distribution.
   */
  static percentileRank(value: number, distribution: Distribution): number {
    if (distribution.count === 0) return 0.5;
    // Count how many values are <= this value
    let countBelow = 0;
    for (const v of distribution.values) {
      if (v <= value) countBelow++;
    }
    return countBelow / distribution.count;
  }

  /**
   * Compute z-score for a value.
   */
  static zScore(value: number, distribution: Distribution): number {
    if (distribution.stdDev === 0) return 0;
    return (value - distribution.mean) / distribution.stdDev;
  }

  /**
   * Score a value using percentile rank and a score map.
   * Higher percentile = higher score.
   */
  static scoreByPercentile(
    value: number | null | undefined,
    distribution: Distribution,
    scoreMap: PercentileScoreMap = STANDARD_SCORE_MAP
  ): number {
    if (value === null || value === undefined || distribution.count === 0) return 50;

    const rank = this.percentileRank(value, distribution);

    if (rank >= 0.90) return scoreMap.p90;
    if (rank >= 0.75) return scoreMap.p75;
    if (rank >= 0.50) return scoreMap.p50;
    if (rank >= 0.25) return scoreMap.p25;
    if (rank >= 0.10) return scoreMap.p10;
    return scoreMap.below;
  }

  /**
   * Score a value using inverse percentile rank.
   * Lower percentile (i.e., value is lower than peers) = higher score.
   * Use for: D/E, PE, PB, volatility where lower is better.
   */
  static scoreByPercentileInverse(
    value: number | null | undefined,
    distribution: Distribution,
    scoreMap: PercentileScoreMap = INVERSE_SCORE_MAP
  ): number {
    if (value === null || value === undefined || distribution.count === 0) return 50;

    // Invert: low value = high rank
    const rank = 1 - this.percentileRank(value, distribution);

    if (rank >= 0.90) return scoreMap.p90;
    if (rank >= 0.75) return scoreMap.p75;
    if (rank >= 0.50) return scoreMap.p50;
    if (rank >= 0.25) return scoreMap.p25;
    if (rank >= 0.10) return scoreMap.p10;
    return scoreMap.below;
  }

  /**
   * Get the percentile band label for a value.
   */
  static getPercentileBand(value: number, distribution: Distribution): ScoreBand {
    const rank = this.percentileRank(value, distribution);
    if (rank >= 0.90) return 'Exceptional';
    if (rank >= 0.75) return 'Strong';
    if (rank >= 0.50) return 'Average';
    if (rank >= 0.25) return 'Weak';
    return 'Poor';
  }
}

export default PercentileEngine;
