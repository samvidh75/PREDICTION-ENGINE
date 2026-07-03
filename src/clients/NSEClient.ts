import type { UnifiedQuote, QuoteResult } from './types';
import { browserCache } from './BrowserCache';

/**
 * NSE client for live Indian stock prices.
 * Primary: jugasad API (if configured)
 * Fallback: screener.in data via ScreenerClient
 */
export class NSEClient {
  private readonly baseUrl = process.env.REACT_APP_NSE_PROXY_URL || 'https://api.jugasad.io/nse';
  private lastError: Error | null = null;

  /**
   * Fetch NSE quote for Indian symbol (auto-adds .NS if not present).
   */
  async fetchQuote(symbol: string, useCache = true): Promise<QuoteResult> {
    const nseSymbol = this.toNSESymbol(symbol);

    // Check cache first
    if (useCache) {
      const cached = await browserCache.get(nseSymbol);
      if (cached) {
        return { success: true, quote: { ...cached, cached: true } };
      }
    }

    try {
      const quote = await this.fetchFromJugasad(nseSymbol);
      await browserCache.set(quote);
      return { success: true, quote };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: {
          symbol,
          error: this.lastError.message,
          source: 'jugasad',
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Batch fetch from NSE with concurrency limiting.
   */
  async fetchBatch(symbols: string[]): Promise<Array<{ symbol: string; quote?: UnifiedQuote; error?: string }>> {
    const concurrency = 3;
    const results: QuoteResult[] = [];

    for (let i = 0; i < symbols.length; i += concurrency) {
      const batch = symbols.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((s) => this.fetchQuote(s, true)));
      results.push(...batchResults);
    }

    return symbols.map((symbol, index) => {
      const result = results[index];
      return result.success
        ? { symbol, quote: result.quote }
        : { symbol, error: result.error?.error };
    });
  }

  /**
   * Internal: fetch from jugasad API.
   * jugasad exposes NSE API via simple HTTP wrapper.
   */
  private async fetchFromJugasad(symbol: string): Promise<UnifiedQuote> {
    // Try local proxy first (for development)
    const endpoints = [
      `${this.baseUrl}/quote/${symbol}`, // configured proxy
      `https://api.jugasad.io/nse/quote/${symbol}`, // fallback public API
    ];

    let lastError: Error | null = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'StockStory/1.0',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as NSEQuoteResponse;
        return this.parseNSEResponse(symbol, data);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw lastError || new Error('All NSE endpoints failed');
  }

  /**
   * Parse jugasad/NSE response into UnifiedQuote.
   */
  private parseNSEResponse(symbol: string, data: NSEQuoteResponse): UnifiedQuote {
    const quote = data.data || {};

    if (!quote.lastPrice) {
      throw new Error(`No price data for ${symbol}`);
    }

    return {
      symbol,
      exchange: 'NSE',
      timestamp: Date.now(),
      price: quote.lastPrice,
      open: quote.openPrice || 0,
      high: quote.dayHigh || 0,
      low: quote.dayLow || 0,
      close: quote.previousClose || 0,
      volume: quote.totalTradedVolume || 0,
      bid: quote.bidPrice,
      ask: quote.askPrice,
      bidSize: quote.bidQty,
      askSize: quote.askQty,
      change: (quote.lastPrice || 0) - (quote.previousClose || 0),
      changePercent: quote.pChange || 0,
      source: 'jugasad',
      fetched: Date.now(),
      cached: false,
    };
  }

  /**
   * Convert symbol to NSE format (e.g., "RELIANCE" → "RELIANCE.NS").
   */
  private toNSESymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.includes('.')) return upper;
    return `${upper}.NS`;
  }
}

interface NSEQuoteResponse {
  data?: {
    symbol?: string;
    lastPrice?: number;
    openPrice?: number;
    dayHigh?: number;
    dayLow?: number;
    previousClose?: number;
    totalTradedVolume?: number;
    bidPrice?: number;
    askPrice?: number;
    bidQty?: number;
    askQty?: number;
    pChange?: number; // percentage change
  };
}

// Singleton
export const nseClient = new NSEClient();
