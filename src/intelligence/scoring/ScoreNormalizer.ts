/**
 * Score Normalizer
 * 
 * Standardises all engine outputs to 0-100 with consistent band definitions.
 * 
 * Bands:
 *   90-100 = Exceptional
 *   75-89  = Strong  
 *   60-74  = Average
 *   45-59  = Weak
 *   0-44   = Poor
 */

export type ScoreBand = 'Exceptional' | 'Strong' | 'Average' | 'Weak' | 'Poor';

export interface NormalizedScore {
  value: number;        // 0-100
  band: ScoreBand;
}

/**
 * Clamp and round a value to 0-100.
 */
export function normalize(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Get the ScoreBand for a given 0-100 value.
 */
export function getBand(value: number): ScoreBand {
  if (value >= 90) return 'Exceptional';
  if (value >= 75) return 'Strong';
  if (value >= 60) return 'Average';
  if (value >= 45) return 'Weak';
  return 'Poor';
}

/**
 * Create a NormalizedScore from a raw value.
 */
export function normalizeScore(value: number): NormalizedScore {
  const v = normalize(value);
  return { value: v, band: getBand(v) };
}

/**
 * Weighted average of scores, with optional normalisation.
 */
export function weightedAverage(
  components: Array<{ score: number; weight: number }>
): number {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 50;
  const avg = components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;
  return normalize(avg);
}

export default { normalize, getBand, normalizeScore, weightedAverage };
