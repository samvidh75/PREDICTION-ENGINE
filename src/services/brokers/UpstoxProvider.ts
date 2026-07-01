/**
 * UpstoxProvider — Upstox broker implementation.
 * 
 * READ-ONLY: Portfolio ingestion only. No order placement.
 * 
 * Implements BrokerProvider interface for Upstox API v2.
 */

import type { BrokerProvider, BrokerAuthResult, BrokerFundSummary, BrokerPortfolio, ConnectionStatus } from './BrokerProvider';
import type { PortfolioHolding, PortfolioPosition } from './PortfolioTypes';
import { UpstoxOAuth } from './UpstoxOAuth';

const UPSTOX_API_BASE = 'https://api.upstox.com/v2';

export class UpstoxProvider implements BrokerProvider {
  readonly brokerName = 'upstox';

  private static async apiGet<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${UPSTOX_API_BASE}${path}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (response.status === 401) {
      throw new Error('Upstox token expired');
    }
    if (!response.ok) {
      throw new Error(`Upstox API ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // ── OAuth ──────────────────────────────────────────────────
  async initiateAuth(redirectUri: string, state: string): Promise<string> {
    const { verifier, challenge } = UpstoxOAuth.generatePKCE();
    // Store verifier for later exchange (in sessionStorage)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('upstox_code_verifier', verifier);
      window.sessionStorage.setItem('upstox_oauth_state', state);
    }
    
    const clientId = import.meta.env.VITE_UPSTOX_CLIENT_ID || '';
    return UpstoxOAuth.buildAuthUrl({ clientId, redirectUri, state, codeChallenge: challenge });
  }

  async exchangeCode(code: string, redirectUri: string): Promise<BrokerAuthResult> {
    const verifier = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('upstox_code_verifier') || ''
      : '';
    const uid = typeof window !== 'undefined' 
      ? window.localStorage.getItem('ss_uid') || 'anonymous'
      : 'anonymous';
    
    const result = await UpstoxOAuth.exchangeCode({ code, redirectUri, codeVerifier: verifier, uid });
    
    // Persist access token for fundamentals API
    if (typeof window !== 'undefined' && result.accessToken) {
      window.localStorage.setItem('upstox_access_token', result.accessToken);
    }
    
    // Clean up session storage
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('upstox_code_verifier');
      window.sessionStorage.removeItem('upstox_oauth_state');
    }
    
    return result;
  }

  async refreshAccessToken(refreshToken: string): Promise<BrokerAuthResult> {
    const uid = typeof window !== 'undefined'
      ? window.localStorage.getItem('ss_uid') || 'anonymous'
      : 'anonymous';
    
    const result = await UpstoxOAuth.refreshToken({ refreshToken, uid });
    return { ...result, tokenType: 'Bearer' };
  }

  // ── Connection Status ──────────────────────────────────────
  async getConnectionStatus(accessToken: string): Promise<ConnectionStatus> {
    try {
      const profile = await UpstoxProvider.apiGet<any>('/user/profile', accessToken);
      return {
        broker: 'upstox',
        connected: true,
        authenticated: profile?.status === 'success',
        lastSync: new Date().toISOString(),
      };
    } catch (err) {
      return {
        broker: 'upstox',
        connected: false,
        authenticated: false,
        error: (err as Error).message,
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

    const totalMarketValue = holdings.reduce((sum, h) => sum + (h.lastPrice ?? h.averagePrice) * h.quantity, 0)
      + positions.reduce((sum, p) => sum + (p.lastPrice ?? p.averagePrice) * Math.abs(p.quantity), 0);

    return {
      holdings,
      positions,
      funds,
      snapshot: {
        userId: '',
        broker: 'upstox',
        timestamp: new Date().toISOString(),
        holdings,
        positions,
        funds,
        totalMarketValue,
        totalCostBasis: holdings.reduce((s, h) => s + h.averagePrice * h.quantity, 0),
        totalUnrealizedPnl: holdings.reduce((s, h) => s + (h.pnl ?? 0), 0),
        totalUnrealizedPnlPercent: 0,
      },
    };
  }

  async getHoldings(accessToken: string): Promise<PortfolioHolding[]> {
    const data = await UpstoxProvider.apiGet<any>('/portfolio/long-term-holdings', accessToken);
    
    if (!data?.data || !Array.isArray(data.data)) return [];

    return data.data.map((item: any) => ({
      symbol: this.extractSymbol(item.trading_symbol || item.isin || ''),
      isin: item.isin,
      exchange: item.exchange === 'BSE' ? 'BSE' : 'NSE',
      quantity: item.quantity || 0,
      averagePrice: item.average_price || 0,
      lastPrice: item.last_price,
      pnl: item.pnl,
      pnlPercent: item.pnl_percent,
      dayChange: item.day_change,
      dayChangePercent: item.day_change_percentage,
      instrumentToken: item.instrument_token,
    }));
  }

  async getPositions(accessToken: string): Promise<PortfolioPosition[]> {
    const data = await UpstoxProvider.apiGet<any>('/portfolio/positions', accessToken);
    
    if (!data?.data || !Array.isArray(data.data)) return [];

    return data.data
      .filter((item: any) => item.quantity !== 0)
      .map((item: any) => ({
        symbol: this.extractSymbol(item.trading_symbol || ''),
        isin: item.isin,
        exchange: (item.exchange || 'NSE') as 'NSE' | 'BSE' | 'NFO' | 'MCX',
        quantity: item.quantity || 0,
        averagePrice: item.average_price || 0,
        lastPrice: item.last_price,
        pnl: item.pnl,
        product: item.product || 'DELIVERY',
        instrumentToken: item.instrument_token,
      }));
  }

  async getFunds(accessToken: string): Promise<BrokerFundSummary> {
    const data = await UpstoxProvider.apiGet<any>('/user/funds-and-margin', accessToken);
    
    return {
      availableCash: data?.data?.available_margin || data?.data?.available_cash || 0,
      usedMargin: data?.data?.used_margin || 0,
      totalValue: data?.data?.total_margin || 0,
      currency: 'INR',
    };
  }

  async disconnect(accessToken: string): Promise<void> {
    const uid = typeof window !== 'undefined'
      ? window.localStorage.getItem('ss_uid') || 'anonymous'
      : 'anonymous';
    // Clean up persisted token (used by UpstoxFundamentalsProvider)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('upstox_access_token');
    }
    await UpstoxOAuth.revoke(accessToken, uid);
  }

  // ── Symbol Extraction ──────────────────────────────────────
  /**
   * Extract NSE symbol from broker symbol format.
   * Upstox returns symbols like "RELIANCE-EQ", "TCS-EQ", or ISINs.
   * We strip suffixes and normalize to Lensory format.
   */
  private extractSymbol(raw: string): string {
    return raw
      .replace(/-EQ$/i, '')
      .replace(/-BE$/i, '')
      .replace(/\.NS$/i, '')
      .replace(/\.BO$/i, '')
      .trim()
      .toUpperCase();
  }
}
