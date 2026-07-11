import type { UnifiedQuote, QuoteResult } from './types';
import { browserCache } from './BrowserCache';

// Company name to ticker mapping
const COMPANY_TO_TICKER: { [key: string]: string } = {
  "JOLLIBEE FOODS CORPORATION": "JFC",
  "SM INVESTMENTS INC": "SM",
  "BANCO DE ORO UNIBANK INC": "BDO",
  "BANK OF THE PHILIPPINE ISLANDS": "BPI",
  "MANILA WATER COMPANY INC": "MWC",
  "AYALA CORPORATION": "AC",
  "ABOITIZ EQUITY VENTURES INC": "AEV",
  "AYALA LAND INC": "ALI",
  "MERALCO": "MER",
  "PLDT INC": "PLDT",
};

/**
 * PSE client for live Philippine stock prices.
 * Sources: PSE EDGE, TradingView, Investagrams
 * Maintains same interface as NSEClient for drop-in replacement
 */
export class PSEClient {
  private lastError: Error | null = null;
  private prayatnaUrl = 'http://localhost:8000'; // Local STOCKEX API

  /**
   * Normalize company names to tickers
   */
  private normalizeSymbol(input: string): string {
    const upper = input.toUpperCase().trim();
    return COMPANY_TO_TICKER[upper] || upper;
  }

  /**
   * Fetch PSE quote for Philippine symbol (PSE format)
   */
  async fetchQuote(symbol: string, useCache = true): Promise<QuoteResult> {
    const pseSymbol = this.normalizeSymbol(this.toPSESymbol(symbol));

    // Check cache first
    if (useCache) {
      const cached = await browserCache.get(pseSymbol);
      if (cached) {
        return { success: true, quote: { ...cached, cached: true } };
      }
    }

    try {
      // Try local unified API first (STOCKEX), fall back to the public phisix
      // feed if it's not running. yfinance/.PS is NOT a valid fallback here —
      // verified Yahoo Finance carries no real PSE-listed prices, only US OTC
      // ADR proxies (e.g. BDOUY) at a different price/currency entirely.
      let quote: UnifiedQuote;
      try {
        quote = await this.fetchFromUnifiedAPI(pseSymbol);
      } catch {
        quote = await this.fetchFromPhisix(pseSymbol);
      }
      await browserCache.set(quote);
      return { success: true, quote };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: {
          symbol,
          error: this.lastError.message,
          source: 'pse-unified',
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Batch fetch from PSE with concurrency limiting
   */
  async fetchBatch(symbols: string[]): Promise<Array<{ symbol: string; quote?: UnifiedQuote; error?: string }>> {
    const concurrency = 3;
    const results: QuoteResult[] = [];

    for (let i = 0; i < symbols.length; i += concurrency) {
      const batch = symbols.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(sym => this.fetchQuote(sym, true))
      );
      results.push(...batchResults);
    }

    return results.map((r, idx) => ({
      symbol: symbols[idx],
      ...(r.success ? { quote: r.quote } : { error: r.error?.error }),
    }));
  }

  /**
   * Fetch from unified STOCKEX API (all 3 providers)
   */
  private async fetchFromUnifiedAPI(symbol: string): Promise<UnifiedQuote> {
    try {
      // Try local STOCKEX API first
      const response = await fetch(`${this.prayatnaUrl}/api/stock?symbol=${symbol}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        symbol: symbol.toUpperCase(),
        exchange: 'PSE',
        price: data.price?.current || data.price?.latest_close || 0,
        change: data.price?.change || 0,
        changePercent: data.price?.changePercent || 0,
        source: 'pse',
        timestamp: Date.now(),
        fetched: Date.now(),
        cached: false,
      } as UnifiedQuote;
    } catch (error) {
      throw new Error(`Failed to fetch from STOCKEX API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch from the phisix feed — a community mirror of PSE's own live ticker
   * data. Returns real PHP-denominated PSE prices, unlike yfinance which has
   * no genuine PSE listings (confirmed: .PS/.PSE symbols resolve to unrelated
   * US OTC tickers or nothing at all).
   */
  private async fetchFromPhisix(symbol: string): Promise<UnifiedQuote> {
    const response = await fetch(
      `https://phisix-api3.appspot.com/stocks/${symbol.toLowerCase()}.json`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const stock = data?.stocks?.[0];
    if (!stock) throw new Error(`No phisix data for ${symbol}`);

    const price = stock.price?.amount ?? 0;
    const changePercent = stock.percentChange ?? 0;
    const previousClose = changePercent !== 0 ? price / (1 + changePercent / 100) : price;
    const change = price - previousClose;

    return {
      symbol: symbol.toUpperCase(),
      exchange: 'PSE',
      timestamp: Date.now(),
      price,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: stock.volume ?? 0,
      change,
      changePercent,
      source: 'pse',
      fetched: Date.now(),
      cached: false,
    } as UnifiedQuote;
  }

  /**
   * Convert symbol to PSE format
   */
  private toPSESymbol(symbol: string): string {
    const upper = symbol.toUpperCase().trim();
    // Remove .PS suffix if present
    return upper.replace(/\.PS$/, '');
  }

  /**
   * Format symbol as PSE ticker
   */
  formatSymbol(symbol: string): string {
    return this.normalizeSymbol(this.toPSESymbol(symbol));
  }

  /**
   * Get last error
   */
  getLastError(): Error | null {
    return this.lastError;
  }
}

export const pseClient = new PSEClient();
