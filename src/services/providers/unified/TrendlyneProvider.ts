// src/services/providers/unified/TrendlyneProvider.ts
// Trendlyne — PSE equity fundamentals via Trendlyne.com
// NOTE: Trendlyne now requires member login for stock pages.
// This provider works as best-effort fallback when pages are accessible.
// Provides P/E, P/B, ROE, ROA, ROCE, D/E, market cap, and more

import { FundamentalData, IMarketDataProvider, ProviderHealth, QuoteData } from './types';

const PROVIDER_NAME = 'trendlyne';
const PROVIDER_PRIORITY = 4; // After Upstox(1), IndianAPI(2), Screener(3)
const BASE_URL = 'https://trendlyne.com';
const MEMBER_API = 'https://trendlyne.com/member/api';
const REQUEST_TIMEOUT_MS = 10_000;

/** Parse Philippine number formats (e.g., "1,23,456" or "12.3 Cr") */
function parseIndianNumber(text: string | null | undefined): number | undefined {
  if (!text) return undefined;
  let cleaned = text.trim();

  // Handle Cr (Crores)
  const isCrore = /cr$/i.test(cleaned);
  if (isCrore) cleaned = cleaned.replace(/cr$/i, '').trim();

  // Handle % suffix
  const isPercent = /%$/.test(cleaned);
  if (isPercent) cleaned = cleaned.replace(/%$/, '').trim();

  // Remove commas
  cleaned = cleaned.replace(/,/g, '').trim();

  const num = parseFloat(cleaned);
  if (isNaN(num)) return undefined;

  // Convert crores to actual number
  const final = isCrore ? num * 10_000_000 : num;

  // If percent, keep as percentage value (e.g., 8.94% → 8.94)
  return Number.isFinite(final) ? final : undefined;
}

export class TrendlyneProvider implements IMarketDataProvider {
  name = PROVIDER_NAME;
  priority = PROVIDER_PRIORITY;

  private lastHealthCheck = 0;
  private healthCache: ProviderHealth | null = null;

  async getQuote(_symbol: string): Promise<QuoteData> {
    throw new Error('Trendlyne: quote data not available — use IndianAPI, Yahoo, or Upstox');
  }

