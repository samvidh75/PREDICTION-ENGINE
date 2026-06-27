import { clampScore } from '@/types';
import { UnifiedConfidenceLevel } from '../types';

export interface ConfidenceResult {
  score: number;
  level: UnifiedConfidenceLevel;
  breakdown: {
    completenessScore: number;
    freshnessScore: number;
    providerConfidence: number;
  };
}

export function computeConfidence(
  completeness: number,
  staleCount: number,
  totalFeatureCount: number,
  sourceConfidence: number,
  maxStaleThreshold: number
): ConfidenceResult {
  const completenessScore = clampScore(completeness);

  const staleRatio = totalFeatureCount > 0 ? staleCount / totalFeatureCount : 0;
  const freshnessScore = clampScore(Math.max(0, 100 - staleRatio / 0.01 * (100 / maxStaleThreshold)));

  const providerConfidence = clampScore(sourceConfidence);

  const rawScore = completenessScore * 0.40 + freshnessScore * 0.35 + providerConfidence * 0.25;
  const score = clampScore(rawScore);

  let level: UnifiedConfidenceLevel;
  if (score >= 80) level = 'HIGH';
  else if (score >= 60) level = 'MEDIUM';
  else if (score >= 40) level = 'LOW';
  else level = 'CRITICAL';

  return {
    score,
    level,
    breakdown: { completenessScore, freshnessScore, providerConfidence },
  };
}
