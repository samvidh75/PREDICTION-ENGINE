import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cacheGet, cacheSet } from '../../_lib/serverlessCache.js';

/**
 * Lightweight single-symbol quote — a flat { symbol, price, change,
 * changePercent } shape, distinct from api/stock/[symbol].ts (which returns
 * a nested price object plus fundamentals/thesis/etc. for the full research
 * page). Used by pages that just need "is this holding's price up or down
 * right now" without paying for the heavier full-research fetch — e.g.
 * PortfolioPage.tsx's per-holding price refresh.
 *
 * Same real phisix-api3.appspot.com feed as market-pulse.ts/market-universe.ts.
 */

const CACHE_TTL_SECONDS = 20;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  const symbol = String(req.query.symbol ?? '').toUpperCase().trim();
  if (!symbol) {
    res.status(400).json({ error: 'symbol required' });
    return;
  }

  const cacheKey = `market-data-quote:${symbol}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    const response = await fetch(
      `https://phisix-api3.appspot.com/stocks/${symbol.toLowerCase()}.json`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) {
      res.status(502).json({ error: `phisix HTTP ${response.status}` });
      return;
    }

    const data = (await response.json()) as any;
    const stock = data?.stocks?.[0];
    const price = stock?.price?.amount ?? 0;
    if (!stock || !price) {
      res.status(404).json({ error: 'not_found', symbol });
      return;
    }

    const changePercent = stock.percentChange ?? 0;
    const prevClose = changePercent !== 0 ? price / (1 + changePercent / 100) : price;

    const payload = {
      symbol,
      name: stock.name ?? symbol,
      price: Number(price.toFixed(2)),
      change: Number((price - prevClose).toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
    };

    await cacheSet(cacheKey, payload, CACHE_TTL_SECONDS);
    res.status(200).json(payload);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'fetch_failed' });
  }
}