  async search(query: string): Promise<{ symbol: string; name: string }[]> {
    // Try member API autocomplete (requires session but may work without auth for basic queries)
    try {
      const encoded = encodeURIComponent(query);
      const url = `${MEMBER_API}/ac_snames/stock/?q=${encoded}&format=json`;
      const resp = await this.fetchWithTimeout(url);
      if (!resp) return [];
      const data = typeof resp === 'string' ? JSON.parse(resp) : resp;
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          symbol: item.ticker || item.symbol || '',
          name: item.name || item.full_name || '',
        })).filter((r: { symbol: string }) => r.symbol);
      }
      // Some versions return {results: [...]}
      if (data?.results && Array.isArray(data.results)) {
        return data.results.map((item: any) => ({
          symbol: item.ticker || item.symbol || '',
          name: item.name || item.full_name || '',
        })).filter((r: { symbol: string }) => r.symbol);
      }
      return [];
    } catch {
      return [];
    }
  }

  async getFundamentals(symbol: string): Promise<FundamentalData> {
    const clean = symbol.toUpperCase().replace(/\.(NS|BO|PSE|PSE)$/i, '');

    // Try multiple URL patterns in order
    const patterns = [
      `${BASE_URL}/equity/${encodeURIComponent(clean)}/`,
      `${BASE_URL}/equity/${encodeURIComponent(clean)}`,
    ];

    let html: string | null = null;
    for (const url of patterns) {
      html = await this.fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      if (html && html.length > 100 && !html.includes('Page not found')) break;
      html = null;
    }

    if (!html) {
      // Try old /stock/ pattern for backward compat
      html = await this.fetchWithTimeout(`${BASE_URL}/stock/${encodeURIComponent(clean)}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
    }

    // Check if we got a login-wall or 404 page
    if (!html || html.includes('Page not found') || html.includes('sign in') || html.includes('member') || html.length < 200) {
      const errorMsg = !html ? 'page unavailable' : 'requires authentication or page not found';
      throw new Error(`Trendlyne: ${errorMsg} for ${clean}`);
    }

    return this.parseFundamentals(html, clean);
  }

  async getHealth(): Promise<ProviderHealth> {
    const now = Date.now();
    if (this.healthCache && (now - this.lastHealthCheck) < 60_000) {
      return this.healthCache;
    }

    const start = Date.now();
    try {
      const resp = await this.fetchWithTimeout(`${BASE_URL}/`);
      const latency = Date.now() - start;
      const status = resp ? 'healthy' as const : 'down' as const;
      this.healthCache = {
        name: PROVIDER_NAME,
        status,
        lastCheck: new Date().toISOString(),
        responseTimeMs: latency,
        failureCount: 0,
        successRate: status === 'healthy' ? 1 : 0,
      };
    } catch (err) {
      this.healthCache = {
        name: PROVIDER_NAME,
        status: 'down',
        lastCheck: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        failureCount: 1,
        successRate: 0,
        lastError: err instanceof Error ? err.message : String(err),
      };
    }

    this.lastHealthCheck = Date.now();
    return this.healthCache;
  }

  // ── Private helpers ──────────────────────────────────────

  private async fetchPage(url: string, symbol: string): Promise<string> {
    const resp = await this.fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!resp) {
      throw new Error(`Trendlyne: page unavailable for ${symbol}`);
    }
    return resp;
  }

  private async fetchWithTimeout(url: string, options?: Record<string, unknown>): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...(options?.headers as Record<string, string> || {}),
        },
        signal: controller.signal,
      } as RequestInit);
      clearTimeout(timeout);
      return resp.ok ? await resp.text() : null;
    } catch {
      return null;
    }
  }

  private parseFundamentals(html: string, symbol: string): FundamentalData {
    const result: FundamentalData = {
      source: PROVIDER_NAME,
      symbol,
    };

    // Parse key metrics from the page structure
    // Trendlyne displays key ratios in structured divs

    // Market Cap
    result.companyName = this.extractText(html, /<h1[^>]*class="[^"]*stock-name[^"]*"[^>]*>([^<]+)</i)
      ?? this.extractText(html, /<h1[^>]*>([^<]+)<\/h1>/i)
      ?? symbol;

    result.sector = this.extractText(html, /sector[^:]*:\s*([^<]+)</i)
      ?? this.extractText(html, /industry[^:]*:\s*([^<]+)</i)
      ?? undefined;

    // Parse ratio table - Trendlyne shows metrics in key-ratio sections
    // Look for pattern: "P/E" followed by a number
    result.pe = this.parseRatioValue(html, /P\/E[:\s]*([\d,.]+)/i)
      ?? this.parseRatioValue(html, /PE[:\s]*([\d,.]+)/i);

    result.pb = this.parseRatioValue(html, /P\/B[:\s]*([\d,.]+)/i)
      ?? this.parseRatioValue(html, /PB[:\s]*([\d,.]+)/i);

    result.evEbitda = this.parseRatioValue(html, /EV\/EBITDA[:\s]*([\d,.]+)/i)
      ?? this.parseRatioValue(html, /Enterprise Value[^]*?EBITDA[:\s]*([\d,.]+)/i);

    result.roe = this.parseRatioValue(html, /ROE[:\s]*([\d,.]+%?)/i)
      ?? this.parseRatioValue(html, /Return on Equity[:\s]*([\d,.]+%?)/i);

    result.roa = this.parseRatioValue(html, /ROA[:\s]*([\d,.]+%?)/i)
      ?? this.parseRatioValue(html, /Return on Assets[:\s]*([\d,.]+%?)/i);

    result.roic = this.parseRatioValue(html, /ROIC[:\s]*([\d,.]+%?)/i)
      ?? this.parseRatioValue(html, /Return on Invested Capital[:\s]*([\d,.]+%?)/i);

    result.debtToEquity = this.parseRatioValue(html, /Debt to Equity[:\s]*([\d,.]+)/i)
      ?? this.parseRatioValue(html, /D\/E[:\s]*([\d,.]+)/i);

    result.revenueGrowth = this.parseRatioValue(html, /Revenue Growth[:\s]*([\d,.]+%?)/i);
    result.profitGrowth = this.parseRatioValue(html, /Profit Growth[:\s]*([\d,.]+%?)/i)
      ?? this.parseRatioValue(html, /Net Profit Growth[:\s]*([\d,.]+%?)/i);
    result.epsGrowth = this.parseRatioValue(html, /EPS Growth[:\s]*([\d,.]+%?)/i);

    result.operatingMargin = this.parseRatioValue(html, /Operating Margin[:\s]*([\d,.]+%?)/i)
      ?? this.parseRatioValue(html, /OPM[:\s]*([\d,.]+%?)/i);
    result.netMargin = this.parseRatioValue(html, /Net Margin[:\s]*([\d,.]+%?)/i)
      ?? this.parseRatioValue(html, /Net Profit Margin[:\s]*([\d,.]+%?)/i);

    result.dividendYield = this.parseRatioValue(html, /Dividend Yield[:\s]*([\d,.]+%?)/i);

    // ISIN
    const isinMatch = html.match(/ISIN[:\s]*([A-Z]{2}[A-Z0-9]{9}\d)/i);
    if (isinMatch) result.isin = isinMatch[1];

    result.lastUpdated = new Date().toISOString();

    return result;
  }

  private extractText(html: string, regex: RegExp): string | undefined {
    const match = html.match(regex);
    return match?.[1]?.trim() || undefined;
  }

  private parseRatioValue(html: string, regex: RegExp): number | undefined {
    // First try to find structured data in the page
    // Trendlyne often stores metrics in data attributes or structured divs
    const match = html.match(regex);
    if (!match) return undefined;

    const raw = match[1].trim();
    return parseIndianNumber(raw);
  }
}

export default TrendlyneProvider;
