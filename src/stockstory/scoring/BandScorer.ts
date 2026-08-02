/**
 * Band Scorer
 * 
 * Maps a raw metric value to a 0-100 score using configurable scoring bands.
 * Replaces hardcoded if-else chains in engines.
 */

import { normalize } from './ScoreNormalizer';

export interface ScoreBand {
  /** Upper bound of this band (exclusive, except for the top band which is inclusive) */
  threshold: number;
  /** Score assigned when value falls in this band */
  score: number;
}

export interface BandConfig {
  /** Bands must be sorted by threshold ascending */
  bands: ScoreBand[];
  /** Score when value is below the lowest band threshold */
  belowMin: number;
  /** Score to use when value is null/undefined */
  nullScore: number;
}

/**
 * Score a value against a set of bands.
 * Bands are checked in order — first band where value < threshold wins.
 * If value >= all thresholds, the last band's score is used.
 */
export function scoreBands(value: number | null | undefined, config: BandConfig): number {
  if (value === null || value === undefined) return config.nullScore;

  for (const band of config.bands) {
    if (value < band.threshold) return band.score;
  }
  // Above all thresholds — use last band's score
  return config.bands[config.bands.length - 1].score;
}

/**
 * Score a value where lower = better (e.g., PE, PB, D/E).
 * Bands are checked in order — first band where value >= threshold wins.
 * Last band score is the penalty for the highest range.
 */
export function scoreBandsDescending(
  value: number | null | undefined,
  config: BandConfig
): number {
  if (value === null || value === undefined) return config.nullScore;

  for (const band of config.bands) {
    if (value >= band.threshold) return band.score;
  }
  return config.belowMin;
}

/**
 * Score a value against paired ranges (e.g., RSI where 55-65 is ideal).
 * Each range is [min, max] inclusive with an associated score.
 * First matching range wins. If none match, returns nullScore.
 */
export interface RangeScore {
  min: number;
  max: number;
  score: number;
}

export function scoreRanges(
  value: number | null | undefined,
  ranges: RangeScore[],
  nullScore: number = 50
): number {
  if (value === null || value === undefined) return nullScore;

  for (const range of ranges) {
    if (value >= range.min && value <= range.max) return range.score;
  }
  return nullScore;
}
