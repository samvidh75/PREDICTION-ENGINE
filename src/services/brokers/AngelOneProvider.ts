/**
 * AngelOneProvider — Angel One (SmartAPI) broker implementation.
 *
 * READ-ONLY: Portfolio ingestion only. No order placement.
 *
 * Implements BrokerProvider interface for Angel One SmartAPI v1.
 *
 * Note: Angel One uses API key + client code + password + TOTP for authentication.
 * The user must generate a session token via the SmartAPI login endpoint.
 */

import type { BrokerProvider, BrokerAuthResult, BrokerFundSummary, BrokerPortfolio, ConnectionStatus } from './BrokerProvider';
import type { PortfolioHolding, PortfolioPosition } from './PortfolioTypes';

const ANGEL_API_BASE = 'https://apiconnect.angelone.in/smart-api/v1';

export class AngelOneProvider implements BrokerProvider {
  readonly brokerName = 'angel_one';

  private static async apiGet<T>(path: string, jwtToken: string): Promise<T> {
    const response = await fetch(`${ANGEL_API_BASE}${path}`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (response.status === 401) {
      throw new Error('Angel One token expired');
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Angel One API ${response.status}: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data as T;
  }

  // ── Auth ──────────────────────────────────────────────────
  async initiateAuth(_redirectUri: string, _state: string): Promise<string> {
    // Angel One uses direct login, not OAuth2 redirect
    // User must provide API key, client code, password, and TOTP
    return 'angel-one-login://direct';
  }

  async exchangeCode(code: string, _redirectUri: string): Promise<BrokerAuthResult> {
    // code format: "api_key:client_code:password:totp"
    const [apiKey, clientCode, password, totp] = code.split(':');

    if (!apiKey || !clientCode || !password || !totp) {
      throw new Error('Invalid Angel One credentials. Format: api_key:client_code:password:totp');
    }

    const response = await fetch(`${ANGEL_API_BASE}/auth/omni-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        clientId: clientCode,
        password,
        totp,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Angel One login failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    const authToken = data.data?.jwtToken || '';

    return {
      accessToken: authToken,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000, // Angel tokens expire in 8 hours
      tokenType: 'Bearer',
      brokerUserId: clientCode,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<BrokerAuthResult> {
    // Angel One supports token refresh via the same endpoint
    // The refresh token is actually the JWT token itself
    const response = await fetch(`${ANGEL_API_BASE}/auth/omni-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Angel One token refresh failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    const authToken = data.data?.jwtToken || '';

    return {
      accessToken: authToken,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      tokenType: 'Bearer',
    };
  }

  async getConnectionStatus(accessToken: string): Promise<ConnectionStatus> {
    try {
      await AngelOneProvider.apiGet('/portfolio', accessToken);
      return {
        broker: 'angel_one',
        connected: true,
        authenticated: true,
        lastSync: new Date().toISOString(),
      };
    } catch (err) {
      return {
        broker: 'angel_one',
        connected: false,
        authenticated: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      };
    }
  }

  // ── Portfolio ──────────────────────────────────────────────
  async getPortfolio(accessToken: string): Promise<BrokerPortfolio> {
    const [holdings, positions, funds] = await Promise.all([
      this.getHoldings(accessToken),
      this.getPositions(accessToken),
      this.getFunds(accessToken),
    ]);

    return {
      holdings,
      positions,
      funds,
      snapshot: {
        userId: '',
        broker: 'angel_one',
        timestamp: new Date().toISOString(),
        holdings,
        positions,
        funds,
        totalMarketValue: holdings.reduce((sum, h) => sum + (h.lastPrice || h.averagePrice) * h.quantity, 0),
        totalCostBasis: holdings.reduce((sum, h) => sum + h.averagePrice * h.quantity, 0),
        totalUnrealizedPnl: holdings.reduce((sum, h) => sum + (h.pnl || 0), 0),
        totalUnrealizedPnlPercent: 0,
      },
    };
  }

  async getHoldings(accessToken: string): Promise<PortfolioHolding[]> {
    const data = await AngelOneProvider.apiGet<any[]>('/portfolio/holdings', accessToken);

    return data.map((h: any) => ({
      symbol: h.symbol || h.tradingsymbol,
      exchange: this.mapExchange(h.exchange) as 'NSE' | 'BSE',
      isin: h.isin,
      quantity: h.quantity || h.totalQty,
      averagePrice: h.avgPrice || h.averagePrice,
      lastPrice: h.ltp || h.lastPrice,
      pnl: h.pnl || 0,
      dayChange: h.dayChange || 0,
      dayChangePercent: h.dayChangePerc || 0,
    }));
  }

  async getPositions(accessToken: string): Promise<PortfolioPosition[]> {
    const data = await AngelOneProvider.apiGet<any>('/portfolio/positions', accessToken);
    const positions = data || [];

    return positions.map((p: any) => ({
      symbol: p.symbol || p.tradingsymbol,
      exchange: this.mapExchange(p.exchange),
      quantity: p.quantity || p.netQty,
      averagePrice: p.avgPrice || p.averagePrice,
      lastPrice: p.ltp || p.lastPrice,
      pnl: p.pnl || 0,
      product: p.product || 'CNC',
    }));
  }

  async getFunds(accessToken: string): Promise<BrokerFundSummary> {
    const data = await AngelOneProvider.apiGet<any>('/portfolio/funds', accessToken);

    return {
      availableCash: data.availableCash || data.cash || 0,
      usedMargin: data.usedMargin || 0,
      totalValue: data.availableCash || data.cash || 0,
      currency: 'INR',
    };
  }

  async disconnect(_accessToken: string): Promise<void> {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('angel_one_access_token');
      window.localStorage.removeItem('angel_one_client_code');
    }
  }

  // ── Helpers ──────────────────────────────────────────────
  private mapExchange(exchange: string): 'NSE' | 'BSE' | 'NFO' | 'MCX' {
    const map: Record<string, 'NSE' | 'BSE' | 'NFO' | 'MCX'> = {
      'NSE': 'NSE',
      'BSE': 'BSE',
      'NFO': 'NFO',
      'MCX': 'MCX',
      'nse_cm': 'NSE',
      'bse_cm': 'BSE',
      'nse_fo': 'NFO',
      'mcx_fo': 'MCX',
    };
    return map[exchange?.toUpperCase()] || 'NSE';
  }
}
