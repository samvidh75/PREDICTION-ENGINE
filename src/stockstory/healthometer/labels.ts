import type { HealthometerLabel } from './types';

export function classifyHealthometer(score: number | null, validCount: number, totalCount: number): HealthometerLabel {
  if (score === null || validCount === 0) return 'Not enough information';
  if (validCount < Math.max(2, Math.ceil(totalCount / 3)) && score < 50) return 'Not enough information';
  if (score >= 80) return 'Very healthy';
  if (score >= 65) return 'Healthy';
  if (score >= 45) return 'Stable';
  if (score >= 30) return 'Needs review';
  if (score >= 15) return 'Risk rising';
  return 'Fragile';
}
