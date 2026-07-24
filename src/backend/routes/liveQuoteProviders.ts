/**
 * Live Quote Providers
 * Fetch: Yahoo Finance chart API (PSE-listed symbols use the .PS suffix)
 * Rate limited per-symbol.
 */

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  source: 'yahoo';
  timestamp: number;
}

const RATE_LIMIT_MS = 100;
const rateLimiter = new Map<string, number>();

async function checkRateLimit(symbol: string): Promise<boolean> {
  const lastCall = rateLimiter.get(symbol) || 0;
  const now = Date.now();
  if (now - lastCall < RATE_LIMIT_MS) return false;
  rateLimiter.set(symbol, now);
  return true;
}

export class QuoteProvider {
  async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    return this.fetchFromYahoo(symbols);
  }

  private async fetchFromYahoo(symbols: string[]): Promise<Quote[]> {
    const results: Quote[] = [];
    for (const sym of symbols) {
      if (!(await checkRateLimit(sym))) continue;
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}.PS?interval=1d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!res.ok) continue;
        const data = await res.json() as any;
        const meta = data.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) {
          results.push({
            symbol: sym,
            price: meta.regularMarketPrice,
            bid: meta.regularMarketPrice * 0.999,
            ask: meta.regularMarketPrice * 1.001,
            volume: meta.regularMarketVolume || 0,
            source: 'yahoo',
            timestamp: Date.now(),
          });
        }
      } catch { /* skip individual failures */ }
    }
    return results;
  }
}
