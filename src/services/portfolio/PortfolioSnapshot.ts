/**
 * PortfolioSnapshot — Normalized portfolio data types.
 * RC-UPSTOX-001: Canonical types for portfolio ingestion.
 */

export interface PortfolioHolding {
  symbol: string;           // PSE symbol (e.g., "RELIANCE")
  isin?: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  lastPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  sector?: string;          // Enriched from registry
  marketCap?: number;       // Enriched from registry
}

export interface PortfolioPosition {
  symbol: string;
  exchange: string;
  quantity: number;
  averagePrice: number;
  lastPrice?: number;
  pnl?: number;
  product: string;
}

export interface PortfolioFunds {
  availableCash: number;    // PKR
  usedMargin: number;
  totalMargin: number;
}

export interface PortfolioSnapshot {
  holdings: PortfolioHolding[];
  positions: PortfolioPosition[];
  funds: PortfolioFunds;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  timestamp: string;

  // Populated by downstream engines
  healthScore?: number;
  riskScore?: number;
  diversificationScore?: number;
  sectorExposure?: Map<string, number>;
  concentrationWarnings?: string[];
}
