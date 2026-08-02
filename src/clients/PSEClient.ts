import type { UnifiedQuote, QuoteResult } from './types';
import { browserCache } from './BrowserCache';

/**
 * Client for live Philippine Stock Exchange (PSE) prices.
 * Source: phisix-api3.appspot.com — a public mirror of PSE's own live
 * ticker data. This is the same feed used server-side in
 * api/stock/[symbol].ts; see that file's comments for why Yahoo Finance's
 * ".PSE" suffix is NOT used here (it resolves to unrelated US OTC ADR
 * proxies at the wrong price/currency, not real PSE prices).
 */
export class PSEClient {
  private lastError: Error | null = null;

  private toPSESymbol(symbol: string): string {
    return symbol.toUpperCase().trim().replace(/\.PSE$/i, '');
  }

  async fetchQuote(symbol: string, useCache = true): Promise<QuoteResult> {
    const cleanSymbol = this.toPSESymbol(symbol);

    if (useCache) {
      const cached = await browserCache.get(cleanSymbol);
      if (cached) return { success: true, quote: { ...cached, cached: true } };
    }

    try {
      const quote = await this.fetchFromPhisix(cleanSymbol);
      await browserCache.set(quote);
      return { success: true, quote };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: { symbol: cleanSymbol, error: this.lastError.message, source: 'pse', timestamp: Date.now() },
      };
    }
  }

  async fetchBatch(symbols: string[]): Promise<Array<{ symbol: string; quote?: UnifiedQuote; error?: string }>> {
    const concurrency = 5;
    const results: QuoteResult[] = [];

    for (let i = 0; i < symbols.length; i += concurrency) {
      const batch = symbols.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(sym => this.fetchQuote(sym, true)));
      results.push(...batchResults);
    }

    return results.map((r, idx) => ({
      symbol: symbols[idx],
      ...(r.success ? { quote: r.quote } : { error: r.error?.error }),
    }));
  }

  private async fetchFromPhisix(symbol: string): Promise<UnifiedQuote> {
    const url = `https://phisix-api3.appspot.com/stocks/${encodeURIComponent(symbol.toLowerCase())}.json`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`phisix HTTP ${response.status}`);

    const data = await response.json();
    const stock = data?.stocks?.[0];
    if (!stock) throw new Error(`No data for ${symbol}`);

    const price = stock.price?.amount ?? 0;
    if (!price) throw new Error(`No price for ${symbol}`);
    const changePercent = stock.percentChange ?? 0;
    const prevClose = changePercent !== 0 ? price / (1 + changePercent / 100) : price;
    const change = price - prevClose;

    return {
      symbol,
      exchange: 'PSE',
      price,
      change,
      changePercent,
      // phisix exposes only last price + % change — no OHLC/volume detail.
      open: price,
      high: price,
      low: price,
      close: prevClose,
      volume: stock.volume ?? 0,
      source: 'pse',
      timestamp: Date.now(),
      fetched: Date.now(),
      cached: false,
    } as UnifiedQuote;
  }

  getLastError(): Error | null {
    return this.lastError;
  }
}

export const pseClient = new PSEClient();
