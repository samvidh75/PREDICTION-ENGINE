/**
 * PortfolioTypes — Shared types for portfolio and broker modules.
 * TRACK-7H: Portfolio Intelligence Integration
 */

/** A single holding (delivery position) from broker */
export interface PortfolioHolding {
  symbol: string;            // PSE symbol (e.g., "RELIANCE")
  isin?: string;             // ISIN identifier
  exchange: 'PSE';   // Exchange
  quantity: number;          // Number of shares
  averagePrice: number;      // Average buy price
  lastPrice?: number;        // Current market price
  pnl?: number;              // Unrealized P&L
  pnlPercent?: number;       // Unrealized P&L percentage
  dayChange?: number;        // Day change amount
  dayChangePercent?: number; // Day change percentage
  instrumentToken?: string;  // Broker-specific token
  sector?: string;           // Resolved from Lensory registry
  marketCap?: number;        // From registry
}

/** An active position (intraday or F&O) from broker */
export interface PortfolioPosition {
  symbol: string;
  isin?: string;
  exchange: 'PSE' | 'FNO' | 'MCX';
  quantity: number;          // Positive = long, negative = short
  averagePrice: number;
  lastPrice?: number;
  pnl?: number;
  product: string;           // "INTRADAY", "DELIVERY", "FUTURES", "OPTIONS"
  instrumentToken?: string;
}

/** Broker fund summary */
export interface PortfolioFunds {
  availableCash: number;
  usedMargin: number;
  totalValue: number;
  currency: string;
}

/** Aggregated portfolio snapshot (Lensory format) */
export interface PortfolioSnapshot {
  userId: string;
  broker: string;
  timestamp: string;
  holdings: PortfolioHolding[];
  positions: PortfolioPosition[];
  funds: PortfolioFunds;
  totalMarketValue: number;
  totalCostBasis: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPercent: number;
  
  // Computed by Lensory
  healthScore?: number;
  riskScore?: number;
  qualityScore?: number;
  diversificationScore?: number;
  sectorConcentrationWarnings?: string[];
}

/** Token storage schema */
export interface StoredBrokerToken {
  broker: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  brokerUserId?: string;
  connectedAt: string;
  uid: string;             // Firebase UID — binds token to user
}
