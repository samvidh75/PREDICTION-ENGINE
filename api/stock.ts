import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedStockResearch } from "../src/lib/stockResearchSnapshot.js";

const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol ?? "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const cached = CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
    return res.status(200).json(cached.data);
  }

  const research = await getPersistedStockResearch(symbol);
  if (!research) {
    return res.status(404).json({ error: "not_found", symbol });
  }

  const payload = {
    symbol: research.symbol,
    companyName: research.companyName,
    exchange: research.exchangeBadge,
    sector: research.sector || "Uncategorized",
    industry: research.industry || "Uncategorized",
    price: {
      current: research.price,
      changeAbs: research.change,
      changePercent: research.changePercent,
      marketCap: research.marketCap,
    },
    fundamentals: {
      pe: research.pe,
      industryPe: research.industryPe,
      pb: research.pb,
      dividendYield: research.dividendYield,
      eps: research.eps,
    },
    roe: research.roe,
    debtToEquity: research.debtToEquity,
    revenueGrowth: research.revenueGrowth,
    profitGrowth: research.profitGrowth,
    rsi: research.rsi,
    scores: research.scores,
    confidenceMeter: research.confidenceMeter,
    timeline: research.timeline,
    whatChanged: research.whatChanged,
    sectorRelative: research.sectorRelative,
    description: research.description,
    companyProfile: {
      founded: research.founded,
      ceo: research.ceo,
      hq: research.hq,
      employees: research.employees,
      website: research.website,
      isin: research.isin,
      businessSegments: research.businessSegments,
    },
    priceHistory: research.priceHistory,
    financials: research.financials,
    shareholding: research.shareholding,
    shareholdings: research.shareholding,
    news: research.news,
    thesis: research.thesis,
  };

  CACHE.set(symbol, { data: payload, expiresAt: Date.now() + CACHE_TTL });
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
  return res.status(200).json(payload);
}
