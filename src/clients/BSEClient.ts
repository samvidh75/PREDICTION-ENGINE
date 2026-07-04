/**
 * BSE (Bombay Stock Exchange) Client
 * Fetches real-time quotes and fundamentals for BSE-listed stocks
 *
 * Coverage: 1,500+ BSE-listed stocks + SME/EMERGE stocks
 * Data Sources:
 *   1. BSE India Official API
 *   2. BSE Website Scraping (fallback)
 *   3. Screener.in BSE data (secondary fallback)
 */

import type { UnifiedQuote } from './types';

export interface BSEQuoteResponse {
  success: boolean;
  quote?: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    bid: number;
    ask: number;
    high: number;
    low: number;
    open: number;
    close: number;
    timestamp: string;
    market: 'BSE' | 'BSE_EMERGE' | 'BSE_SME';
  };
  error?: string;
}

interface BSEFundamentals {
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  marketCap?: number;
  eps?: number;
  bookValue?: number;
  roe?: number;
  sector?: string;
  industry?: string;
}

export class BSEClient {
  private readonly baseUrl = 'https://www.bseindia.com';
  private readonly apiUrl = 'https://api.bseindia.com';
  private readonly requestTimeout = 8000; // 8 seconds
  private cache = new Map<string, { data: UnifiedQuote; timestamp: number }>();
  private readonly cacheTTL = 60000; // 1 minute

  /**
   * Fetch a quote from BSE
   * Tries multiple endpoints in sequence
   */
  async fetchQuote(symbol: string): Promise<{ success: boolean; quote?: UnifiedQuote; error?: string }> {
    const cacheKey = `bse_${symbol}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return { success: true, quote: { ...cached.data, cached: true } };
    }

    try {
      // Method 1: Try official BSE API
      const quote = await this.fetchFromBSEAPI(symbol);
      if (quote) {
        this.cache.set(cacheKey, { data: quote, timestamp: Date.now() });
        return { success: true, quote };
      }

      // Method 2: Scrape BSE website
      const scrapedQuote = await this.scrapeBSEWebsite(symbol);
      if (scrapedQuote) {
        this.cache.set(cacheKey, { data: scrapedQuote, timestamp: Date.now() });
        return { success: true, quote: scrapedQuote };
      }

      // Method 3: Try Screener.in for BSE data
      const screenerQuote = await this.fetchFromScreenerBSE(symbol);
      if (screenerQuote) {
        this.cache.set(cacheKey, { data: screenerQuote, timestamp: Date.now() });
        return { success: true, quote: screenerQuote };
      }

      return {
        success: false,
        error: `BSE data not available for ${symbol}`,
      };
    } catch (error) {
      console.error(`[BSEClient] Error fetching ${symbol}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch from official BSE API endpoint
   */
  private async fetchFromBSEAPI(symbol: string): Promise<UnifiedQuote | null> {
    try {
      const bseSymbol = this.normalizeBSESymbol(symbol);
      const url = `${this.apiUrl}/BseData/GetQuote/?scripcode=${bseSymbol}`;

      const response = await Promise.race([
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), this.requestTimeout)),
      ]);

      if (!response.ok) return null;

      const data = await response.json() as any;

      if (data.status === 'success' && data.data) {
        const price = parseFloat(data.data.lastprice) || 0;
        const changeAbs = parseFloat(data.data.netchange) || 0;
        return {
          symbol,
          exchange: 'BSE',
          timestamp: Date.now(),
          price,
          open: parseFloat(data.data.open) || 0,
          high: parseFloat(data.data.high) || 0,
          low: parseFloat(data.data.low) || 0,
          close: parseFloat(data.data.close) || 0,
          volume: parseInt(data.data.volume, 10) || 0,
          bid: parseFloat(data.data.bid) || 0,
          ask: parseFloat(data.data.ask) || 0,
          change: changeAbs,
          changePercent: parseFloat(data.data.percentchange) || 0,
          source: 'bse',
          fetched: Date.now(),
          cached: false,
        };
      }

