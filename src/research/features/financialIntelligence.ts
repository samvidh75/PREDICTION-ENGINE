import type { NormalizedFundamentals } from "../normalization/types";

export interface FinancialIntelligenceResult {
  roaScore: number | null;
  dividendYieldScore: number | null;
  marketCapScore: number | null;
  overallFinancialScore: number | null;
  confidence: number;
  missingInputs: string[];
}

/**
 * Score Return on Assets (ROA) on a 0-100 scale.
 * ROA measures how efficiently a company uses its assets to generate profit.
 */
export function computeROAScore(roa: number | null): number | null {
  if (roa === null || !Number.isFinite(roa)) return null;
  if (roa >= 15) return 85;
  if (roa >= 10) return 70;
  if (roa >= 7) return 55;
  if (roa >= 4) return 40;
  if (roa >= 0) return 25;
  return 10;
}

/**
 * Score Dividend Yield on a 0-100 scale.
 * Higher yields score better up to a point; very high yields may signal distress.
 */
export function computeDividendYieldScore(yieldPct: number | null): number | null {
  if (yieldPct === null || !Number.isFinite(yieldPct)) return null;
  if (yieldPct >= 6) return 70;     // very high — could be distressed, cap at good
  if (yieldPct >= 4) return 85;     // excellent
  if (yieldPct >= 3) return 75;     // strong
  if (yieldPct >= 2) return 60;     // above average
  if (yieldPct >= 1) return 45;     // average
  if (yieldPct > 0) return 30;      // below average
  return 10;                         // zero yield
}

/**
 * Score Market Cap on a 0-100 scale (Indian-market oriented).
 * Logarithmic — larger caps score higher for stability/liquidity.
 */
export function computeMarketCapScore(marketCap: number | null): number | null {
  if (marketCap === null || !Number.isFinite(marketCap) || marketCap <= 0) return null;
  const cr = marketCap / 10000000; // convert to Crores (1 Cr = 10M)
  if (cr >= 200000) return 90;    // Mega-cap
  if (cr >= 50000) return 80;     // Large-cap
  if (cr >= 20000) return 70;     // Mid-large
  if (cr >= 5000) return 55;      // Mid-cap
  if (cr >= 1000) return 40;      // Small-cap
  if (cr >= 100) return 25;       // Micro-cap
  return 15;                       // Nano-cap
}

/**
 * Compute all three financial intelligence scores and combine into an overall assessment.
 */
export function computeFinancialIntelligence(f: NormalizedFundamentals, marketCapExternal: number | null = null): FinancialIntelligenceResult {
  const missing: string[] = [];
  if (f.roa === null) missing.push("roa");
  if (f.dividendYield === null) missing.push("dividendYield");
  if (f.marketCap == null && marketCapExternal == null) missing.push("marketCap");

  const roaScore = computeROAScore(f.roa);
  const dividendYieldScore = computeDividendYieldScore(f.dividendYield);
  const mcScore = computeMarketCapScore(marketCapExternal ?? f.marketCap);

  const present = [f.roa, f.dividendYield, marketCapExternal ?? f.marketCap].filter(v => v !== null && Number.isFinite(v)).length;
  const confidence = Math.round((present / 3) * 100);

  let overallFinancialScore: number | null = null;
  const scores = [roaScore, dividendYieldScore, mcScore].filter((s): s is number => s !== null);
  if (scores.length >= 2) {
    // Weight: ROA 40%, dividend 30%, market cap 30%
    let weightedSum = 0;
    let totalWeight = 0;
    if (roaScore !== null) { weightedSum += roaScore * 0.4; totalWeight += 0.4; }
    if (dividendYieldScore !== null) { weightedSum += dividendYieldScore * 0.3; totalWeight += 0.3; }
    if (mcScore !== null) { weightedSum += mcScore * 0.3; totalWeight += 0.3; }
    overallFinancialScore = Math.round(totalWeight > 0 ? weightedSum / totalWeight : 0);
  }

  return {
    roaScore,
    dividendYieldScore,
    marketCapScore: mcScore,
    overallFinancialScore,
    confidence,
    missingInputs: missing,
  };
}
