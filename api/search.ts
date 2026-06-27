import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedUniverseCount, searchPersistedStocks } from "../src/lib/stockResearchSnapshot.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawQuery = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
  const q = String(rawQuery ?? "").trim();
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 20);

  if (!q) {
    return res.status(200).json({ query: q, totalUniverse: await getPersistedUniverseCount(), results: [] });
  }

  const results = (await searchPersistedStocks(q, limit)).map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    exchange: stock.exchange,
    sector: stock.sector,
    industry: stock.industry,
    marketCap: stock.marketCap,
    price: stock.price,
    changePercent: stock.changePercent,
    scores: stock.scores,
  }));

  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
  return res.status(200).json({
    query: q,
    totalUniverse: await getPersistedUniverseCount(),
    results,
  });
}