      return null;
    } catch (error) {
      console.debug(`[BSEClient] BSE API failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Scrape BSE website for real-time data
   */
  private async scrapeBSEWebsite(symbol: string): Promise<UnifiedQuote | null> {
    try {
      const bseSymbol = this.normalizeBSESymbol(symbol);

      // Try direct quote endpoint
      const url = `${this.baseUrl}/market-data/stock-quotes/${bseSymbol}`;

      const response = await Promise.race([
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), this.requestTimeout)),
      ]);

      if (!response.ok) return null;

      const html = await response.text();

      // Parse price from HTML using regex patterns
      // eslint-disable-next-line no-useless-escape
      const priceMatch = html.match(/"price":\s*([0-9.]+)/);
      // eslint-disable-next-line no-useless-escape
      const changeMatch = html.match(/"change":\s*([-0-9.]+)/);
      // eslint-disable-next-line no-useless-escape
      const volumeMatch = html.match(/"volume":\s*([0-9]+)/);

      if (priceMatch) {
        const price = parseFloat(priceMatch[1]) || 0;
        const changePercent = parseFloat(changeMatch?.[1] || '0') || 0;
        return {
          symbol,
          exchange: 'BSE',
          timestamp: Date.now(),
          price,
          open: 0,
          high: 0,
          low: 0,
          close: price,
          volume: parseInt(volumeMatch?.[1] || '0', 10) || 0,
          change: 0,
          changePercent,
          source: 'bse',
          fetched: Date.now(),
          cached: false,
        };
      }

      return null;
    } catch (error) {
      console.debug(`[BSEClient] BSE website scrape failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch BSE data from Screener.in (secondary source)
   */
  private async fetchFromScreenerBSE(symbol: string): Promise<UnifiedQuote | null> {
    try {
      const url = `https://www.screener.in/api/company/${symbol}/financials/`;

      const response = await Promise.race([
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), this.requestTimeout)),
      ]);

      if (!response.ok) return null;

      const data = await response.json() as any;

      if (data.current_price) {
        const price = data.current_price || 0;
        return {
          symbol,
          exchange: 'BSE',
          timestamp: Date.now(),
          price,
          open: 0,
          high: 0,
          low: 0,
          close: price,
          volume: data.volume || 0,
          change: 0,
          changePercent: data.pct_change || 0,
          source: 'bse',
          fetched: Date.now(),
          cached: false,
        };
      }

      return null;
    } catch (error) {
      console.debug(`[BSEClient] Screener BSE fallback failed for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch fundamentals for BSE stock
   */
  async fetchFundamentals(symbol: string): Promise<{ success: boolean; data?: BSEFundamentals; error?: string }> {
    try {
      const url = `${this.baseUrl}/market-data/stock-info/${symbol}/fundamentals`;

      const response = await Promise.race([
        fetch(url),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), this.requestTimeout)),
      ]);

      if (!response.ok) return { success: false, error: 'Fundamentals not found' };

      const html = await response.text();

      // Parse fundamentals from HTML
      const peMatch = html.match(/P\/E Ratio[^0-9]*([0-9.]+)/);
      const roEMatch = html.match(/ROE[^0-9]*([0-9.]+)/);
      const dividendMatch = html.match(/Dividend Yield[^0-9]*([0-9.]+)/);

      return {
        success: true,
        data: {
          peRatio: peMatch ? parseFloat(peMatch[1]) : undefined,
          roe: roEMatch ? parseFloat(roEMatch[1]) : undefined,
          dividendYield: dividendMatch ? parseFloat(dividendMatch[1]) : undefined,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all BSE symbols (for screening)
   */
  async getAllBSESymbols(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/market-data/all-securities/`;
      const response = await fetch(url);
      const html = await response.text();

      // Extract symbols from HTML
      const symbolMatches = html.match(/data-symbol="([^"]+)"/g) || [];
      return symbolMatches.map((m: string) => m.replace('data-symbol="', '').replace('"', ''));
    } catch (error) {
      console.error('[BSEClient] Failed to fetch all BSE symbols:', error);
      return [];
    }
  }

  /**
   * Normalize symbol to BSE format
   * BSE symbols may have .BO suffix, need to handle both formats
   */
  private normalizeBSESymbol(symbol: string): string {
    // Remove .BO suffix if present, BSE API expects just the symbol
    return symbol.replace(/.BO$/, '').toUpperCase();
  }

  /**
   * Check if symbol is a BSE symbol
   */
  isBSESymbol(symbol: string): boolean {
    // BSE symbols typically end with .BO or are in BSE lists
    return symbol.endsWith('.BO') || symbol.toUpperCase().length <= 10;
  }

  /**
   * Get symbol type (NSE vs BSE)
   */
  async identifyExchange(symbol: string): Promise<'NSE' | 'BSE' | 'UNKNOWN'> {
    try {
      // Try BSE first
      const bseQuote = await this.fetchFromBSEAPI(symbol);
      if (bseQuote) return 'BSE';

      // Otherwise assume NSE
      return 'NSE';
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton export
export const bseClient = new BSEClient();
