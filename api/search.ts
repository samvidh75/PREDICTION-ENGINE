// api/search.ts — Self-contained stock search endpoint
// Searches embedded universe + seeded research for company names
// GET /api/search?q=reliance&limit=10
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedStockResearch, searchPersistedStocks } from "../src/lib/stockResearchSnapshot.js";

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60_000;

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const query = String(rawQ ?? "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10), 1), 50);

  if (!query || query.length < 2) {
    return res.status(400).json({ error: "query required (min 2 chars)", usage: "/api/search?q=reliance&limit=10" });
  }

  const cacheKey = `search:${query.toLowerCase()}:${limit}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached.data);
  }

  try {
    const results = await searchPersistedStocks(query, limit);

    // Enrich with real-time Yahoo price data
    const enriched: SearchResult[] = await Promise.all(
      results.map(async (r) => {
        let yahooPrice: number | null = null;
        let yahooChange: number | null = null;
        let yahooChangePct: number | null = null;

        try {
          const ticker = `${r.symbol}.NS`;
          const yr = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`,
            { headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" }, signal: AbortSignal.timeout(3_000) }
          );
          if (yr.ok) {
            const yd = await yr.json();
            const meta = yd?.chart?.result?.[0]?.meta ?? {};
            const closes = (yd?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((v: unknown) => v !== null);
            const latest = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
            const prev = meta.chartPreviousClose ?? latest;
            yahooPrice = Number(latest.toFixed(2));
            yahooChange = Number((latest - prev).toFixed(2));
            yahooChangePct = prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0;
          }
        } catch { /* yahoo timeout — use seeded data */ }

        return {
          symbol: r.symbol,
          name: r.name || r.symbol,
          exchange: r.exchange || "NSE",
          sector: r.sector || "",
          industry: r.industry || "",
          price: yahooPrice ?? r.price ?? null,
          change: yahooChange ?? r.change ?? null,
          changePercent: yahooChangePct ?? r.changePercent ?? null,
          marketCap: r.marketCap ?? null,
          pe: r.pe ?? null,
          pb: r.pb ?? null,
          roe: r.roe ?? null,
        };
      })
    );

    const payload = {
      query,
      total: enriched.length,
      results: enriched,
    };

    CACHE.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    res.setHeader("Cache-Control", "public, s-maxage=60");
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : String(err),
      query,
    });
  }
}
