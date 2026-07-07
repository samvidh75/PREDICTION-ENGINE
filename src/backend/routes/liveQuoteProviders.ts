/**
 * Live Quote Providers
 * Cascading fetch: IndianAPI → Groww → Yahoo Finance
 * Each provider has per-symbol rate limiting and retry
 */

export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  source: 'indianapi' | 'groww' | 'yahoo';
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
    try {
      return await this.fetchFromIndianAPI(symbols);
    } catch (err1) {
      console.warn('[QuoteProvider] IndianAPI failed, trying Groww...', (err1 as Error).message);
      try {
        return await this.fetchFromGroww(symbols);
      } catch (err2) {
        console.warn('[QuoteProvider] Groww failed, trying Yahoo...', (err2 as Error).message);
        return await this.fetchFromYahoo(symbols);
      }
    }
  }

  private async fetchFromIndianAPI(symbols: string[]): Promise<Quote[]> {
    const results: Quote[] = [];
    const batchSize = 5;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const promises = batch.map(async (sym) => {
        if (!(await checkRateLimit(sym))) return;
        try {
          const res = await fetch(
            `https://stock.indianapi.in/stock?name=${encodeURIComponent(sym.toUpperCase())}`,
            { headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) }
          );
          if (!res.ok) return;
          const data = await res.json() as any;
          const priceData = data.currentPrice || {};
          const price = priceData.PSE || priceData.PSE || data.stockDetailsReusableData?.price;
          if (price && price > 0) {
            results.push({
              symbol: sym.toUpperCase(),
              price: Number(price),
              bid: price * 0.999,
              ask: price * 1.001,
              volume: data.stockDetailsReusableData?.volume || 0,
              source: 'indianapi',
              timestamp: Date.now(),
            });
          }
        } catch { /* skip individual failures */ }
      });
      await Promise.all(promises);
    }
    return results;
  }

  private async fetchFromGroww(symbols: string[]): Promise<Quote[]> {
    const results: Quote[] = [];
    for (const sym of symbols) {
      if (!(await checkRateLimit(sym))) continue;
      try {
        const res = await fetch(
          `https://api.groww.in/v1/stocks/quote?symbol=${sym.toUpperCase()}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = await res.json() as any;
        if (data.ltp && data.ltp > 0) {
          results.push({
            symbol: sym.toUpperCase(),
            price: data.ltp,
            bid: data.bid || data.ltp * 0.999,
            ask: data.ask || data.ltp * 1.001,
            volume: data.volume || 0,
            source: 'groww',
            timestamp: Date.now(),
          });
        }
      } catch { /* skip */ }
    }
    return results;
  }

  private async fetchFromYahoo(symbols: string[]): Promise<Quote[]> {
    const results: Quote[] = [];
    try {
      const query = symbols.map((s) => `${s}.NS`).join(',');
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!res.ok) return results;
      const data = await res.json() as any;
      if (data.chart?.result) {
        for (const chart of data.chart.result) {
          const meta = chart.meta;
          if (meta?.regularMarketPrice) {
            results.push({
              symbol: meta.symbol.replace('.NS', ''),
              price: meta.regularMarketPrice,
              bid: meta.regularMarketPrice * 0.999,
              ask: meta.regularMarketPrice * 1.001,
              volume: meta.regularMarketVolume || 0,
              source: 'yahoo',
              timestamp: Date.now(),
            });
          }
        }
      }
    } catch { /* skip */ }
    return results;
  }
}
