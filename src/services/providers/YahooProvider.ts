// src/services/providers/YahooProvider.ts
// Production Yahoo Finance provider — real HTTP requests, no mocks.
// As of June 2026: Yahoo v10 quoteSummary returns 401 (blocked).
// Yahoo v8 chart API works for price/volume data.
// Fundamentals (PE, ROE, D/E, etc.) must come from Finnhub or other providers.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { FinancialProvider } from './FinancialProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint } from '../data/types';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 500, maxDelayMs: 3000 };

/**
 * YahooFinancials — structured output from Yahoo v8 chart API.
 *
 * NOTE: Yahoo v10 quoteSummary is currently blocked (401 Unauthorized).
 * The v8 chart API provides price/volume only — no PE, ROE, D/E, etc.
 *
 * Fields that CAN be derived from v8:
 *   - beta (from 2Y price history)
 *   - marketCap approximation (price * avg volume — unreliable, prefer Registry)
 *
 * For real fundamentals, use FinnhubProvider or other financial providers.
 */
export interface YahooFinancials {
  symbol: string;
  // From v8 meta
  marketCap?: number;
  // Derived from historical prices
  beta?: number;
  // These are NOT available from v8 — always null when Yahoo is sole provider
  peRatio?: undefined;
  pbRatio?: undefined;
  evEbitda?: undefined;
  eps?: undefined;
  fcfYield?: undefined;
  roe?: undefined;
  roic?: undefined;
  grossMargin?: undefined;
  operatingMargin?: undefined;
  revenueGrowth?: undefined;
  epsGrowth?: undefined;
  fcfGrowth?: undefined;
  profitGrowth?: undefined;
  debtToEquity?: undefined;
  currentRatio?: undefined;
  interestCoverage?: undefined;
  freeCashFlow?: undefined;
  dividendYield?: undefined;
  _raw?: Record<string, unknown>;
}

/**
 * YahooProvider — Tier 1 provider for price/volume/historical data.
 * Uses Yahoo Finance v8 chart API (public, no key required).
 *
 * Financial fundamentals are NOT available via v8.
 * ProviderCoordinator routes getFinancials() to Finnhub first.
 */
export class YahooProvider implements PriceProvider, MetadataProvider, HistoricalProvider, FinancialProvider {

  /** Map user-facing range strings to Yahoo chart API range params */
  private static RANGE_MAP: Record<string, string> = {
    '1D': '1d', '5D': '5d', '1M': '1mo', '3M': '3mo', '6M': '6mo',
    '1Y': '1y', '2Y': '2y', '3Y': '3y', '5Y': '5y', '10Y': '10y', 'MAX': 'max',
  };

  private normalizeSymbol(symbol: string): string {
    // If already suffixed with .NS or .BO, keep it
    if (/\.(NS|BO)$/i.test(symbol)) return symbol.toUpperCase();
    // Default to NSE
    return `${symbol.toUpperCase()}.NS`;
  }

  private async fetchJson(url: string): Promise<any> {
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      if (!resp.ok) {
        throw new Error(`Yahoo HTTP ${resp.status}: ${resp.statusText} for ${url}`);
      }
      return resp.json();
    }, RETRY_OPTS);
  }

  // ── Quote ─────────────────────────────────────────────────
  async getQuote(symbol: string): Promise<StockQuote> {
    const ticker = this.normalizeSymbol(symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`;
    const data = await this.fetchJson(url);
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`Yahoo: no quote data for ${symbol}`);
    return {
      symbol: symbol.replace(/\.(NS|BO)$/i, '').toUpperCase(),
      exchange: meta.exchangeName === 'BSE' ? 'BSE' : 'NSE',
      price: meta.regularMarketPrice ?? 0,
      change: (meta.regularMarketPrice ?? 0) - (meta.chartPreviousClose ?? 0),
      changePercent: meta.chartPreviousClose
        ? (((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100)
        : 0,
      volume: meta.regularMarketVolume ?? 0,
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Metadata ──────────────────────────────────────────────
  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const ticker = this.normalizeSymbol(symbol);
    // Use v8 chart API for name/exchange (v10 quoteSummary is blocked)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`;
    try {
      const data = await this.fetchJson(url);
      const meta = data?.chart?.result?.[0]?.meta ?? {};
      return {
        symbol: symbol.replace(/\.(NS|BO)$/i, '').toUpperCase(),
        companyName: meta.longName || meta.shortName || symbol,
        sector: '',
        industry: '',
        exchange: meta.fullExchangeName === 'BSE' ? 'BSE' : (meta.fullExchangeName || 'NSE'),
        marketCap: meta.marketCap ?? undefined,
        currency: meta.currency || 'INR',
        website: '',
      };
    } catch {
      throw new Error(`Yahoo: chart unavailable for ${symbol}`);
    }
  }

  // ── Historical ────────────────────────────────────────────
  async getHistory(symbol: string, range: string = '1M'): Promise<HistoricalPoint[]> {
    return this.getHistorical(symbol, range);
  }

  async getHistorical(symbol: string, range: string = '1M'): Promise<HistoricalPoint[]> {
    const ticker = this.normalizeSymbol(symbol);
    const yahooRange = YahooProvider.RANGE_MAP[range.toUpperCase()] || '1mo';
    const interval = ['1d', '5d'].includes(yahooRange) ? '5m' : '1d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker,
    )}?range=${yahooRange}&interval=${interval}`;
    const data = await this.fetchJson(url);
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`Yahoo: no historical data for ${symbol}`);
    const timestamps: number[] = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const adj = result.indicators?.adjclose?.[0]?.adjclose || [];
    const points: HistoricalPoint[] = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      open: q.open?.[i] ?? 0,
      high: q.high?.[i] ?? 0,
      low: q.low?.[i] ?? 0,
      close: q.close?.[i] ?? 0,
      volume: q.volume?.[i] ?? 0,
      adjustedClose: adj[i] ?? undefined,
    }));
    return points.filter(p => p.close !== null && p.close !== 0);
  }

  // ── Financials (v8 chart API only — fundamentals NOT available) ──
  async getFinancials(symbol: string): Promise<YahooFinancials> {
    const cleanSym = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
    const ticker = this.normalizeSymbol(symbol);

    // Get 2Y historical data for beta derivation
    let beta: number | undefined;
    try {
      const hist = await this.getHistorical(symbol, '2Y');
      const prices = hist.map(p => p.adjustedClose ?? p.close).filter(p => p > 0);
      if (prices.length >= 60) {
        const returns: number[] = [];
        for (let i = 1; i < prices.length; i++) {
          returns.push(Math.log(prices[i] / prices[i - 1]));
        }
        const meanRet = returns.reduce((s, v) => s + v, 0) / returns.length;
        const variance = returns.reduce((s, v) => s + (v - meanRet) ** 2, 0) / returns.length;
        const annualVol = Math.sqrt(variance) * Math.sqrt(252);
        // Rough beta: assume market vol ≈ 18% annualized
        beta = Math.max(0.1, Math.min(annualVol / 0.18, 4.0));
      }
    } catch {
      // Beta unavailable — caller should fall back
    }

    // v10 quoteSummary is blocked (401). v8 chart has no fundamental fields.
    // Return what we can derive from v8; throw so ProviderCoordinator tries Finnhub.
    throw new Error(
      `Yahoo Financials: v10 quoteSummary blocked (401). v8 chart API has no PE/ROE/D/E data. Use Finnhub for fundamentals. (beta=${beta?.toFixed(2) ?? 'N/A'})`,
    );
  }
}
