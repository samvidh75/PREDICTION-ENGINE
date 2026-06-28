import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedStockResearch } from "../src/lib/stockResearchSnapshot.js";
import { compareCompanies } from "../src/research/compare/compareEngine.js";
import type { CompareInput } from "../src/research/compare/compareEngine.js";

// ── Cache ────────────────────────────────────────────────────────────────────
const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 120_000; // 2 min

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbols = Array.isArray(req.query.symbols)
    ? req.query.symbols[0]
    : req.query.symbols;
  if (!rawSymbols) {
    return res.status(400).json({ error: "symbols required", usage: "/api/compare?symbols=TCS,INFY,WIPRO" });
  }

  const symbols = String(rawSymbols)
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  if (symbols.length < 2) {
    return res.status(400).json({ error: "Need at least 2 symbols to compare" });
  }
  if (symbols.length > 5) {
    return res.status(400).json({ error: "Maximum 5 symbols per comparison" });
  }

  const cacheKey = symbols.sort().join(",");
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json(cached.data);
  }

  // Fetch research data for all symbols in parallel
  const researchResults = await Promise.all(
    symbols.map(s => getPersistedStockResearch(s).catch(() => null))
  );

  const inputs: CompareInput[] = [];
  for (let i = 0; i < symbols.length; i++) {
    const syn = researchResults[i];
    inputs.push({
      symbol: symbols[i],
      companyName: syn?.companyName || symbols[i],
      scores: {
        quality: syn?.scores?.quality ?? null,
        valuation: syn?.scores?.valuation ?? null,
        growth: syn?.scores?.growth ?? null,
        risk: syn?.scores?.risk ?? null,
        momentum: syn?.scores?.momentum ?? null,
        stability: syn?.scores?.stability ?? null,
      },
    });
  }

  const result = compareCompanies(inputs);

  const missingSymbols = researchResults
    .map((r, i) => (r === null ? symbols[i] : null))
    .filter(Boolean) as string[];

  const payload = {
    ...result,
    comparedSymbols: symbols,
    _missingData: missingSymbols.length > 0 ? missingSymbols : null,
    _dataSource: "research_engine",
  };

  CACHE.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL });
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
  return res.status(200).json(payload);
}
