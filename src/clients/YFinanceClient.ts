import type { UnifiedQuote, QuoteResult, BatchQuoteResponse } from './types';
import { browserCache } from './BrowserCache';

/**
 * Direct yfinance client for browser.
 * Calls yfinance API endpoints directly (CORS-enabled URLs).
 * Falls back to alternative endpoints if primary fails.
 */
export class YFinanceClient {
  private readonly endpoints = [
    'https://query1.finance.yahoo.com/v8/finance/chart',
    'https://query2.finance.yahoo.com/v8/finance/chart', // fallback
  ];

  private currentEndpointIndex = 0;
  private lastError: Error | null = null;

  /**
   * Fetch a single quote from yfinance.
   */
  async fetchQuote(symbol: string, useCache = true): Promise<QuoteResult> {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    // Check cache first
    if (useCache) {
      const cached = await browserCache.get(normalizedSymbol);
      if (cached) {
        return { success: true, quote: { ...cached, cached: true } };
      }
    }

    try {
      const quote = await this.fetchFromYFinance(normalizedSymbol);
      // Cache the result
      await browserCache.set(quote);
      return { success: true, quote };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: {
          symbol,
          error: (this.lastError as Error).message || String(this.lastError),
          source: 'yfinance',
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Batch fetch multiple quotes.
   */
  async fetchBatch(symbols: string[]): Promise<BatchQuoteResponse> {
    const startTime = Date.now();

    // Check cache first
    const cachedSymbols = new Map<string, UnifiedQuote>();
    const uncachedSymbols: string[] = [];

    for (const symbol of symbols) {
      const cached = await browserCache.get(symbol);
      if (cached) {
        cachedSymbols.set(symbol, { ...cached, cached: true });
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Fetch uncached symbols in parallel (with concurrency limit)
    const concurrency = 5;
    const quotes: UnifiedQuote[] = Array.from(cachedSymbols.values());
    const errors: Array<{ symbol: string; error: string; source: string; timestamp: number }> = [];

    for (let i = 0; i < uncachedSymbols.length; i += concurrency) {
      const batch = uncachedSymbols.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((s) => this.fetchQuote(s, false)));

      for (const result of results) {
        if (result.success && result.quote) {
          quotes.push(result.quote);
        } else if (result.error) {
          errors.push(result.error);
        }
      }
    }

    return {
      quotes,
      errors,
      fetchedAt: Date.now(),
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Internal: fetch from yfinance API with retries and fallback.
   */
  private async fetchFromYFinance(symbol: string): Promise<UnifiedQuote> {
    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const endpoint = this.endpoints[this.currentEndpointIndex];
        const url = `${endpoint}/${symbol}?interval=1d&range=5d`;

        const response = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (StockStory/1.0)' },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as YFinanceResponse;
        return this.parseYFinanceResponse(symbol, data);
      } catch (error) {
        // Rotate endpoint on failure
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;

        if (attempt === maxRetries - 1) {
          throw error;
        }
        // Wait before retry
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }

    throw new Error('All yfinance endpoints failed');
  }

  /**
   * Parse yfinance response into UnifiedQuote.
   */
  private parseYFinanceResponse(symbol: string, data: YFinanceResponse): UnifiedQuote {
    const result = data.chart.result?.[0];
    if (!result) throw new Error('Invalid yfinance response');

    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const opens = result.indicators?.quote?.[0]?.open || [];
    const highs = result.indicators?.quote?.[0]?.high || [];
    const lows = result.indicators?.quote?.[0]?.low || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const volumes = result.indicators?.quote?.[0]?.volume || [];

    // Latest values (most recent timestamp)
    const latestIndex = timestamps.length - 1;
    const price = closes[latestIndex] || meta.regularMarketPrice || 0;
    const open = opens[latestIndex] || meta.regularMarketOpen || 0;
    const high = highs[latestIndex] || meta.regularMarketDayHigh || 0;
    const low = lows[latestIndex] || meta.regularMarketDayLow || 0;
    const volume = volumes[latestIndex] || 0;
    const change = price - (meta.previousClose || 0);
    const changePercent = meta.previousClose ? (change / meta.previousClose) * 100 : 0;

    return {
      symbol,
      exchange: this.guessExchange(symbol),
      timestamp: (timestamps[latestIndex] || 0) * 1000,
      price,
      open,
      high,
      low,
      close: price,
      volume,
      change,
      changePercent,
      source: 'yfinance',
      fetched: Date.now(),
      cached: false,
    };
  }

  /**
   * Guess exchange from symbol suffix (NS=NSE, BO=BSE, no suffix=NASDAQ/NYSE).
   */
  private guessExchange(symbol: string): 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE' {
    if (symbol.endsWith('.NS')) return 'NSE';
    if (symbol.endsWith('.BO')) return 'BSE';
    if (symbol.includes('-')) return 'NASDAQ';
    return 'NYSE';
  }

  /**
   * Normalize symbol for yfinance (add .NS/.BO for Indian stocks if missing).
   */
  private normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    // If already has exchange suffix, return as-is
    if (upper.includes('.')) return upper;
    // Default to NSE for Indian stocks
    return `${upper}.NS`;
  }
}

interface YFinanceResponse {
  chart: {
    result?: Array<{
      meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        regularMarketPrice: number;
        regularMarketOpen: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        previousClose: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: number[];
          high?: number[];
          low?: number[];
          close?: number[];
          volume?: number[];
        }>;
      };
    }>;
  };
}

// Singleton instance
export const yfinanceClient = new YFinanceClient();
