// api/v2/stock.ts
// Unified stock research endpoint — real data from Yahoo Finance + IndianAPI
// GET /api/v2/stock?symbol=TCS

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPersistedStockResearch } from '../../src/lib/stockResearchSnapshot.js';

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 300_000;

async function yahooQuote(symbol: string): Promise<{
  price: number; change: number; changePercent: number; volume: number; marketCap: number;
} | null> {
  try {
    const ticker = `${symbol}.NS`;
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`, {
      headers: { 'User-Agent': 'Mozilla/5.0 StockStory/2.0' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta ?? {};
    const closes = (d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((v: unknown) => v !== null);
    const latest = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
    const prev = meta.chartPreviousClose ?? latest;
    return {
      price: Number(latest.toFixed(2)),
      change: Number((latest - prev).toFixed(2)),
      changePercent: prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0,
      volume: meta.regularMarketVolume ?? 0,
      marketCap: meta.marketCap ?? 0,
    };
  } catch { return null; }
}

async function indianApiFunds(symbol: string): Promise<Record<string, unknown>> {
  const key = process.env.INDIANAPI_KEY || process.env.VITE_INDIANAPI_KEY;
  if (!key) return {};
  const clean = symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
  try {
    const r = await fetch(`https://stock.indianapi.in/stock_fundamentals?name=${encodeURIComponent(clean)}`, {
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) return {};
    const data = await r.json();
    return data?.fundamentals ?? data ?? {};
  } catch { return {}; }
}

function n(v: unknown): number | null {
  if (v == null || v === '') return null;
  const p = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol ?? '').toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required', usage: '/api/v2/stock?symbol=TCS' });

  const cached = CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
    return res.status(200).json(cached.data);
  }

  try {
    const [realQuote, fundResult, synthetic] = await Promise.all([
      yahooQuote(symbol),
      indianApiFunds(symbol),
      getPersistedStockResearch(symbol).catch(() => null),
    ]);

    const fund = fundResult || {};

    const payload = {
      success: true,
      symbol,
      companyName: synthetic?.companyName || synthetic?.name || symbol,
      exchange: synthetic?.exchangeBadge || (synthetic?.exchange ?? "NSE"),
      sector: synthetic?.sector || null,
      industry: synthetic?.industry || null,
      quote: {
        price: realQuote?.price ?? synthetic?.price ?? null,
        change: realQuote?.change ?? synthetic?.change ?? null,
        changePercent: realQuote?.changePercent ?? synthetic?.changePercent ?? null,
        volume: realQuote?.volume ?? synthetic?.volume ?? null,
        marketCap: realQuote?.marketCap ?? synthetic?.marketCap ?? null,
      },
      fundamentals: {
        pe: n(fund.pe_ratio) ?? synthetic?.pe ?? null,
        pb: n(fund.pb_ratio) ?? synthetic?.pb ?? null,
        roe: n(fund.roe ?? fund.return_on_equity) ?? synthetic?.roe ?? null,
        debtToEquity: n(fund.debt_to_equity) ?? synthetic?.debtToEquity ?? null,
        revenueGrowth: n(fund.revenue_growth_3y ?? fund.revenue_growth) ?? synthetic?.revenueGrowth ?? null,
        profitGrowth: n(fund.profit_growth_3y ?? fund.profit_growth) ?? synthetic?.profitGrowth ?? null,
        dividendYield: n(fund.dividend_yield) ?? synthetic?.dividendYield ?? null,
        eps: n(fund.eps) ?? synthetic?.eps ?? null,
      },
      timestamp: new Date().toISOString(),
      _dataSource: { price: realQuote ? 'yahoo' : 'fallback', fundamentals: Object.keys(fund).length > 0 ? 'indianapi' : 'fallback' },
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
