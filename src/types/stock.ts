// src/types/stock.ts

export type HealthStatus =
  | "veryHealthy"
  | "healthy"
  | "stable"
  | "weakening"
  | "unhealthy";

export type ConfidenceStatus =
  | "strong"
  | "rising"
  | "neutral"
  | "weak"
  | "veryWeak";

export type ValuationStatus =
  | "undervalued"
  | "fairlyPriced"
  | "premium"
  | "overvalued";

export type MomentumStatus =
  | "accelerating"
  | "stable"
  | "decelerating";

export interface TelemetrySnapshot {
  healthScore: number;
  healthStatus: HealthStatus;

  confidenceScore: number;
  confidenceStatus: ConfidenceStatus;

  valuationScore: number;
  valuationStatus: ValuationStatus;

  momentumScore: number;
  momentumStatus: MomentumStatus;

  lastUpdated: string;
}

export interface CompanyTelemetry {
  symbol: string;
  marketCap: { numeric: number | null; formatted: string; availability?: 'real' | 'unavailable' };
  peRatio: number | null;
  fiftyTwoWeekRange: { low: number | null; high: number | null; current: number | null };
  healthStatus: HealthStatus;
  lastUpdated: string | null;
  availability?: 'real' | 'registry-only' | 'unavailable';
  source?: 'provider' | 'registry-only' | 'unavailable';
  telemetrySnapshot?: TelemetrySnapshot;
}
