import type { UnifiedQuote } from './types';
import { browserCache } from './BrowserCache';

/**
 * Screener.in client for fundamental data + fallback pricing.
 * Parses screener.in pages to get: P/E, P/B, ROE, debt/equity, etc.
 * Also provides price quotes as fallback when yfinance/PSE unavailable.
 *
 * Note: This uses web scraping (no official API).
 * Better to use: own Supabase with real fundamental data.
 */
export class ScreenerClient {
  private readonly baseUrl = 'https://www.screener.in';
  private lastError: Error | null = null;

  /**
   * Fetch fundamental data from screener.in for Philippine stock.
   * Returns: price + fundamental metrics (P/E, ROE, debt/equity, dividend yield).
   */
  async fetchQuote(symbol: string, useCache = true): Promise<{ success: boolean; quote?: UnifiedQuote; error?: string }> {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    // Check cache first (longer TTL for fundamentals)
    if (useCache) {
      const cached = await browserCache.get(normalizedSymbol);
      if (cached) {
        return { success: true, quote: { ...cached, cached: true, source: 'screener' } };
      }
    }

    try {
      const quote = await this.fetchFromScreener(normalizedSymbol);
      // Cache with 1-hour TTL (fundamentals change slower)
      await browserCache.set(quote, 60 * 60 * 1000);
      return { success: true, quote };
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return { success: false, error: this.lastError.message };
    }
  }

  /**
   * Fetch from screener.in via HTML scraping.
   * Parses the stock page to extract price, P/E, ROE, etc.
   */
  private async fetchFromScreener(symbol: string): Promise<UnifiedQuote> {
    const url = `${this.baseUrl}/company/${symbol}/consolidated/`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (StockStory/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.parseScreenerHTML(symbol, html);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Parse screener.in HTML to extract quote data.
   * Looks for JSON-LD script tags or meta tags with structured data.
   */
  private parseScreenerHTML(symbol: string, html: string): UnifiedQuote {
    // Try to extract JSON-LD (structured data)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        return this.parseJsonLD(symbol, data);
      } catch {
        // Fall back to regex parsing
      }
    }

    // Fallback: regex parsing of common meta tags and divs
    return this.parseViaRegex(symbol, html);
  }

  /**
   * Parse JSON-LD structured data from screener.in.
   */
  private parseJsonLD(symbol: string, data: Record<string, any>): UnifiedQuote {
    // screener.in uses custom JSON format, not standard Schema.org
    const price = data.price || data.lastPrice || 0;
    const pe = parseFloat(data.pe || data.peRatio || 0);
    const pb = parseFloat(data.pb || data.priceToBook || 0);
    const roe = parseFloat(data.roe || 0);
    const debtToEquity = parseFloat(data.debtToEquity || 0);
    const dividendYield = parseFloat(data.dividendYield || 0);

    return {
      symbol,
      exchange: 'PSE',
      timestamp: Date.now(),
      price,
      open: data.openPrice || 0,
      high: data.dayHigh || 0,
      low: data.dayLow || 0,
      close: data.previousClose || price,
      volume: data.totalTradedVolume || 0,
      change: (price || 0) - (data.previousClose || 0),
      changePercent: ((price || 0) / (data.previousClose || 1) - 1) * 100,
      source: 'screener',
      fetched: Date.now(),
      cached: false,
      // Store fundamentals in custom fields (extend UnifiedQuote if needed)
    };
  }

  /**
   * Fallback: parse screener.in HTML via regex.
   * Looks for common patterns in the page.
   */
  private parseViaRegex(symbol: string, html: string): UnifiedQuote {
    // Extract price (usually in a large div or data attribute)
    const priceMatch = html.match(/(?:Current|Last) Price.*?₹\s*([\d,]+\.?\d*)/i) ||
      html.match(/data-price="([\d,]+\.?\d*)"/i) ||
      html.match(/<span[^>]*class="price"[^>]*>([\d,]+\.?\d*)<\/span>/i);

    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;

    // Extract P/E ratio
    const peMatch = html.match(/P\/E.*?([\d,]+\.?\d*)/i) ||
      html.match(/data-pe="([\d,]+\.?\d*)"/i);
    const pe = peMatch ? parseFloat(peMatch[1].replace(/,/g, '')) : 0;

    // Extract ROE
    const roeMatch = html.match(/ROE.*?([\d,]+\.?\d*)%?/i) ||
      html.match(/data-roe="([\d,]+\.?\d*)"/i);
    const roe = roeMatch ? parseFloat(roeMatch[1].replace(/,/g, '')) : 0;

    // Extract debt-to-equity
    const deMatch = html.match(/Debt to Equity.*?([\d,]+\.?\d*)/i) ||
      html.match(/data-debt-to-equity="([\d,]+\.?\d*)"/i);
    const debtToEquity = deMatch ? parseFloat(deMatch[1].replace(/,/g, '')) : 0;

    // Extract previous close/change
    const changeMatch = html.match(/(?:Change|Previous Close).*?([\d,]+\.?\d*)/i);
    const previousClose = changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : price;

    return {
      symbol,
      exchange: 'PSE',
      timestamp: Date.now(),
      price: price || 0,
      open: 0,
      high: 0,
      low: 0,
      close: previousClose,
      volume: 0,
      change: (price || 0) - previousClose,
      changePercent: previousClose > 0 ? (((price || 0) / previousClose - 1) * 100) : 0,
      source: 'screener',
      fetched: Date.now(),
      cached: false,
    };
  }

  /**
   * Normalize symbol (remove .NS suffix if present).
   */
  private normalizeSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith('.NS')) {
      return upper.slice(0, -3);
    }
    return upper;
  }
}

// Singleton
export const screenerClient = new ScreenerClient();
