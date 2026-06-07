// src/types/market.ts

export type HealthStatus = 'VERY_HEALTHY' | 'HEALTHY' | 'STABLE' | 'WEAKENING' | 'UNHEALTHY';

export interface IndexPerformance {
  symbol: string;
  value: number;
  change: number;
  percentChange: number;
}

export interface MarketSummary {
  indices: IndexPerformance[];
  timestamp: string;
}

export interface ICompanyTelemetry {
  symbol: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  previousClose: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  timestamp: number;
  dataSource: string;
  lastUpdated: string;
  isLive: boolean;
}

export interface PredictionPayload {
  predictionId: string;
  symbol: string;
  timestamp: number;
  confidenceScore: number;
  healthStatus: HealthStatus;
  trendDirection: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL';
  volatilityIndex: number;
  disclaimerText: string;
}

export interface MarketDataResponse {
  success: boolean;
  data: ICompanyTelemetry | null;
  error?: string;
  cacheHit?: boolean;
}

export interface PredictionEngineInput {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  peRatio: number;
  dividendYield: number;
}
