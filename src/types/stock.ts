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
  marketCap: { numeric: number; formatted: string };
  peRatio: number;
  fiftyTwoWeekRange: { low: number; high: number; current: number };
  healthStatus: HealthStatus;
  lastUpdated: string;
  telemetrySnapshot?: TelemetrySnapshot;
}
