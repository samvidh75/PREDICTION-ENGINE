// api/v2/quote.ts
// Real-time quote from Yahoo Finance v8 chart API (free, no key)
// GET /api/v2/quote?symbol=TCS

import type { VercelRequest, VercelResponse } from '@vercel/node';

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 30_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol ?? '').toUpperCase().trim();

  if (!symbol) {
    return res.status(400).json({ error: 'symbol required', usage: '/api/v2/quote?symbol=TCS' });
  }

  const cached = CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(cached.data);
  }

  try {
    const ticker = `${symbol}.NS`;
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`,
      { headers: { 'User-Agent': 'Mozilla/5.0 StockStory/2.0' }, signal: AbortSignal.timeout(5_000) },
    );

    if (!r.ok) {
      return res.status(502).json({ success: false, error: `yahoo_error: ${r.status}`, symbol });
    }

    const d = await r.json();
    const result = d?.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ success: false, error: 'no_data', symbol });
    }

    const meta = result.meta ?? {};
    const closes = (result.indicators?.quote?.[0]?.close ?? []).filter((v: unknown) => v !== null);
    const latest = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
    const prev = meta.chartPreviousClose ?? latest;

    const payload = {
      success: true,
      data: {
        symbol,
        price: Number(latest.toFixed(2)),
        change: Number((latest - prev).toFixed(2)),
        changePercent: prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0,
        volume: meta.regularMarketVolume ?? 0,
        marketCap: meta.marketCap ?? 0,
        source: 'yahoo_finance',
        timestamp: new Date().toISOString(),
      },
    };

    CACHE.set(symbol, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30');
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      symbol,
    });
  }
}
