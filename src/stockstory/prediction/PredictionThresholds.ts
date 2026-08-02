/**
 * PredictionThresholds.ts
 *
 * Centralized prediction score thresholds and classification mappings.
 * These thresholds are currently heuristic and remain unadjusted due to
 * insufficient validated outcome sample size during the last calibration cycle.
 */

export const PREDICTION_THRESHOLDS = {
  EXCELLENT: 80,
  HEALTHY: 65,
  STABLE: 50,
  WEAKENING: 35,
};

export type PredictionClassification =
  | 'Excellent'
  | 'Healthy'
  | 'Stable'
  | 'Weakening'
  | 'At Risk';

/**
 * Maps a numeric ranking/health score to a classification label.
 */
export function classifyScore(score: number | null): PredictionClassification {
  if (score === null) return 'At Risk';
  if (score >= PREDICTION_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (score >= PREDICTION_THRESHOLDS.HEALTHY) return 'Healthy';
  if (score >= PREDICTION_THRESHOLDS.STABLE) return 'Stable';
  if (score >= PREDICTION_THRESHOLDS.WEAKENING) return 'Weakening';
  return 'At Risk';
}
