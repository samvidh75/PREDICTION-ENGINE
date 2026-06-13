import { UnifiedClassification } from '../types';

export function classifyScore(score: number | null): UnifiedClassification {
  if (score === null) return 'INSUFFICIENT_DATA';
  if (score >= 80) return 'EXCELLENT';
  if (score >= 65) return 'HEALTHY';
  if (score >= 50) return 'STABLE';
  if (score >= 35) return 'WEAKENING';
  return 'AT_RISK';
}

const LABELS: Record<UnifiedClassification, string> = {
  EXCELLENT: 'Excellent',
  HEALTHY: 'Healthy',
  STABLE: 'Stable',
  WEAKENING: 'Weakening',
  AT_RISK: 'At Risk',
  INSUFFICIENT_DATA: 'Insufficient Data',
};

export function classificationLabel(c: UnifiedClassification): string {
  return LABELS[c];
}

export function classificationThresholds(): Record<UnifiedClassification, { min: number; max: number }> {
  return {
    EXCELLENT: { min: 80, max: 100 },
    HEALTHY: { min: 65, max: 79 },
    STABLE: { min: 50, max: 64 },
    WEAKENING: { min: 35, max: 49 },
    AT_RISK: { min: 0, max: 34 },
    INSUFFICIENT_DATA: { min: -1, max: -1 },
  };
}
