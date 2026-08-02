/**
 * EodhdCandleProvider — real historical OHLCV for the backend ingestion
 * pipeline (TechnicalSnapshotRefresh and friends).
 *
 * EODHD_KEY has been configured in .env for a long time but nothing in the
 * backend ever called it. Live-tested against the real key: the free tier
 * rejects /fundamentals/ requests but /eod/ (daily historical OHLCV) works
 * for real PSE tickers. This provider implements the PriceCandle-based
 * PriceProvider interface from src/stockstory/ingestion/TechnicalSnapshotRefresh.ts
 * so that job (which already computes real momentum/volatility/RSI/MACD/
 * ATR/ADX from real highs and lows — previously wired to nothing) can run
 * against genuine data.
 */

import type { PriceCandle, PriceProvider } from '../../stockstory/ingestion/TechnicalSnapshotRefresh';

interface CacheEntry {
  candles: PriceCandle[];
  expiresAt: number;
}

const CACHE_TTL_MS = 6 * 3600 * 1000; // 6 hours — EOD data changes once/day

// The PSEi composite index is an index, not an equity — EODHD serves it
// under the .INDX suffix (verified live), not .PSE like ordinary stocks.
const INDEX_SYMBOLS = new Set(['PSEI']);

function toEodhdSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().trim().replace(/\.(PSE|INDX)$/i, '');
  return INDEX_SYMBOLS.has(clean) ? `${clean}.INDX` : `${clean}.PSE`;
}

export interface EodhdDividend {
  date: string;
  value: number;
  currency: string;
}

interface DividendCacheEntry {
  dividends: EodhdDividend[];
  expiresAt: number;
}

export class EodhdCandleProvider implements PriceProvider {
  readonly name = 'eodhd';
  private readonly apiKey: string | undefined;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly dividendCache = new Map<string, DividendCacheEntry>();

  constructor(apiKey: string | undefined = process.env.EODHD_KEY) {
    this.apiKey = apiKey;
  }

  available(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Real historical dividend payments from EODHD's /div/ endpoint — unlike
   * /fundamentals/, this works on the free tier (verified live against
   * SM.PSE: real PHP-denominated dividend history back to 2005).
   */
  async fetchDividends(symbol: string): Promise<EodhdDividend[]> {
    if (!this.apiKey) return [];

    const cacheKey = symbol.toUpperCase();
    const cached = this.dividendCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.dividends;

    try {
      const url = `https://eodhd.com/api/div/${encodeURIComponent(toEodhdSymbol(symbol))}?api_token=${this.apiKey}&fmt=json`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];

      const raw = await response.json() as unknown;
      if (!Array.isArray(raw)) return [];

      const dividends: EodhdDividend[] = raw
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
        .map((row) => ({
          date: String(row.date ?? ''),
          value: Number(row.value ?? 0),
          currency: String(row.currency ?? 'PHP'),
        }))
        .filter((d) => d.date && Number.isFinite(d.value) && d.value > 0);

      this.dividendCache.set(cacheKey, { dividends, expiresAt: Date.now() + CACHE_TTL_MS });
      return dividends;
    } catch (error) {
      console.error(`[EodhdCandleProvider] fetchDividends failed for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Real trailing-12-month dividend yield: sum of real dividend payments
   * in the last 365 days, divided by the current price. Returns null
   * (not 0) when there's no real dividend history or price to compute
   * from — a stock that pays no dividend and a stock with unknown yield
   * are different things and must not collapse to the same value.
   */
  async computeTrailingDividendYield(symbol: string, currentPrice: number): Promise<number | null> {
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;
    const dividends = await this.fetchDividends(symbol);
    if (dividends.length === 0) return null;

    const cutoff = Date.now() - 365 * 86400000;
    const trailing = dividends.filter((d) => new Date(d.date).getTime() >= cutoff);
    if (trailing.length === 0) return null;

    const totalPerShare = trailing.reduce((sum, d) => sum + d.value, 0);
    return (totalPerShare / currentPrice) * 100;
  }

  async fetchPrices(symbol: string, fromDate: string, toDate: string): Promise<PriceCandle[]> {
    if (!this.apiKey) return [];

    const cacheKey = `${symbol.toUpperCase()}:${fromDate}:${toDate}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.candles;
    }

    try {
      const url = `https://eodhd.com/api/eod/${encodeURIComponent(toEodhdSymbol(symbol))}` +
        `?api_token=${this.apiKey}&fmt=json&period=d&order=a&from=${fromDate}&to=${toDate}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];

      const raw = await response.json() as unknown;
      if (!Array.isArray(raw)) return [];

      const candles: PriceCandle[] = raw
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
        .map((row) => ({
          date: String(row.date ?? ''),
          open: Number(row.open ?? 0),
          high: Number(row.high ?? 0),
          low: Number(row.low ?? 0),
          close: Number(row.close ?? 0),
          volume: Number(row.volume ?? 0),
        }))
        .filter((c) => c.date && Number.isFinite(c.close) && c.close > 0);

      this.cache.set(cacheKey, { candles, expiresAt: Date.now() + CACHE_TTL_MS });
      return candles;
    } catch (error) {
      console.error(`[EodhdCandleProvider] fetchPrices failed for ${symbol}:`, error);
      return [];
    }
  }
}

export const eodhdCandleProvider = new EodhdCandleProvider();
