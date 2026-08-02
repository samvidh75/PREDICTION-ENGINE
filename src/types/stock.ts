/**
 * Core telemetry and snapshot types for stock company data.
 * Reconstructed from usage across the codebase — these files were missing
 * but referenced by StockRegistry, MarketDataOrchestrator, TelemetrySnapshotFactory.
 * No runtime behavior changed.
 */

export interface CompanyTelemetry {
  symbol: string;
  marketCap: {
    numeric: number | null;
    formatted: string;
    availability: 'real' | 'unavailable';
  };
  peRatio: number | null;
  fiftyTwoWeekRange: {
    low: number | null;
    high: number | null;
    current: number | null;
  };
  healthStatus: string | null;
  lastUpdated: string | number | null;
  availability: 'real' | 'unavailable' | 'registry-only';
  source: string;
}

export interface TelemetrySnapshot {
  healthScore: number;
  healthStatus: string;
  confidenceScore: number;
  confidenceStatus: string;
  valuationScore: number;
  valuationStatus: string;
  momentumScore: number;
  momentumStatus: string;
  lastUpdated: string;
}
