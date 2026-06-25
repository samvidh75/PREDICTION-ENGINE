export type UnifiedHorizon = 7 | 30 | 90 | 180 | 365;

export type UnifiedClassification =
  | 'EXCELLENT'
  | 'HEALTHY'
  | 'STABLE'
  | 'WEAKENING'
  | 'AT_RISK'
  | 'INSUFFICIENT_DATA';

export interface EngineInput {
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  roce: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  dividendYield: number | null;
  closes: number[];
}

export interface EngineFactorScore {
  score: number | null;
  reason: string;
}

export interface EngineOutput {
  composite: number | null;
  classification: UnifiedClassification;
  factorScores: {
    quality: EngineFactorScore;
    valuation: EngineFactorScore;
    growth: EngineFactorScore;
    stability: EngineFactorScore;
    momentum: EngineFactorScore;
  };
  technicals: {
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHist: number | null;
    sma20: number | null;
    sma50: number | null;
    aboveSma20: boolean | null;
    aboveSma50: boolean | null;
    rsiZone: 'overbought' | 'neutral' | 'oversold' | null;
    overallSignal: 'bullish' | 'neutral' | 'bearish' | null;
  };
  dataCompleteness: number;
  availableWeight: number;
}

export type UnifiedConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';

export type UnifiedFactorGroup =
  | 'quality'
  | 'valuation'
  | 'growth'
  | 'stability'
  | 'momentum'
  | 'risk'
  | 'sector'
  | 'liquidity'
  | 'ownership'
  | 'events'
  | 'dataQuality';

export type UnifiedFeatureActivation =
  | 'active'
  | 'unavailable'
  | 'deprecated'
  | 'experimental';

export interface UnifiedFactorScore {
  group: UnifiedFactorGroup;
  value: number | null;
  availability: number;
  confidence: number | null;
  featureCount: number;
  availableFeatureCount: number;
  missingFeatures: string[];
  reason: string;
}

export interface UnifiedFeatureValue {
  id: string;
  label: string;
  raw: number | null;
  transformed: number | null;
  unit: string;
  sourceTable: string;
  sourceField: string;
  freshness: number | null;
  confidence: number | null;
  isStale: boolean;
}

export interface UnifiedPredictionInput {
  symbol: string;
  exchange: string | null;
  sector: string | null;
  tradeDate: string;
  horizon: UnifiedHorizon;

  close: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  closePrices: number[];
  tradeDates: string[];
  priceFreshnessDays: number | null;

  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  adx: number | null;
  atr: number | null;
  bollingerWidth: number | null;
  relativeStrength: number | null;
  movingAverageDistance: number | null;
  trendStrength: number | null;
  featureFreshnessDays: number | null;

  qualityFactor: number | null;
  valueFactor: number | null;
  growthFactor: number | null;
  momentumFactor: number | null;
  riskFactor: number | null;
  sectorStrengthFactor: number | null;
  factorFreshnessDays: number | null;

  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  beta: number | null;
  marketCap: number | null;
  freeFloat: number | null;
  fcfYield: number | null;
  evEbitda: number | null;
  roa: number | null;
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
  netMargin: number | null;
  revenue: number | null;
  operatingProfit: number | null;
  netProfit: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  equity: number | null;
  cashFlowFromOperations: number | null;
  fundamentalFreshnessDays: number | null;

  providerCount: number;
  lineageCount: number;
  fieldCompleteness: number;
  staleFieldCount: number;
  partialFactorCount: number;
  sourceConfidence: number;

  sectorPeers: Array<{ symbol: string; healthScore: number | null }>;

  freshnessThresholds: {
    priceMaxAgeDays: number;
    fundamentalMaxAgeDays: number;
    factorMaxAgeDays: number;
    featureMaxAgeDays: number;
  };
}

export interface UnifiedPredictionOutput {
  symbol: string;
  horizon: UnifiedHorizon;
  tradeDate: string;
  generatedAt: string;
  modelVersion: string;

  rankingScore: number | null;
  healthScore: number | null;
  classification: UnifiedClassification;
  confidenceScore: number;
  confidenceLevel: UnifiedConfidenceLevel;

  factorScores: UnifiedFactorScore[];

  featureVector: UnifiedFeatureValue[];

  dataCompleteness: number;
  missingFields: string[];
  unavailableFeatures: string[];

  explanation: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
  keyRisks: string[];

  sourceEngine: string;
  createdBy: string;

  // Fraction of composite weight that had real data (0–1); optional for backwards compat with existing mocks
  availableWeight?: number;
  // True only if fabricated data was substituted — always false in production
  isFabricated?: boolean;
  fabricationReason?: string | null;
}

export interface UnifiedEngineResult {
  output: UnifiedPredictionOutput | null;
  error: string | null;
  warnings: string[];
  featureCount: number;
  activeFeatureCount: number;
  elapsedMs: number;
}

export type UnifiedEngineMode = 'disabled' | 'shadow' | 'active';

export interface UnifiedEngineConfig {
  mode: UnifiedEngineMode;
  modelVersion: string;
  enabledHorizons: UnifiedHorizon[];
  maxSymbolsPerRun: number;
  shadowDriftThreshold: number;
  requireConfirmation: boolean;
  confirmationEnvVar: string;
}
