// src/services/providers/YahooProvider.ts
// Production Yahoo Finance provider — real HTTP requests, no mocks.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint } from '../data/types';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 500, maxDelayMs: 3000 };

/**
 * YahooProvider — Tier 1 provider.
 * Uses Yahoo Finance v8 chart API (public, no key required).
 * Supports quotes, metadata (via quoteSummary), and full OHLC historical data.
 */
export class YahooProvider implements PriceProvider, MetadataProvider, HistoricalProvider {

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
    // quoteSummary gives company profile data
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=assetProfile,price`;
    try {
      const data = await this.fetchJson(url);
      const result = data?.quoteSummary?.result?.[0];
      const profile = result?.assetProfile ?? {};
      const price = result?.price ?? {};
      return {
        symbol: symbol.replace(/\.(NS|BO)$/i, '').toUpperCase(),
        companyName: price.longName || price.shortName || symbol,
        sector: profile.sector || '',
        industry: profile.industry || '',
        exchange: price.exchangeName || 'NSE',
        marketCap: price.marketCap?.raw ?? undefined,
        currency: price.currency || 'INR',
        website: profile.website || '',
      };
    } catch {
      // quoteSummary failed — throw so ProviderCoordinator tries the next provider
      // The MetadataProviderCoordinator will catch this and fall back to registry
      throw new Error(`Yahoo: quoteSummary unavailable for ${symbol}`);
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
}
