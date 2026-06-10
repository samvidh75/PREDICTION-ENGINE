/**
 * Market types used by prediction engines.
 * Stub — provides the type contracts expected by PredictiveWorker, PredictionEngineAdapter, etc.
 */

export type HealthStatus =
  | 'VERY_HEALTHY'
  | 'HEALTHY'
  | 'STABLE'
  | 'WEAKENING'
  | 'UNHEALTHY';

export interface ICompanyTelemetry {
  symbol: string;
  priceChangePercent: number;
  volume: number;
  avgVolume: number;
  peRatio?: number | null;
  dividendYield?: number | null;
  [key: string]: unknown;
}
