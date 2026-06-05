/**
 * StockStory Engine — Shared Types
 * 
 * Output contract for every company page:
 * {
 *   healthScore, classification, confidence, growth, quality,
 *   stability, valuation, momentum, risk, narrative
 * }
 */

// ─── Classification ───────────────────────────────────────────────

export type CompanyClassification = 'Excellent' | 'Healthy' | 'Stable' | 'Weakening' | 'At Risk';

export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low';

// ─── Individual Engine Inputs ─────────────────────────────────────

export interface EngineInputs {
  symbol: string;
  tradeDate: string;

  // Feature snapshots (from FeatureEngine / feature_snapshots table)
  features: {
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    adx: number | null;
    atr: number | null;
    bollingerWidth: number | null;
    momentum: number | null;
    volatility: number | null;
    relativeStrength: number | null;
    movingAverageDistance: number | null;
    trendStrength: number | null;
  };

  // Factor snapshots (from FactorEngine / factor_snapshots table)
  factors: {
    qualityFactor: number;
    valueFactor: number;
    growthFactor: number;
    momentumFactor: number;
    riskFactor: number;
    sectorStrengthFactor: number;
    factorScore: number;
  };

  // Financial data
  financials: {
    peRatio: number | null;
    pbRatio: number | null;
    eps: number | null;
    dividendYield: number | null;
    beta: number | null;
    marketCap: number | null;
    freeFloat: number | null;
    fcfYield: number | null;
    evEbitda: number | null;
    roe: number | null;
    roic: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    fcfGrowth: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
  };

  // Historical data for trend analysis
  historical?: {
    featureHistory?: Array<{ tradeDate: string; rsi: number; macdHistogram: number; adx: number; volatility: number }>;
    factorHistory?: Array<{ tradeDate: string; factorScore: number; qualityFactor: number; riskFactor: number; growthFactor: number }>;
    priceHistory?: Array<{ tradeDate: string; close: number }>;
  };

  // Sector context
  sector?: {
    name: string;
    sectorStrength: number;
    sectorMomentum: 'Accelerating' | 'Steady' | 'Decelerating';
  };
}

// ─── Individual Engine Outputs ────────────────────────────────────

export interface GrowthEngineOutput {
  score: number;        // 0-100
  revenueGrowth: number;
  epsGrowth: number;
  fcfGrowth: number;
  profitGrowth: number;
  commentary: string;
}

export interface QualityEngineOutput {
  score: number;        // 0-100
  roe: number;
  roic: number;
  grossMargin: number;
  operatingMargin: number;
  efficiencyScore: number;
  commentary: string;
}

export interface StabilityEngineOutput {
  score: number;        // 0-100
  debtScore: number;
  cashScore: number;
  volatilityScore: number;
  coverageScore: number;
  commentary: string;
}

export interface MomentumEngineOutput {
  score: number;        // 0-100
  momentumScore: number;
  trendScore: number;
  volatilityScore: number;
  commentary: string;
}

export interface ValuationEngineOutput {
  score: number;        // 0-100
  peScore: number;
  pbScore: number;
  evEbitdaScore: number;
  fcfYieldScore: number;
  commentary: string;
}

export interface RiskEngineOutput {
  score: number;        // 0-100 (higher = riskier)
  accountingAnomalyScore: number;
  debtStressScore: number;
  cashFlowStressScore: number;
  volatilityRiskScore: number;
  redFlagCount: number;
  commentary: string;
}

export interface ConfidenceEngineOutput {
  level: ConfidenceLevel;
  score: number;          // 0-100
  dataCompleteness: number;
  signalAgreement: number;
  riskConsistency: number;
  historicalStability: number;
  commentary: string;
}

// ─── Final Output Contract ────────────────────────────────────────

export interface StockStoryOutput {
  healthScore: number;            // 0-100
  classification: CompanyClassification;
  confidence: ConfidenceLevel;
  growth: number;                 // 0-100
  quality: number;                // 0-100
  stability: number;              // 0-100
  valuation: number;              // 0-100
  momentum: number;               // 0-100
  risk: number;                   // 0-100 (higher = riskier)
  narrative: string;
  engineDetails: {
    growth: GrowthEngineOutput;
    quality: QualityEngineOutput;
    stability: StabilityEngineOutput;
    momentum: MomentumEngineOutput;
    valuation: ValuationEngineOutput;
    risk: RiskEngineOutput;
    confidence: ConfidenceEngineOutput;
  };
  penaltyDetails: {
    totalPenalty: number;
    penalties: Array<{
      id: string;
      description: string;
      points: number;
      category: 'accounting' | 'debt' | 'volatility' | 'governance' | 'data';
    }>;
  };
  generatedAt: string;
  dataFreshness: 'Live' | 'Recent' | 'Stale' | 'Unavailable';
}

// ─── Scoring Utilities ────────────────────────────────────────────

/** Clamp a value to 0-100 range */
export function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Weighted average of scored components */
export function weightedAverage(
  components: Array<{ score: number; weight: number }>
): number {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 50;
  const avg = components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;
  return clampScore(avg);
}
