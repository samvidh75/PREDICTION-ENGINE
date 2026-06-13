import { UnifiedFactorScore } from '../types';

export const COMPOSITE_WEIGHTS: Record<string, number> = {
  quality: 0.20,
  valuation: 0.15,
  growth: 0.20,
  stability: 0.10,
  momentum: 0.15,
  risk: 0.00,
  sector: 0.05,
  liquidity: 0.05,
  ownership: 0.05,
  events: 0.00,
  dataQuality: 0.10,
};

export interface CompositeResult {
  baseScore: number | null;
  riskDampening: number;
  rankingScore: number | null;
  availableWeight: number;
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function computeCompositeScore(factorScores: UnifiedFactorScore[]): CompositeResult {
  const additiveGroups = factorScores.filter(
    (fs) => fs.group !== 'risk' && fs.group !== 'events'
  );

  const totalExpectedWeight = additiveGroups.reduce(
    (sum, fs) => sum + (COMPOSITE_WEIGHTS[fs.group] ?? 0),
    0
  );

  let weightedSum = 0;
  let availableWeightSum = 0;

  for (const fs of additiveGroups) {
    const w = COMPOSITE_WEIGHTS[fs.group] ?? 0;
    if (w === 0) continue;
    if (fs.value !== null) {
      weightedSum += fs.value * w;
      availableWeightSum += w;
    }
  }

  const baseScore =
    availableWeightSum > 0
      ? clampScore(weightedSum / availableWeightSum)
      : null;

  const availableWeight =
    totalExpectedWeight > 0 ? availableWeightSum / totalExpectedWeight : 0;

  const riskFactor = factorScores.find((fs) => fs.group === 'risk');
  let riskDampening = 0;
  if (riskFactor && riskFactor.value !== null) {
    const riskPenalty = 100 - riskFactor.value;
    riskDampening = Math.max(0, (riskPenalty - 15) * 0.45);
  }

  const rankingScore =
    baseScore !== null ? clampScore(baseScore - riskDampening) : null;

  return { baseScore, riskDampening, rankingScore, availableWeight };
}
