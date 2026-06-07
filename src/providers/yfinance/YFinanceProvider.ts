/**
 * TRACK-38A — YFinanceProvider
 * Implements MarketDataProvider interface using the 'yfinance' npm package.
 * Wraps yfinance.Ticker for single-symbol operations with:
 *  - Token-bucket rate limiting (max 2 req/sec)
 *  - Exponential backoff retry (3 attempts: 1s, 2s, 4s)
 *  - In-memory LRU cache (max 500 entries, TTL 60s)
 *  - Graceful error handling (returns null/empty, never throws)
 */

import yf from 'yfinance';
import { LRUCache } from 'lru-cache';
import type {
  DailyPriceRecord,
  CorporateAction,
  YahooTickerInfo,
  MarketDataProvider,
} from './types';
import { YFinanceHealthEngine } from './YFinanceHealthEngine';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum requests per second (token bucket refill rate). */
const MAX_RPS = 2;

/** Maximum retry attempts before giving up. */
const MAX_RETRIES = 3;

/** Initial retry delay in milliseconds (doubles each retry). */
const BASE_RETRY_DELAY_MS = 1000;

/** LRU cache max entries. */
const CACHE_MAX_ENTRIES = 500;

/** LRU cache TTL in milliseconds (60 seconds). */
const CACHE_TTL_MS = 60_000;

// ---------------------------------------------------------------------------
// Token Bucket
// ---------------------------------------------------------------------------

class TokenBucket {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(maxTokens: number = MAX_RPS) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = maxTokens / 1000; // tokens per millisecond
    this.lastRefill = Date.now();
  }

  /** Refill tokens based on elapsed time, then try to consume 1 token. */
  consume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Wait until a token is available, then consume it. */
  async waitAndConsume(): Promise<void> {
    while (!this.consume()) {
      // Calculate how long until the next token arrives
      const deficit = 1 - this.tokens;
      const waitMs = (deficit / this.refillRate);
      // Cap wait at a reasonable floor to avoid busy-waiting
      const actualWait = Math.max(waitMs, 50);
      await new Promise((resolve) => setTimeout(resolve, actualWait));
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    }
    this.lastRefill = now;
  }
}

// ---------------------------------------------------------------------------
// LRU Cache wrapper
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// YFinanceProvider
// ---------------------------------------------------------------------------

export class YFinanceProvider implements MarketDataProvider {
  private readonly bucket: TokenBucket;
  private readonly cache: LRUCache<string, CacheEntry<any>>;
  private readonly health: YFinanceHealthEngine;

  constructor() {
    this.bucket = new TokenBucket(MAX_RPS);
    this.health = new YFinanceHealthEngine();
    this.cache = new LRUCache<string, CacheEntry<any>>({
      max: CACHE_MAX_ENTRIES,
      ttl: CACHE_TTL_MS,
    });
  }

  // -----------------------------------------------------------------------
  // getHistoricalPrices
  // -----------------------------------------------------------------------

