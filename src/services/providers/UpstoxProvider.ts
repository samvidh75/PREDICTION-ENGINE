/**
 * UpstoxProvider — Primary market data + portfolio provider.
 * 
 * RC-UPSTOX-001: Tier 1 provider for Quotes, Historical, and Portfolio.
 * Implements PriceProvider + HistoricalProvider + UpstoxBrokerProvider.
 * 
 * READ-ONLY: No order placement, no trade execution.
 * 
 * API: Upstox v2 REST API (requires OAuth token)
 * Endpoints:
 *   - GET /v2/market-quote/quotes        → getQuote()
 *   - GET /v2/historical-candle-data      → getHistoricalCandles()
 *   - GET /v2/portfolio/long-term-holdings → getHoldings()
 *   - GET /v2/portfolio/positions         → getPositions()
 *   - GET /v2/user/funds-and-margin       → getFunds()
 *   - GET /v2/order/history               → getOrders()
 */

import { PriceProvider } from './PriceProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { StockQuote, HistoricalPoint } from '../data/types';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 500, maxDelayMs: 3000 };

const UPSTOX_API = 'https://api.upstox.com/v2';

// ── Types ──────────────────────────────────────────────────
export interface UpstoxCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
}

export interface UpstoxHolding {
  isin: string;
  exchange: string;
  tradingSymbol: string;
  quantity: number;
  averagePrice: number;
  lastPrice?: number;
  pnl?: number;
}

export interface UpstoxPosition {
  isin: string;
  exchange: string;
  tradingSymbol: string;
  quantity: number;
  averagePrice: number;
  lastPrice?: number;
  pnl?: number;
  product: string;
}

export interface UpstoxFunds {
  availableMargin: number;
  usedMargin: number;
  totalMargin: number;
}

export interface UpstoxOrder {
  orderId: string;
  symbol: string;
  quantity: number;
  price: number;
  status: string;
  orderType: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * UpstoxProvider — Primary market data provider.
 * 
 * Priority (RC-UPSTOX-001):
 *   Quotes:     Upstox (Tier 1) → Yahoo (Tier 2) → Registry (Tier 3)
 *   Historical: Upstox (Tier 1) → Yahoo (Tier 2)
 *   Portfolio:  Upstox (Tier 1 only)
 */
export class UpstoxProvider implements PriceProvider, HistoricalProvider {
  // ── Quotes ───────────────────────────────────────────────
  async getQuote(symbol: string): Promise<StockQuote> {
    const cleanSym = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
    const token = this.getToken();
    if (!token) {
      throw new Error('Upstox: not authenticated — connect Upstox first');
    }

    const url = `${UPSTOX_API}/market-quote/quotes?symbol=${encodeURIComponent(cleanSym)}&exchange=NSE`;
    const data = await this.apiGet<any>(url, token);

    const quote = data?.data?.[0] ?? data?.data;
    if (!quote?.last_price && !quote?.lastPrice) {
      throw new Error(`Upstox: no quote data for ${cleanSym}`);
    }

    const price = Number(quote.last_price ?? quote.lastPrice ?? 0);
    const prevClose = Number(quote.prev_close ?? quote.previousClose ?? price);

    return {
      symbol: cleanSym,
      exchange: 'NSE',
      price,
      change: price - prevClose,
      changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
      volume: Number(quote.volume ?? quote.totalTradedVolume ?? 0),
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Historical ────────────────────────────────────────────
  async getHistory(symbol: string, range: string = '1M'): Promise<HistoricalPoint[]> {
    return this.getHistoricalCandles(symbol, range);
  }

  async getHistoricalCandles(symbol: string, range: string = '1M'): Promise<HistoricalPoint[]> {
    const cleanSym = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
    const token = this.getToken();
    if (!token) {
      throw new Error('Upstox: not authenticated — connect Upstox first');
    }

    const now = new Date();
    const from = this.rangeToDate(range, now);
    const to = now.toISOString().split('T')[0];

    const url = `${UPSTOX_API}/historical-candle-data/${encodeURIComponent(cleanSym)}/${from}/${to}/day/NSE`;
    const data = await this.apiGet<any>(url, token);

    const candles: UpstoxCandle[] = data?.data?.candles ?? data?.data ?? [];
    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error(`Upstox: no historical data for ${cleanSym}`);
    }

    return candles
      .map((c: UpstoxCandle) => ({
        date: c.timestamp?.split('T')[0] ?? '',
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume),
      }))
      .filter(p => p.close > 0);
  }

