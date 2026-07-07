/**
 * ZerodhaProvider — Zerodha (Kite) broker implementation.
 *
 * READ-ONLY: Portfolio ingestion only. No order placement.
 *
 * Implements BrokerProvider interface for Kite Connect API v3.
 *
 * Note: Zerodha uses API key + secret for authentication, not OAuth2.
 * The user must generate a request token from Kite Connect console.
 */

import type { BrokerProvider, BrokerAuthResult, BrokerFundSummary, BrokerPortfolio, ConnectionStatus } from './BrokerProvider';
import type { PortfolioHolding, PortfolioPosition } from './PortfolioTypes';

const KITE_API_BASE = 'https://api.kite.trade';

function env(key: string): string {
  // Server-side: process.env; Client-side: import.meta.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`VITE_${key}`] || '';
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta as any).env[`VITE_${key}`] || (import.meta as any).env[key] || '';
  }
  return '';
}

export class ZerodhaProvider implements BrokerProvider {
  readonly brokerName = 'zerodha';

  private static async apiGet<T>(path: string, apiKey: string, accessToken: string): Promise<T> {
    const response = await fetch(`${KITE_API_BASE}${path}`, {
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${apiKey}:${accessToken}`,
      },
    });

    if (response.status === 401) {
      throw new Error('Zerodha token expired');
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Zerodha API ${response.status}: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data as T;
  }

  // ── OAuth ──────────────────────────────────────────────────
  async initiateAuth(_redirectUri: string, _state: string): Promise<string> {
    const apiKey = env('ZERODHA_API_KEY') || '';
    // Zerodha doesn't use standard OAuth2 — user generates request token from console
    // Build the login URL with api_key and redirect_uri
    const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3`;
    return loginUrl;
  }

  async exchangeCode(code: string, _redirectUri: string): Promise<BrokerAuthResult> {
    const apiKey = env('ZERODHA_API_KEY') || '';
    const apiSecret = env('ZERODHA_API_SECRET') || '';

    // Exchange request token for access token
    const response = await fetch(`${KITE_API_BASE}/session/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3',
      },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: code,
        checksum: await this.generateChecksum(apiKey, code, apiSecret),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Zerodha token exchange failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    const sessionToken = data.data?.access_token || '';

    return {
      accessToken: sessionToken,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Kite tokens expire at end of day
      tokenType: 'token',
      brokerUserId: data.data?.user_id,
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<BrokerAuthResult> {
    // Kite tokens cannot be refreshed — user must re-login daily
    throw new Error('Zerodha tokens cannot be refreshed. Please re-login via Kite Connect.');
  }

  async getConnectionStatus(accessToken: string): Promise<ConnectionStatus> {
    try {
      const apiKey = env('ZERODHA_API_KEY') || '';
      await ZerodhaProvider.apiGet('/user/profile', apiKey, accessToken);
      return {
        broker: 'zerodha',
        connected: true,
        authenticated: true,
        lastSync: new Date().toISOString(),
      };
    } catch (err) {
      return {
        broker: 'zerodha',
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
        broker: 'zerodha',
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
    const apiKey = env('ZERODHA_API_KEY') || '';
    const data = await ZerodhaProvider.apiGet<any[]>('/portfolio/holdings', apiKey, accessToken);

    return data.map((h: any) => ({
      symbol: h.tradingsymbol,
      exchange: h.exchange as 'PSE' | 'PSE',
      isin: h.isin,
      quantity: h.quantity,
      averagePrice: h.average_price,
      lastPrice: h.last_price,
      pnl: h.pnl || 0,
      dayChange: h.last_price * h.quantity - h.close_price * h.quantity,
      dayChangePercent: h.close_price > 0 ? ((h.last_price - h.close_price) / h.close_price) * 100 : 0,
    }));
  }

  async getPositions(accessToken: string): Promise<PortfolioPosition[]> {
    const apiKey = env('ZERODHA_API_KEY') || '';
    const data = await ZerodhaProvider.apiGet<any>('/portfolio/positions', apiKey, accessToken);
    const positions = data.net || [];

    return positions.map((p: any) => ({
      symbol: p.tradingsymbol,
      exchange: p.exchange as 'PSE' | 'PSE' | 'NFO' | 'MCX',
      quantity: p.quantity,
      averagePrice: p.average_price,
      lastPrice: p.last_price,
      pnl: p.pnl || 0,
      product: p.product,
    }));
  }

  async getFunds(accessToken: string): Promise<BrokerFundSummary> {
    const apiKey = env('ZERODHA_API_KEY') || '';
    const data = await ZerodhaProvider.apiGet<any>('/user/margins', apiKey, accessToken);

    return {
      availableCash: data.equity?.available?.cash || 0,
      usedMargin: data.equity?.used?.debits || 0,
      totalValue: data.equity?.available?.cash || 0,
      currency: 'INR',
    };
  }

  async disconnect(_accessToken: string): Promise<void> {
    // Zerodha tokens expire at end of day — no explicit revoke needed
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('zerodha_access_token');
      window.localStorage.removeItem('zerodha_api_key');
    }
  }

  // ── Helper: Generate SHA256 checksum for Kite API ─────────
  private async generateChecksum(apiKey: string, requestToken: string, apiSecret: string): Promise<string> {
    const data = `${apiKey}${requestToken}${apiSecret}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