  /**
   * Fetch historical OHLCV prices for a single symbol.
   *
   * @param symbol   — Yahoo Finance symbol (e.g. "RELIANCE.NS")
   * @param period   — Period string expected by yfinance (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
   * @param interval — Candle interval (1d, 1wk, 1mo); defaults to '1d'
   * @returns Array of DailyPriceRecord, empty array on failure.
   */
  async getHistoricalPrices(
    symbol: string,
    period: string = '1y',
    interval: string = '1d',
  ): Promise<DailyPriceRecord[]> {
    const cacheKey = `history:${symbol}:${period}:${interval}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const result = await this.withRetry(async () => {
        const ticker = yf.Ticker(symbol);
        const raw = await ticker.history(period, interval);
        return raw;
      });

      // yfinance returns an object keyed by date; convert to array if needed
      const rowsArray: any[] = this.normalizeHistoryResponse(result);

      const records: DailyPriceRecord[] = [];
      const ingestedAt = new Date().toISOString();

      for (const row of rowsArray) {
        const dateVal = row.Date ?? row.date ?? '';
        if (!dateVal) continue;

        records.push({
          symbol,
          date: String(dateVal),
          open: Number(row.Open ?? row.open ?? 0),
          high: Number(row.High ?? row.high ?? 0),
          low: Number(row.Low ?? row.low ?? 0),
          close: Number(row.Close ?? row.close ?? 0),
          adj_close: Number(row['Adj Close'] ?? row.adj_close ?? row.adjClose ?? 0),
          volume: Number(row.Volume ?? row.volume ?? 0),
          dividends: Number(row.Dividends ?? row.dividends ?? 0),
          stock_splits: Number(row['Stock Splits'] ?? row.stock_splits ?? row.stockSplits ?? 0),
          source: 'yfinance',
          quality_score: 100,
          ingested_at: ingestedAt,
        });
      }

      this.cache.set(cacheKey, { data: records, timestamp: Date.now() });
      this.health.recordSuccess();
      return records;
    } catch (error: any) {
      this.health.recordFailure(error?.message ?? String(error));
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // getLatestPrice
  // -----------------------------------------------------------------------

  /**
   * Fetch the most recent daily price record for a symbol.
   *
   * @param symbol — Yahoo Finance symbol.
   * @returns DailyPriceRecord or null on failure.
   */
  async getLatestPrice(symbol: string): Promise<DailyPriceRecord | null> {
    const cacheKey = `latest:${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const result = await this.withRetry(async () => {
        const ticker = yf.Ticker(symbol);
        // Fetch 5 days to ensure we get the latest trading day
        const raw = await ticker.history('5d', '1d');
        return raw;
      });

      const rowsArray: any[] = this.normalizeHistoryResponse(result);
      if (rowsArray.length === 0) {
        this.health.recordSuccess();
        return null;
      }

      // Take the most recent row (last in the array after normalization)
      const row = rowsArray[rowsArray.length - 1];
      const dateVal = row.Date ?? row.date ?? '';

      const record: DailyPriceRecord = {
        symbol,
        date: String(dateVal),
        open: Number(row.Open ?? row.open ?? 0),
        high: Number(row.High ?? row.high ?? 0),
        low: Number(row.Low ?? row.low ?? 0),
        close: Number(row.Close ?? row.close ?? 0),
        adj_close: Number(row['Adj Close'] ?? row.adj_close ?? row.adjClose ?? 0),
        volume: Number(row.Volume ?? row.volume ?? 0),
        dividends: Number(row.Dividends ?? row.dividends ?? 0),
        stock_splits: Number(row['Stock Splits'] ?? row.stock_splits ?? row.stockSplits ?? 0),
        source: 'yfinance',
        quality_score: 100,
        ingested_at: new Date().toISOString(),
      };

      this.cache.set(cacheKey, { data: record, timestamp: Date.now() });
      this.health.recordSuccess();
      return record;
    } catch (error: any) {
      this.health.recordFailure(error?.message ?? String(error));
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // getCorporateActions
  // -----------------------------------------------------------------------

  /**
   * Fetch corporate actions (dividends and splits) for a symbol.
   *
   * @param symbol — Yahoo Finance symbol.
   * @returns Array of CorporateAction, empty array on failure.
   */
  async getCorporateActions(symbol: string): Promise<CorporateAction[]> {
    const cacheKey = `actions:${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.data;
    }

    const actions: CorporateAction[] = [];

    try {
      await this.bucket.waitAndConsume();

      const ticker = yf.Ticker(symbol);

      // Fetch dividends and splits separately — each may fail independently
      let dividendsData: any = null;
      let splitsData: any = null;

      try {
        dividendsData = await ticker.dividends();
      } catch {
        // dividends call failed, continue to splits
      }

      try {
        splitsData = await ticker.splits();
      } catch {
        // splits call failed, continue
      }

      // Parse dividends
      if (dividendsData) {
        const divs = this.normalizeActionResponse(dividendsData);
        for (const row of divs) {
          const dateVal = row.Date ?? row.date ?? '';
          const divValue = Number(row.Dividends ?? row.dividends ?? 0);
          if (dateVal && divValue > 0) {
            actions.push({
              symbol,
              date: String(dateVal),
              type: 'dividend',
              value: divValue,
              source: 'yfinance',
            });
          }
        }
      }

      // Parse splits
      if (splitsData) {
        const spl = this.normalizeActionResponse(splitsData);
        for (const row of spl) {
          const dateVal = row.Date ?? row.date ?? '';
          const splitValue = Number(row['Stock Splits'] ?? row.stock_splits ?? row.StockSplits ?? 0);
          if (dateVal && splitValue > 0) {
            actions.push({
              symbol,
              date: String(dateVal),
              type: 'split',
              value: splitValue,
              source: 'yfinance',
            });
          }
        }
      }

      this.cache.set(cacheKey, { data: actions, timestamp: Date.now() });
      this.health.recordSuccess();
      return actions;
    } catch (error: any) {
      this.health.recordFailure(error?.message ?? String(error));
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // getMarketMetadata
  // -----------------------------------------------------------------------

  /**
   * Fetch ticker metadata/info from Yahoo Finance.
   *
   * @param symbol — Yahoo Finance symbol.
   * @returns YahooTickerInfo or null on failure.
   */
  async getMarketMetadata(symbol: string): Promise<YahooTickerInfo | null> {
    const cacheKey = `metadata:${symbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached.data;
    }

    try {
      const result = await this.withRetry(async () => {
        const ticker = yf.Ticker(symbol);
        const info = await ticker.info();
        return info;
      });

      const tickerInfo: YahooTickerInfo = {
        symbol: symbol,
        shortName: result.shortName ?? undefined,
        longName: result.longName ?? undefined,
        sector: result.sector ?? undefined,
        industry: result.industry ?? undefined,
        marketCap: result.marketCap != null ? Number(result.marketCap) : undefined,
        sharesOutstanding: result.sharesOutstanding != null ? Number(result.sharesOutstanding) : undefined,
        beta: result.beta != null ? Number(result.beta) : undefined,
        previousClose: result.previousClose != null ? Number(result.previousClose) : undefined,
        regularMarketOpen: result.regularMarketOpen != null ? Number(result.regularMarketOpen) : undefined,
        regularMarketDayHigh: result.regularMarketDayHigh != null ? Number(result.regularMarketDayHigh) : undefined,
        regularMarketDayLow: result.regularMarketDayLow != null ? Number(result.regularMarketDayLow) : undefined,
        regularMarketVolume: result.regularMarketVolume != null ? Number(result.regularMarketVolume) : undefined,
        fiftyTwoWeekHigh: result.fiftyTwoWeekHigh != null ? Number(result.fiftyTwoWeekHigh) : undefined,
        fiftyTwoWeekLow: result.fiftyTwoWeekLow != null ? Number(result.fiftyTwoWeekLow) : undefined,
        fiftyDayAverage: result.fiftyDayAverage != null ? Number(result.fiftyDayAverage) : undefined,
        twoHundredDayAverage: result.twoHundredDayAverage != null ? Number(result.twoHundredDayAverage) : undefined,
        currency: result.currency ?? undefined,
        exchange: result.exchange ?? undefined,
        quoteType: result.quoteType ?? undefined,
        trailingPE: result.trailingPE != null ? Number(result.trailingPE) : undefined,
        forwardPE: result.forwardPE != null ? Number(result.forwardPE) : undefined,
        priceToBook: result.priceToBook != null ? Number(result.priceToBook) : undefined,
        earningsPerShare: result.earningsPerShare != null ? Number(result.earningsPerShare) : undefined,
        dividendRate: result.dividendRate != null ? Number(result.dividendRate) : undefined,
        dividendYield: result.dividendYield != null ? Number(result.dividendYield) : undefined,
        bookValue: result.bookValue != null ? Number(result.bookValue) : undefined,
        returnOnEquity: result.returnOnEquity != null ? Number(result.returnOnEquity) : undefined,
        revenuePerShare: result.revenuePerShare != null ? Number(result.revenuePerShare) : undefined,
        totalCashPerShare: result.totalCashPerShare != null ? Number(result.totalCashPerShare) : undefined,
        totalDebtPerShare: result.totalDebtPerShare != null ? Number(result.totalDebtPerShare) : undefined,
        debtToEquity: result.debtToEquity != null ? Number(result.debtToEquity) : undefined,
        recommendationKey: result.recommendationKey ?? undefined,
        numberOfAnalystOpinions: result.numberOfAnalystOpinions != null ? Number(result.numberOfAnalystOpinions) : undefined,
        targetHighPrice: result.targetHighPrice != null ? Number(result.targetHighPrice) : undefined,
        targetLowPrice: result.targetLowPrice != null ? Number(result.targetLowPrice) : undefined,
        targetMeanPrice: result.targetMeanPrice != null ? Number(result.targetMeanPrice) : undefined,
      };

      this.cache.set(cacheKey, { data: tickerInfo, timestamp: Date.now() });
      this.health.recordSuccess();
      return tickerInfo;
    } catch (error: any) {
      this.health.recordFailure(error?.message ?? String(error));
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Health / diagnostics
  // -----------------------------------------------------------------------

  /**
   * Expose the health engine for external monitoring.
   */
  getHealthEngine(): YFinanceHealthEngine {
    return this.health;
  }

  /**
   * Clear the entire cache. Useful for testing or forced refresh.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Return the current cache size.
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Retry a function with exponential backoff.
   * Attempts: 1 + MAX_RETRIES = 4 total attempts.
   * Delays: 1s, 2s, 4s.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Always respect rate limit before each attempt
        await this.bucket.waitAndConsume();
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error('Retry exhausted with unknown error');
  }

  /**
   * Normalize the response from ticker.history() into a plain array of rows.
   * yfinance may return an object keyed by date strings (when period is used)
   * or an array directly. We handle both shapes.
   */
  private normalizeHistoryResponse(raw: any): any[] {
    if (raw == null) return [];

    // If it's already an array, return it
    if (Array.isArray(raw)) return raw;

    // If it has a results property (some versions), use that
    if (Array.isArray(raw.results)) return raw.results;
    if (Array.isArray(raw.rows)) return raw.rows;
    if (Array.isArray(raw.data)) return raw.data;

    // If it's an object keyed by date strings, convert to array
    if (typeof raw === 'object') {
      const entries = Object.entries(raw);
      if (entries.length > 0) {
        return entries.map(([dateKey, row]) => {
          if (row && typeof row === 'object') {
            return { Date: dateKey, ...(row as Record<string, unknown>) };
          }
          return { Date: dateKey };
        });
      }
    }

    return [];
  }

  /**
   * Normalize the response from ticker.dividends() / ticker.splits() into an array.
   */
  private normalizeActionResponse(raw: any): any[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.results)) return raw.results;
    if (Array.isArray(raw.rows)) return raw.rows;

    // Object keyed by date strings
    if (typeof raw === 'object') {
      const entries = Object.entries(raw);
      if (entries.length > 0) {
        return entries.map(([dateKey, value]) => {
          // value may be a number (just the amount) or an object
          if (typeof value === 'number') {
            return { Date: dateKey, Dividends: value };
          }
          if (value && typeof value === 'object') {
            return { Date: dateKey, ...(value as Record<string, unknown>) };
          }
          return { Date: dateKey };
        });
      }
    }

    return [];
  }
}

export default YFinanceProvider;