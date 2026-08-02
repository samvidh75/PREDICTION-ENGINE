import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PSEI_30, PSE_STOCKS, PSE_SECTORS } from './_lib/data/universe.js';
import { cacheGet, cacheSet } from './_lib/serverlessCache.js';

/**
 * Live PSEi-30 snapshot — gainers, losers, most active, and an index proxy.
 *
 * Sourced from the same phisix-api3.appspot.com feed used by
 * api/stock/[symbol].ts (see that file for provenance notes). This endpoint
 * fetches all 30 real PSEi constituents concurrently and derives the
 * snapshot from actual live prices — nothing here is fabricated or
 * hardcoded. Cached (Upstash Redis, falling back to per-instance memory —
 * see _lib/serverlessCache.ts) to avoid hammering the upstream feed on
 * every dashboard load/refresh across serverless invocations.
 */

interface PulseQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

const CACHE_KEY = 'market-pulse:psei30';
const CACHE_TTL_SECONDS = 30;

const nameBySymbol = new Map(PSE_STOCKS.map((s) => [s.symbol, s.name]));

async function fetchQuote(symbol: string): Promise<PulseQuote | null> {
  try {
    const response = await fetch(
      `https://phisix-api3.appspot.com/stocks/${symbol.toLowerCase()}.json`,
      { signal: AbortSignal.timeout(6000) },
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
      name: stock.name || nameBySymbol.get(symbol) || symbol,
      price: Number(price.toFixed(2)),
      change: Number((price - prevClose).toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: Number(volume) || 0,
    };
  } catch {
    return null;
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const cached = await cacheGet(CACHE_KEY);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  const results = await Promise.all(PSEI_30.map(fetchQuote));
  const quotes = results.filter((q): q is PulseQuote => q !== null);

  if (quotes.length === 0) {
    res.status(503).json({ ok: false, error: 'PSE live feed unavailable', quotes: [] });
    return;
  }

  const sortedByChange = [...quotes].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sortedByChange.filter((q) => q.changePercent > 0).slice(0, 5);
  const losers = [...sortedByChange].reverse().filter((q) => q.changePercent < 0).slice(0, 5);
  const mostActive = [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 5);

  // Equal-weighted average % change across the fetched PSEi constituents —
  // a proxy for index direction, not the PSE's own official weighted PSEi
  // value (which isn't exposed by this free feed).
  const indexChangePercent = Number(
    (quotes.reduce((sum, q) => sum + q.changePercent, 0) / quotes.length).toFixed(2),
  );
  const advancers = quotes.filter((q) => q.changePercent > 0).length;
  const decliners = quotes.filter((q) => q.changePercent < 0).length;
  const unchanged = quotes.length - advancers - decliners;

  // Real sector aggregation — average % change across each sector's
  // fetched PSEi-30 members, using the same PSE_SECTORS grouping the
  // search endpoint already relies on. Sectors with zero reporting
  // members this round are simply omitted, not filled with a guess.
  const quotesBySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  const sectors = Object.entries(PSE_SECTORS)
    .map(([sector, symbols]) => {
      const members = symbols.map((s) => quotesBySymbol.get(s)).filter((q): q is PulseQuote => q !== undefined);
      if (members.length === 0) return null;
      const avgChangePercent = Number(
        (members.reduce((sum, q) => sum + q.changePercent, 0) / members.length).toFixed(2),
      );
      return { sector, avgChangePercent, coverage: `${members.length}/${symbols.length}`, members: members.map((m) => m.symbol) };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent);

  const payload = {
    ok: true,
    asOf: new Date().toISOString(),
    coverage: `${quotes.length}/${PSEI_30.length}`,
    indexChangePercent,
    breadth: { advancers, decliners, unchanged },
    gainers,
    losers,
    mostActive,
    sectors,
    quotes,
  };

  await cacheSet(CACHE_KEY, payload, CACHE_TTL_SECONDS);
  res.status(200).json(payload);
}
