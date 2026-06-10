/**
 * Shared types for intelligence scoring engines.
 * Extracted from the scoring engines' common import patterns.
 */

// ── Engine Inputs ──────────────────────────────────────────────

export interface FinancialData {
  roe: number | null;
  roa: number | null;
  roic: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  evEbitda: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  operatingMargin: number | null;
  grossMargin: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  fcfGrowth: number | null;
  profitGrowth: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  beta: number | null;
  marketCap: number | null;
  freeFloat: number | null;
  eps: number | null;
  [key: string]: number | null | undefined;
}

export interface FactorData {
  qualityFactor: number;
  valueFactor: number;
  growthFactor: number;
  momentumFactor: number;
  riskFactor: number;
  factorScore: number;
}

export interface FeatureData {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  adx: number | null;
  atr: number | null;
  volatility: number | null;
  trendStrength: number | null;
}

export interface SectorInfo {
  name: string;
  [key: string]: unknown;
}

export interface HistoricalEntry {
  rsi: number | null;
  volatility: number | null;
  riskFactor: number;
  factorScore: number;
}

export interface HistoricalData {
  featureHistory?: HistoricalEntry[];
  factorHistory?: HistoricalEntry[];
}

export interface EngineInputs {
  financials: FinancialData;
  features: FeatureData;
  factors: FactorData;
  sector?: SectorInfo;
  historical?: HistoricalData;
}

// ── Engine Output Types ────────────────────────────────────────

export interface GrowthEngineOutput {
  score: number;
  revenueGrowth: number;
  epsGrowth: number;
  fcfGrowth: number;
  profitGrowth: number;
  commentary: string;
}

export interface QualityEngineOutput {
  score: number;
  roa: number;
  roe: number;
  roic: number;
  grossMargin: number;
  operatingMargin: number;
  efficiencyScore: number;
  commentary: string;
}

export interface StabilityEngineOutput {
  score: number;
  debtScore: number;
  cashScore: number;
  volatilityScore: number;
  coverageScore: number;
  marketCapSizeScore: number;
  commentary: string;
}

export interface MomentumEngineOutput {
  score: number;
  momentumScore: number;
  trendScore: number;
  volatilityScore: number;
  commentary: string;
}

export interface ValuationEngineOutput {
  score: number;
  peScore: number;
  pbScore: number;
  evEbitdaScore: number;
  fcfYieldScore: number;
  dividendYieldScore: number;
  commentary: string;
}

export interface RiskEngineOutput {
  score: number;
  accountingAnomalyScore: number;
  debtStressScore: number;
  cashFlowStressScore: number;
  volatilityRiskScore: number;
  redFlagCount: number;
  commentary: string;
}

export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export interface ConfidenceEngineOutput {
  level: ConfidenceLevel;
  score: number;
  dataCompleteness: number;
  signalAgreement: number;
  riskConsistency: number;
  historicalStability: number;
  commentary: string;
}

// ── Utility Functions ──────────────────────────────────────────

/** Clamp a score to 0–100 range. */
export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Weighted average of scored items. */
export function weightedAverage(
  items: Array<{ score: number; weight: number }>
): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 50;
  const weightedSum = items.reduce((sum, item) => sum + item.score * item.weight, 0);
  return weightedSum / totalWeight;
}

/** Score mapping for standard (higher-is-better) metrics. */
export const STANDARD_SCORE_MAP = [
  { percentile: 95, score: 95 },
  { percentile: 80, score: 80 },
  { percentile: 60, score: 65 },
  { percentile: 40, score: 50 },
  { percentile: 20, score: 35 },
  { percentile: 5, score: 15 },
] as const;

/** Score mapping for inverse (lower-is-better) metrics. */
export const INVERSE_SCORE_MAP = [
  { percentile: 95, score: 15 },
  { percentile: 80, score: 35 },
  { percentile: 60, score: 50 },
  { percentile: 40, score: 65 },
  { percentile: 20, score: 80 },
  { percentile: 5, score: 95 },
] as const;