  // ── Market Depth ──────────────────────────────────────────
  async getMarketDepth(symbol: string): Promise<{ bids: Array<[number, number]>; asks: Array<[number, number]> }> {
    const cleanSym = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
    const token = this.getToken();
    if (!token) {
      throw new Error('Upstox: not authenticated');
    }

    const url = `${UPSTOX_API}/market-quote/depth?symbol=${encodeURIComponent(cleanSym)}&exchange=NSE`;
    const data = await this.apiGet<any>(url, token);

    const depth = data?.data;
    return {
      bids: (depth?.bids ?? []).map((b: any) => [Number(b.price ?? 0), Number(b.quantity ?? 0)]),
      asks: (depth?.asks ?? []).map((a: any) => [Number(a.price ?? 0), Number(a.quantity ?? 0)]),
    };
  }

  // ── Portfolio / Broker ────────────────────────────────────
  async getHoldings(): Promise<UpstoxHolding[]> {
    const token = this.getToken();
    if (!token) throw new Error('Upstox: not authenticated');

    const data = await this.apiGet<any>(`${UPSTOX_API}/portfolio/long-term-holdings`, token);
    return Array.isArray(data?.data) ? data.data : [];
  }

  async getPositions(): Promise<UpstoxPosition[]> {
    const token = this.getToken();
    if (!token) throw new Error('Upstox: not authenticated');

    const data = await this.apiGet<any>(`${UPSTOX_API}/portfolio/positions`, token);
    const positions = Array.isArray(data?.data) ? data.data : [];
    return positions.filter((p: any) => (p.quantity ?? 0) !== 0);
  }

  async getFunds(): Promise<UpstoxFunds> {
    const token = this.getToken();
    if (!token) throw new Error('Upstox: not authenticated');

    const data = await this.apiGet<any>(`${UPSTOX_API}/user/funds-and-margin`, token);
    return {
      availableMargin: data?.data?.available_margin ?? data?.data?.availableMargin ?? 0,
      usedMargin: data?.data?.used_margin ?? data?.data?.usedMargin ?? 0,
      totalMargin: data?.data?.total_margin ?? data?.data?.totalMargin ?? 0,
    };
  }

  async getOrders(): Promise<UpstoxOrder[]> {
    const token = this.getToken();
    if (!token) throw new Error('Upstox: not authenticated');

    const data = await this.apiGet<any>(`${UPSTOX_API}/order/history`, token);
    return Array.isArray(data?.data) ? data.data.slice(0, 50) : [];
  }

  // ── Internal ──────────────────────────────────────────────
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const uid = window.localStorage.getItem('ss_uid') || 'anonymous';
      const key = `ss_broker_token_upstox_${uid}`;
      const encoded = window.localStorage.getItem(key);
      if (!encoded) return null;
      const token = JSON.parse(atob(encoded));
      return token?.accessToken ?? null;
    } catch {
      return null;
    }
  }

  private async apiGet<T>(url: string, token: string): Promise<T> {
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      if (resp.status === 429) {
        throw new Error('Upstox: rate limited (429) — retry backoff');
      }
      if (resp.status === 401) {
        throw new Error('Upstox: token expired — reconnect Upstox');
      }
      if (!resp.ok) {
        throw new Error(`Upstox HTTP ${resp.status}: ${resp.statusText}`);
      }
      return resp.json() as Promise<T>;
    }, RETRY_OPTS);
  }

  /** Map user-facing range strings to date offsets */
  private rangeToDate(range: string, base: Date): string {
    const d = new Date(base);
    const map: Record<string, number> = {
      '1D': 1, '5D': 5, '1M': 30, '3M': 90, '6M': 180,
      '1Y': 365, '2Y': 730, '3Y': 1095, '5Y': 1825,
    };
    const days = map[range.toUpperCase()] || 30;
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }
}

export const upstoxProvider = new UpstoxProvider();
