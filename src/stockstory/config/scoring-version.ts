/**
 * StockStory Scoring Version — Canonical calibration identifier.
 * 
 * TRACK-P4: Exposed in diagnostics, validation reports, and prediction metadata.
 * 
 * Any change to scoring formulas, weights, distributions, penalties,
 * classification thresholds, or risk policy MUST increment this version.
 */

export const SCORING_VERSION = {
  id: 'stockstory-scoring-v1.0.0-beta',
  releasedAt: '2026-06-09',
  percentileCalibrationVersion: 'sector-reference-v1',
  sectorMappingVersion: 'sector-map-v1',
  penaltyVersion: 'penalty-v1',
  riskPolicyVersion: 'single-dampening-v1',
  classificationThresholds: {
    excellent: 80,
    healthy: 65,
    stable: 45,
    weakening: 30,
    atRisk: 0,
  },
  riskDampening: {
    coefficient: 0.45,
    threshold: 15,
    policy: 'single-application-post-stretch',
  },
  engineWeights: {
    growth: { revenueGrowth: 3, epsGrowth: 3, fcfGrowth: 2, profitGrowth: 2 },
    quality: { roe: 2.0, roa: 2.0, roic: 2.0, grossMargin: '2-or-0-sector-dependent', operatingMargin: 2, efficiency: 1 },
    stability: { debt: 2.5, liquidity: 2.0, volatility: 1.5, coverage: 2.0, interestCoverage: 2.0, marketCapSize: 1.0 },
    valuation: { pe: '2-or-3-sector-dependent', pb: '2-or-3-sector-dependent', evEbitda: '0-2-3-sector-dependent', fcfYield: 3, dividendYield: 1.5 },
  },
  sectorWeights: {
    BANKING: { growth: 15, quality: 35, stability: 25, valuation: 15, momentum: 10 },
    IT: { growth: 30, quality: 25, stability: 15, valuation: 15, momentum: 15 },
    FMCG: { growth: 20, quality: 30, stability: 25, valuation: 15, momentum: 10 },
    PHARMA: { growth: 25, quality: 25, stability: 20, valuation: 15, momentum: 15 },
    AUTO: { growth: 20, quality: 20, stability: 25, valuation: 20, momentum: 15 },
    ENERGY: { growth: 15, quality: 20, stability: 30, valuation: 25, momentum: 10 },
    GENERAL: { growth: 25, quality: 25, stability: 20, valuation: 15, momentum: 15 },
  },
  penalties: {
    discreteOnly: true,
    categories: ['accounting', 'debt', 'volatility', 'governance', 'data'],
  },
  metricIdentity: {
    documented: true,
    mappings: {
      roa: 'roa', roe: 'roe', roic: 'roic',
      grossMargin: 'grossMargin', operatingMargin: 'operatingMargin',
      revenueGrowth: 'revenueGrowth', epsGrowth: 'epsGrowth',
      profitGrowth: 'profitGrowth', fcfGrowth: 'fcfGrowth',
      debtToEquity: 'debtToEquity', currentRatio: 'currentRatio',
      volatility: 'volatility',
      peRatio: 'peRatio', pbRatio: 'pbRatio', evEbitda: 'evEbitda', fcfYield: 'fcfYield',
    },
    inverseMetrics: ['debtToEquity', 'peRatio', 'pbRatio', 'evEbitda', 'volatility'],
  },
  limitations: [
    'profitGrowth, fcfGrowth, grossMargin distributions are provisional (raw dataset not committed)',
    'Reference sector distributions approximate ~100 peers per sector',
    'No historical backtesting data available for full ranking validation',
  ],
} as const;

export default SCORING_VERSION;
