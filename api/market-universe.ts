import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PSE_STOCKS, getPseSector } from './_lib/data/universe.js';
import { cacheGet, cacheSet } from './_lib/serverlessCache.js';

/**
 * Live snapshot of the FULL PSE common-share universe (~294 tickers, not
 * just the PSEi-30 — see market-pulse.ts for that lighter, faster-refreshing
 * endpoint). Same phisix-api3.appspot.com feed and per-symbol shape as
 * api/stock/[symbol].ts and market-pulse.ts.
 *
 * Fetching the whole universe concurrently takes several seconds (measured
 * ~8s for 294 symbols in this environment, with ~80% real-quote coverage —
 * the rest are typically inactive/delisted-adjacent tickers phisix doesn't
 * carry a live quote for). That's too slow to redo on every request, so
 * this is cached far longer than market-pulse's 30s: 4 minutes.
 */

interface UniverseQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  /** Populated from real PSE Edge company-directory sector data for all
   * ~282 common shares (see data/pse-sectors.json and getPseSector), with
   * a static PSEi-30 fallback. `null` only for symbols with no verified
   * classification anywhere — never guessed. */
  sector: string | null;
}

const CACHE_KEY = 'market-universe:all';
const CACHE_TTL_SECONDS = 240;

async function fetchQuote(symbol: string, name: string): Promise<UniverseQuote | null> {
  try {
    const response = await fetch(
      `https://phisix-api3.appspot.com/stocks/${symbol.toLowerCase()}.json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const stock = data?.stocks?.[0];
    if (!stock) return null;

    const price = stock.price?.amount ?? 0;
    if (!price) return null;
    const changePercent = stock.percentChange ?? 0;
    const prevClose = changePercent !== 0 ? price / (1 + changePercent / 100) : price;
    const volume = stock.volume ?? 0;

    return {
      symbol,
      name: stock.name || name,
      price: Number(price.toFixed(2)),
      change: Number((price - prevClose).toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: Number(volume) || 0,
      sector: getPseSector(symbol),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch in fixed-size concurrent batches rather than firing every request
 * at once — phisix is a free, unofficial mirror with no documented rate
 * limit, and all-at-once fetching measurably drops real-world success rate
 * (observed 68/294 under load vs. 238/294 in isolation) as more requests
 * likely get throttled or dropped. Small batches with a short pause between
 * them trade a few extra seconds for meaningfully higher real coverage.
 */
async function fetchInBatches(stocks: typeof PSE_STOCKS, batchSize = 25, pauseMs = 200): Promise<UniverseQuote[]> {
  const out: UniverseQuote[] = [];
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((s) => fetchQuote(s.symbol, s.name)));
    out.push(...results.filter((q): q is UniverseQuote => q !== null));
    if (i + batchSize < stocks.length) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }
  return out;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const cached = await cacheGet(CACHE_KEY);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  const quotes = await fetchInBatches(PSE_STOCKS);

  if (quotes.length === 0) {
    res.status(503).json({ ok: false, error: 'PSE live feed unavailable', quotes: [] });
    return;
  }

  const payload = {
    ok: true,
    asOf: new Date().toISOString(),
    coverage: `${quotes.length}/${PSE_STOCKS.length}`,
    reportingRatio: `${quotes.length}/${PSE_STOCKS.length}`,
    quotes,
  };

  await cacheSet(CACHE_KEY, payload, CACHE_TTL_SECONDS);
  res.status(200).json(payload);
}
