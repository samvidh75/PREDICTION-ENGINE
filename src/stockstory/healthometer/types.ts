export type HealthometerLabel = 'Very healthy' | 'Healthy' | 'Stable' | 'Needs review' | 'Risk rising' | 'Fragile' | 'Not enough information';

export interface HealthometerDimension {
  id: string;
  label: string;
  score: number | null;
  status: 'verified' | 'insufficient';
}

export interface HealthometerScore {
  overallScore: number | null;
  label: HealthometerLabel;
  dimensions: HealthometerDimension[];
  validDimensionCount: number;
  totalDimensionCount: number;
}

export interface HealthometerInput {
  symbol: string;
  financials: {
    peRatio: number | null;
    pbRatio: number | null;
    evEbitda: number | null;
    roe: number | null;
    roce: number | null;
    roa: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    grossMargin: number | null;
    revenueGrowth: number | null;
    profitGrowth: number | null;
    epsGrowth: number | null;
    fcfYield: number | null;
    marketCap: number | null;
    beta: number | null;
  };
  factors: {
    qualityFactor: number | null;
    valueFactor: number | null;
    growthFactor: number | null;
    momentumFactor: number | null;
    riskFactor: number | null;
    sectorStrengthFactor: number | null;
  };
  features: {
    volatility: number | null;
    momentum: number | null;
    rsi: number | null;
    trendStrength: number | null;
  };
  predictionRegistry: {
    rankingScore: number | null;
    classification: string | null;
    confidenceScore: number | null;
    confidenceLevel: string | null;
  };
}
