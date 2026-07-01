/**
 * Master Engine Configuration
 * 
 * All weights, thresholds, and scoring bands for all 7 engines.
 * Imported by SectorWeightEngine and LensoryEngine.
 */

import { GROWTH_WEIGHTS, GROWTH_FACTOR_ADJUST } from './GrowthWeights';
import type { WeightDefinition } from './GrowthWeights';
import type { BandConfig } from '../scoring/BandScorer';

// ─── Quality Weights ──────────────────────────────────────────────

export const QUALITY_WEIGHTS: WeightDefinition[] = [
  { metric: 'roe', weight: 2.5 },
  { metric: 'roic', weight: 2.5 },
  { metric: 'grossMargin', weight: 2 },
  { metric: 'operatingMargin', weight: 2 },
  { metric: 'efficiency', weight: 1 },
];
export const QUALITY_FACTOR_ADJUST = 0.2;

// ─── Stability Weights ────────────────────────────────────────────

export const STABILITY_WEIGHTS: WeightDefinition[] = [
  { metric: 'debtToEquity', weight: 2.5 },
  { metric: 'currentRatio', weight: 2 },
  { metric: 'volatility', weight: 1.5 },
  { metric: 'coverageRatio', weight: 2 },
  { metric: 'interestCoverage', weight: 2 },
];
export const STABILITY_FACTOR_ADJUST = 0.2;

// ─── Momentum Weights ─────────────────────────────────────────────

export const MOMENTUM_WEIGHTS: WeightDefinition[] = [
  { metric: 'momentumScore', weight: 5 },
  { metric: 'trendScore', weight: 3 },
  { metric: 'volatilityScore', weight: 2 },
];

// ─── Valuation Weights ────────────────────────────────────────────

export const VALUATION_WEIGHTS: WeightDefinition[] = [
  { metric: 'peRatio', weight: 3 },
  { metric: 'pbRatio', weight: 2 },
  { metric: 'evEbitda', weight: 2 },
  { metric: 'fcfYield', weight: 3 },
];
export const VALUATION_FACTOR_ADJUST = 0.2;

// ─── Risk Weights ─────────────────────────────────────────────────

export const RISK_WEIGHTS: WeightDefinition[] = [
  { metric: 'accountingAnomaly', weight: 2.5 },
  { metric: 'cashFlowStress', weight: 3.5 },
  { metric: 'volatilityRisk', weight: 4 },
];

// ─── Re-export Growth ─────────────────────────────────────────────

export { GROWTH_WEIGHTS, GROWTH_FACTOR_ADJUST };
