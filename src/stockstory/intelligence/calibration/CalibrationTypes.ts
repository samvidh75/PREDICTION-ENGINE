/**
 * Intelligence Calibration Types
 * Part 8 — Types for the calibration system that tunes intelligence
 * outputs against market reality.
 */

/** Calibration configuration */
export interface CalibrationConfig {
  /** Sector-specific adjustment factors */
  sectorOverrides: Record<string, SectorCalibration>;
  /** Market-cap bucket thresholds (INR crores) */
  marketCapBuckets: MarketCapBucket[];
  /** Risk calibration parameters */
  risk: RiskCalibration;
  /** Technical regime thresholds */
  technical: TechnicalCalibration;
  /** Valuation framework overrides */
  valuation: ValuationCalibration;
  /** Evidence calibration */
  evidence: EvidenceCalibration;
}

export interface SectorCalibration {
  /** Multiplier for quality scoring in this sector */
  qualityMultiplier: number;
  /** Acceptable PE range for this sector */
  peRange: { min: number; max: number };
  /** Acceptable P/B range */
  pbRange: { min: number; max: number };
  /** Key metrics that matter for this sector */
  keyMetrics: string[];
  /** Metrics to deprioritize */
  deprioritizedMetrics: string[];
  /** Typical debt levels acceptable */
  maxDebtToEquity: number;
  /** Sector-specific weights for composite scoring */
  factorWeights: Record<string, number>;
}

export interface MarketCapBucket {
  /** Label: 'mega', 'large', 'mid', 'small' */
  label: string;
  /** Min market cap in crores */
  minCap: number;
  /** Max market cap in crores */
  maxCap: number;
  /** Growth rate expectations (%) */
  expectedGrowth: { min: number; max: number };
  /** Liquidity discount applied to scoring */
  liquidityFactor: number;
}

export interface RiskCalibration {
  /** Default risk-free rate (India 10Y bond yield) */
  riskFreeRate: number;
  /** Equity risk premium for India */
  equityRiskPremium: number;
  /** Country risk premium */
  countryRiskPremium: number;
  /** Beta adjustment floor */
  betaFloor: number;
  /** Maximum acceptable portfolio risk score */
  maxPortfolioRisk: number;
}

export interface TechnicalCalibration {
  /** RSI oversold threshold */
  rsiOversold: number;
  /** RSI overbought threshold */
  rsiOverbought: number;
  /** Short-term MA period */
  shortMAPeriod: number;
  /** Long-term MA period */
  longMAPeriod: number;
  /** Volume spike multiplier threshold */
  volumeSpikeMultiplier: number;
  /** Regime detection lookback (days) */
  regimeLookbackDays: number;
}

export interface ValuationCalibration {
  /** DCF default growth rate for India */
  dcfGrowthRate: number;
  /** Terminal growth rate */
  terminalGrowthRate: number;
  /** WACC floor */
  waccFloor: number;
  /** PEG ratio threshold for overvalued */
  pegOvervaluedThreshold: number;
}

export interface EvidenceCalibration {
  /** Minimum evidence points for a conviction call */
  minEvidenceForConviction: number;
  /** Maximum staleness of evidence (days) */
  maxEvidenceAgeDays: number;
  /** Required source diversity (unique sources) */
  minUniqueSources: number;
}

