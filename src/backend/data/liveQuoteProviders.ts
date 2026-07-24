/**
 * Live quote providers for WebSocket streaming.
 * Source: Yahoo Finance chart API (PSE-listed symbols use the .PS suffix)
 */

export interface LiveQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest?: number;
  timestamp: number;
  source: 'pse' | 'yahoo';
  lastUpdate: number;
}

const rateLimiter = new Map<string, number>();
const RATE_LIMIT_MS = 100;

async function checkRateLimit(symbol: string): Promise<boolean> {
  const lastCall = rateLimiter.get(symbol) || 0;
  const now = Date.now();

  if (now - lastCall < RATE_LIMIT_MS) return false;

  rateLimiter.set(symbol, now);
  return true;
}

export async function fetchLiveQuotePSE(symbol: string): Promise<LiveQuote | null> {
  if (!await checkRateLimit(symbol)) return null;

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.PS?interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.ok) {
      console.warn(`PSE quote fetch returned ${response.status} for ${symbol}`);
      return null;
    }

    const data = (await response.json()) as any;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    return {
      symbol,
      price: meta.regularMarketPrice || 0,
      bid: meta.regularMarketPrice * 0.999 || 0,
      ask: meta.regularMarketPrice * 1.001 || 0,
      volume: meta.regularMarketVolume || 0,
      timestamp: meta.regularMarketTime || Date.now(),
      source: 'pse',
      lastUpdate: Date.now()
    };
  } catch (err) {
    console.error(`PSE fetch error for ${symbol}:`, err);
    return null;
  }
}

export async function fetchLiveQuoteYahoo(symbol: string): Promise<LiveQuote | null> {
  if (!await checkRateLimit(symbol)) return null;

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.PS?interval=1d`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    return {
      symbol,
      price: meta.regularMarketPrice || 0,
      bid: meta.regularMarketPrice * 0.999 || 0,
      ask: meta.regularMarketPrice * 1.001 || 0,
      volume: meta.regularMarketVolume || 0,
      timestamp: meta.regularMarketTime || Date.now(),
      source: 'yahoo',
      lastUpdate: Date.now()
    };
  } catch (err) {
    console.error(`Yahoo fetch error for ${symbol}:`, err);
    return null;
  }
}

const quoteCache = new Map<string, LiveQuote>();
const CACHE_TTL_MS = 2000;

export function getCachedQuote(symbol: string): LiveQuote | null {
  const cached = quoteCache.get(symbol);

  if (!cached) return null;

  const age = Date.now() - cached.lastUpdate;
  if (age > CACHE_TTL_MS) {
    quoteCache.delete(symbol);
    return null;
  }

  return cached;
}

export function setCachedQuote(quote: LiveQuote): void {
  quoteCache.set(quote.symbol, quote);
}
