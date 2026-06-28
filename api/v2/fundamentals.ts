// api/v2/fundamentals.ts
// Fundamentals endpoint — real data from IndianAPI.in (requires INDIANAPI_KEY)
// GET /api/v2/fundamentals?symbol=TCS

import type { VercelRequest, VercelResponse } from '@vercel/node';

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 300_000;

function n(v: unknown): number | null {
  if (v == null || v === '') return null;
  const p = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol ?? '').toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required', usage: '/api/v2/fundamentals?symbol=TCS' });

  const cached = CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(cached.data);
  }

  try {
    const key = process.env.INDIANAPI_KEY || process.env.VITE_INDIANAPI_KEY;
    if (!key) {
      return res.status(200).json({ success: false, error: 'INDIANAPI_KEY not configured', symbol });
    }

    const clean = symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
    const r = await fetch(
      `https://stock.indianapi.in/stock_fundamentals?name=${encodeURIComponent(clean)}`,
      { headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5_000) },
    );

    if (!r.ok) {
      return res.status(502).json({ success: false, error: `indianapi_error: ${r.status}`, symbol });
    }

    const data = await r.json();
    const f = data?.fundamentals ?? data ?? {};

    const payload = {
      success: true,
      data: {
        symbol,
        pe: n(f.pe_ratio),
        pb: n(f.pb_ratio),
        roe: n(f.roe ?? f.return_on_equity),
        debtToEquity: n(f.debt_to_equity),
        revenueGrowth: n(f.revenue_growth_3y ?? f.revenue_growth),
        profitGrowth: n(f.profit_growth_3y ?? f.profit_growth),
        dividendYield: n(f.dividend_yield),
        eps: n(f.eps),
        marketCap: n(f.market_cap) ? n(f.market_cap)! * 10_000_000 : null,
        source: 'indianapi',
        lastUpdated: new Date().toISOString(),
      },
    };

    CACHE.set(symbol, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      symbol,
    });
  }
}
