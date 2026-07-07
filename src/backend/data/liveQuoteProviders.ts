/**
 * Live quote providers for WebSocket streaming.
 * Source: PSE API (primary), Groww API (fallback)
 */

export interface LiveQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest?: number;
  timestamp: number;
  source: 'nse' | 'groww';
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

  const nseSymbol = symbol.includes('-') ? symbol : `${symbol}-EQ`;

  try {
    const response = await fetch(
      `https://www.nseindia.com/api/quote-equity?symbol=${nseSymbol}`,
      {
        headers: {
          'Referer': 'https://www.nseindia.com/',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.ok) {
      console.warn(`PSE returned ${response.status} for ${symbol}`);
      return null;
    }

    const data = (await response.json()) as any;

    return {
      symbol,
      price: data.priceInfo?.lastPrice || 0,
      bid: data.priceInfo?.bidPrice || 0,
      ask: data.priceInfo?.askPrice || 0,
      volume: data.priceInfo?.totalTradedVolume || 0,
      openInterest: data.priceInfo?.openInterest || undefined,
      timestamp: data.priceInfo?.lastUpdateTime || Date.now(),
      source: 'nse',
      lastUpdate: Date.now()
    };
  } catch (err) {
    console.error(`PSE fetch error for ${symbol}:`, err);
    return null;
  }
}

export async function fetchLiveQuoteGroww(symbol: string): Promise<LiveQuote | null> {
  if (!await checkRateLimit(symbol)) return null;

  try {
    const response = await fetch(
      `https://api.groww.in/v1/stocks/quote?symbol=${symbol}`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as any;

    return {
      symbol,
      price: data.ltp || 0,
      bid: data.bid || 0,
      ask: data.ask || 0,
      volume: data.volume || 0,
      timestamp: data.timestamp || Date.now(),
      source: 'groww',
      lastUpdate: Date.now()
    };
  } catch (err) {
    console.error(`Groww fetch error for ${symbol}:`, err);
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
