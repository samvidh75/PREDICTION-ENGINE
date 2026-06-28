import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedStockResearch, searchPersistedStocks } from "../src/lib/stockResearchSnapshot.js";
import { scanByType } from "../src/services/scanner/scoringEngine.js";
import { runScanner, type ScannerPreset, SCANNER_PRESETS } from "../src/research/scanner/scannerEngine.js";
import type { ScannerResultView } from "../src/research/contracts/productContracts.js";

// ── Cache ────────────────────────────────────────────────────────────────────
const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 120_000; // 2 min

// Map frontend preset keys to scanner engine presets
const PRESET_MAP: Record<string, ScannerPreset> = {
  quality: "Quality compounders",
  value: "Undervalued quality",
  momentum: "Improving momentum",
  stable: "Dividend stability",
  "low-debt": "Low debt leaders",
  growth: "Earnings acceleration",
  "risk-rising": "Risk rising",
  turnaround: "Turnaround watch",
  contrarian: "Good businesses out of favour",
  expensive: "High quality, expensive",
};

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawPreset = Array.isArray(req.query.preset) ? req.query.preset[0] : req.query.preset;
  const presetKey = String(rawPreset ?? "quality").toLowerCase().trim();
  const preset = PRESET_MAP[presetKey] || PRESET_MAP.quality;
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 50);

  const cacheKey = `scanner:${preset}:${limit}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json(cached.data);
  }

  // Use scoring engine for fast scan, then enrich with scanner engine details
  const scanType = (["quality", "value", "momentum", "stable"] as const).find(
    t => PRESET_MAP[t] === preset
  ) || "quality";

  try {
    const scanned = scanByType(scanType).slice(0, limit);

    // Enrich with research data and run through proper scanner engine
    const enriched = await Promise.all(
      scanned.map(async (stock) => {
        const syn = await getPersistedStockResearch(stock.symbol).catch(() => null);
        return {
          symbol: stock.symbol,
          companyName: syn?.companyName || stock.name || stock.symbol,
          sector: stock.sector || syn?.sector || "Uncategorized",
          scores: {
            quality: stock.quality,
            valuation: stock.valuation,
            growth: stock.growth,
            risk: stock.risk,
            momentum: stock.technical,
            stability: syn?.scores?.stability ?? stock.quality,
          },
        };
      })
    );

    const results: ScannerResultView[] = enriched.length > 0
      ? runScanner(preset, enriched).slice(0, limit)
      : [];

    const definition = SCANNER_PRESETS[preset];

    const payload = {
      preset: presetKey,
      presetLabel: preset,
      explanation: definition.explanation,
      riskCaveat: definition.riskCaveat,
      total: results.length,
      results: results.map(r => ({
        symbol: r.symbol,
        companyName: r.companyName,
        sector: r.sector,
        rank: r.rank,
        conviction: r.conviction,
        score: r.score,
        keyReason: r.keyReason,
        riskMarker: r.riskMarker,
        oneLineThesis: r.oneLineThesis,
      })),
      _dataSource: "scoring_engine",
    };

    CACHE.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json(payload);
  } catch (err) {
    return res.status(502).json({
      error: err instanceof Error ? err.message : String(err),
      preset: presetKey,
    });
  }
}