/** Default calibration for Philippine equities */
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  sectorOverrides: {
    'Banking': {
      qualityMultiplier: 1.0,
      peRange: { min: 8, max: 22 },
      pbRange: { min: 0.8, max: 3.5 },
      keyMetrics: ['npaRatio', 'netInterestMargin', 'casaRatio', 'loanGrowth'],
      deprioritizedMetrics: ['inventoryTurnover'],
      maxDebtToEquity: 15.0,
      factorWeights: { quality: 0.35, valuation: 0.25, momentum: 0.20, risk: 0.20 },
    },
    'IT Services': {
      qualityMultiplier: 1.1,
      peRange: { min: 15, max: 40 },
      pbRange: { min: 2, max: 15 },
      keyMetrics: ['revenueGrowth', 'attrition', 'dealWins', 'utilization'],
      deprioritizedMetrics: ['debtToEquity'],
      maxDebtToEquity: 0.5,
      factorWeights: { quality: 0.30, valuation: 0.25, momentum: 0.25, risk: 0.20 },
    },
    'FMCG': {
      qualityMultiplier: 1.2,
      peRange: { min: 25, max: 70 },
      pbRange: { min: 5, max: 25 },
      keyMetrics: ['volumeGrowth', 'marketShare', 'distributionReach', 'roce'],
      deprioritizedMetrics: ['debtToEquity'],
      maxDebtToEquity: 0.5,
      factorWeights: { quality: 0.40, valuation: 0.20, momentum: 0.20, risk: 0.20 },
    },
    'Pharmaceuticals': {
      qualityMultiplier: 1.0,
      peRange: { min: 15, max: 45 },
      pbRange: { min: 2, max: 10 },
      keyMetrics: ['fdaCompliance', 'pipelineStrength', 'exportShare', 'rndSpend'],
      deprioritizedMetrics: [],
      maxDebtToEquity: 1.0,
      factorWeights: { quality: 0.35, valuation: 0.25, momentum: 0.15, risk: 0.25 },
    },
    'Automobile': {
      qualityMultiplier: 1.0,
      peRange: { min: 10, max: 35 },
      pbRange: { min: 1, max: 8 },
      keyMetrics: ['volumeGrowth', 'marketShare', 'evTransition', 'exportShare'],
      deprioritizedMetrics: [],
      maxDebtToEquity: 1.5,
      factorWeights: { quality: 0.30, valuation: 0.25, momentum: 0.25, risk: 0.20 },
    },
    'Cement': {
      qualityMultiplier: 1.0,
      peRange: { min: 15, max: 50 },
      pbRange: { min: 1.5, max: 8 },
      keyMetrics: ['capacityUtilization', 'realizationPerTon', 'powerCost', 'regionalPresence'],
      deprioritizedMetrics: [],
      maxDebtToEquity: 1.5,
      factorWeights: { quality: 0.30, valuation: 0.30, momentum: 0.20, risk: 0.20 },
    },
    'Power': {
      qualityMultiplier: 0.9,
      peRange: { min: 8, max: 30 },
      pbRange: { min: 0.8, max: 5 },
      keyMetrics: ['plantLoadFactor', 'regulatedReturns', 'receivables', 'capacityExpansion'],
      deprioritizedMetrics: ['fiiHolding'],
      maxDebtToEquity: 3.0,
      factorWeights: { quality: 0.25, valuation: 0.35, momentum: 0.15, risk: 0.25 },
    },
  },
  marketCapBuckets: [
    { label: 'mega', minCap: 500000, maxCap: Infinity, expectedGrowth: { min: 8, max: 20 }, liquidityFactor: 1.0 },
    { label: 'large', minCap: 100000, maxCap: 500000, expectedGrowth: { min: 10, max: 25 }, liquidityFactor: 0.95 },
    { label: 'mid', minCap: 20000, maxCap: 100000, expectedGrowth: { min: 12, max: 35 }, liquidityFactor: 0.85 },
    { label: 'small', minCap: 0, maxCap: 20000, expectedGrowth: { min: 15, max: 50 }, liquidityFactor: 0.70 },
  ],
  risk: {
    riskFreeRate: 7.0,
    equityRiskPremium: 5.5,
    countryRiskPremium: 1.5,
    betaFloor: 0.5,
    maxPortfolioRisk: 0.65,
  },
  technical: {
    rsiOversold: 30,
    rsiOverbought: 70,
    shortMAPeriod: 50,
    longMAPeriod: 200,
    volumeSpikeMultiplier: 2.5,
    regimeLookbackDays: 60,
  },
  valuation: {
    dcfGrowthRate: 10,
    terminalGrowthRate: 4,
    waccFloor: 8,
    pegOvervaluedThreshold: 2.5,
  },
  evidence: {
    minEvidenceForConviction: 5,
    maxEvidenceAgeDays: 90,
    minUniqueSources: 3,
  },
};
