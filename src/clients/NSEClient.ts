import type { UnifiedQuote, QuoteResult } from './types';
import { browserCache } from './BrowserCache';

/**
 * PSE (Philippine Stock Exchange) Client
 * Fetches live Philippine stock prices from yfinance and fallback providers.
 */
export class PSEClient {
  private readonly yfinanceBaseUrl = 'https://query1.finance.yahoo.com';
  private lastError: Error | null = null;

  /**
   * Fetch PSE quote (auto-adds .PSE if not present).
   */
  async fetchQuote(symbol: string, useCache = true): Promise<QuoteResult> {
    const pseSymbol = this.toPSESymbol(symbol);

    // Check cache first
    if (useCache) {
      const cached = await browserCache.get(pseSymbol);
      if (cached) {
        return { success: true, quote: { ...cached, cached: true } };
      }
    }

    try {
      const quote = await this.fetchFromYFinance(pseSymbol);
      await browserCache.set(quote);
      return { success: true, quote };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: {
          symbol,
          error: this.lastError.message,
          source: 'yfinance',
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Batch fetch from PSE with concurrency limiting.
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
   * Internal: fetch from yfinance API.
   */
  private async fetchFromYFinance(symbol: string): Promise<UnifiedQuote> {
    try {
      const response = await fetch(
        `${this.yfinanceBaseUrl}/v10/finance/quoteSummary/${symbol}?modules=price`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const priceData = data.quoteSummary?.result?.[0]?.price;

      if (!priceData) {
        throw new Error(`No price data for ${symbol}`);
      }

      return this.parseYFinanceResponse(symbol, priceData);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Parse yfinance response into UnifiedQuote.
   */
  private parseYFinanceResponse(symbol: string, data: any): UnifiedQuote {
    const price = parseFloat(data.regularMarketPrice?.raw || 0);
    const previousClose = parseFloat(data.regularMarketPreviousClose?.raw || price);
    const change = price - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol,
      exchange: 'PSE',
      timestamp: Date.now(),
      price,
      open: parseFloat(data.regularMarketOpen?.raw || 0),
      high: parseFloat(data.fiftyTwoWeekHigh?.raw || 0),
      low: parseFloat(data.fiftyTwoWeekLow?.raw || 0),
      close: previousClose,
      volume: data.regularMarketVolume?.raw || 0,
      bid: parseFloat(data.bid?.raw || 0),
      ask: parseFloat(data.ask?.raw || 0),
      bidSize: data.bidSize || 0,
      askSize: data.askSize || 0,
      change,
      changePercent,
      source: 'yfinance',
      fetched: Date.now(),
      cached: false,
    };
  }

  /**
   * Convert symbol to PSE format (e.g., "BDO" → "BDO.PSE").
   */
  private toPSESymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.includes('.')) return upper;
    return `${upper}.PSE`;
  }
}

// Singleton
export const pseClient = new PSEClient();
