export interface FactorBreakdown {
  name: string;
  score: number;
  weight: number;
  drivers: string[];
}

export interface RiskFlag {
  type: string;
  severity: 'low' | 'moderate' | 'high';
  description: string;
}

export interface ValuationContext {
  peScore: number;
  pbScore: number;
  evEbitdaScore: number;
  fcfYieldScore: number;
  dividendYieldScore: number;
  compositeScore: number;
}

export interface QualityContext {
  roeScore: number;
  roaScore: number;
  roicScore: number;
  grossMarginScore: number;
  operatingMarginScore: number;
  efficiencyScore: number;
  compositeScore: number;
}

export interface GrowthContext {
  revenueGrowthScore: number;
  epsGrowthScore: number;
  fcfGrowthScore: number;
  profitGrowthScore: number;
  compositeScore: number;
}

export interface MomentumContext {
  rsiScore: number;
  macdScore: number;
  adxScore: number;
  trendStrengthScore: number;
  compositeScore: number;
}

export interface PeerContext {
  sector: string;
  percentileRank: number;
  peerCount: number;
  strengths: string[];
  weaknesses: string[];
}

export interface StockStoryResearchInput {
  symbol: string;
  companyName: string;
  sector: string;
  score: number;
  conviction: number;
  factorScores: {
    quality: number;
    valuation: number;
    growth: number;
    stability: number;
    risk: number;
    momentum: number;
  };
  factorBreakdowns: {
    quality: QualityContext;
    valuation: ValuationContext;
    growth: GrowthContext;
    momentum: MomentumContext;
  };
  topPositiveDrivers: string[];
  topNegativeDrivers: string[];
  riskFlags: RiskFlag[];
  valuationContext: ValuationContext;
  growthContext: GrowthContext;
  qualityContext: QualityContext;
  momentumContext: MomentumContext;
  whatChangedInputs: string[];
  peerContext?: PeerContext;
  dataCompletenessForInternalUseOnly: number;
}

export interface StockStoryNarrativeOutput {
  thesis: string;
  bullCase: string;
  bearCase: string;
  whatChanged: string;
  whyItMatters: string;
  keyRisks: string;
  watchNext: string;
  peerContextSummary: string;
  confidenceNote: string;
  methodologyNote: string;
  complianceSafeLabel: string;
}
