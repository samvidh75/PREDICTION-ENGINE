/**
 * BrokerProvider — Abstraction layer for broker connectivity.
 * 
 * TRACK-7H: Read-only portfolio ingestion interface.
 * No order placement, no trade execution, no broker actions.
 * 
 * Each broker implementation (Upstox)
 * implements this interface to expose:
 *   - Portfolio holdings
 *   - Current positions (intraday + delivery)
 *   - Funds and margin
 *   - Connection status
 */

import type { PortfolioPosition, PortfolioHolding, PortfolioSnapshot } from './PortfolioTypes';

export interface ConnectionStatus {
  broker: string;
  connected: boolean;
  authenticated: boolean;
  lastSync?: string;
  error?: string;
}

export interface BrokerAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;          // Unix timestamp ms
  tokenType: string;          // e.g. "Bearer"
  brokerUserId?: string;
}

export interface BrokerFundSummary {
  availableCash: number;
  usedMargin: number;
  totalValue: number;
  currency: string;
}

export interface BrokerPortfolio {
  holdings: PortfolioHolding[];
  positions: PortfolioPosition[];
  funds: BrokerFundSummary;
  snapshot: PortfolioSnapshot;
}

/**
 * BrokerProvider — Contract for all broker integrations.
 * 
 * Each implementation handles:
 *   - OAuth/token lifecycle
 *   - API request formatting
 *   - Data normalization into Lensory's PortfolioPosition/Holding types
 * 
 * Future implementations:
 *   - ZerodhaProvider (Kite Connect API)
 *   - AngelOneProvider
 */
export interface BrokerProvider {
  /** Human-readable broker name */
  readonly brokerName: string;

  /** Initiate OAuth authorization flow. Returns redirect URL. */
  initiateAuth(redirectUri: string, state: string): Promise<string>;

  /** Exchange authorization code for tokens */
  exchangeCode(code: string, redirectUri: string): Promise<BrokerAuthResult>;

  /** Refresh access token using refresh token */
  refreshAccessToken(refreshToken: string): Promise<BrokerAuthResult>;

  /** Check current connection status */
  getConnectionStatus(accessToken: string): Promise<ConnectionStatus>;

  /** Fetch complete portfolio (holdings + positions + funds) */
  getPortfolio(accessToken: string): Promise<BrokerPortfolio>;

  /** Fetch holdings only */
  getHoldings(accessToken: string): Promise<PortfolioHolding[]>;

  /** Fetch active positions only */
  getPositions(accessToken: string): Promise<PortfolioPosition[]>;

  /** Fetch funds and margin */
  getFunds(accessToken: string): Promise<BrokerFundSummary>;

  /** Revoke access (disconnect) */
  disconnect(accessToken: string): Promise<void>;
}
