import { normalizeNumericValue } from "./factorNormalization";
import type { FactorCategory } from "./factorTypes";

export interface FactorScore {
  factorId: string;
  label: string;
  category: FactorCategory;
  rawValue: number | null;
  normalizedScore: number | null;
  isAvailable: boolean;
}

export interface FactorScoringResult {
  factors: FactorScore[];
  activeCount: number;
  plannedCount: number;
  unavailableCount: number;
}

function scoreFactor(rawValue: number | null, lowerBetter: boolean = false, min: number = 0, max: number = 100): number | null {
  if (rawValue === null) return null;
  const clamped = Math.max(min, Math.min(max, rawValue));
  if (lowerBetter) {
    return Math.round((1 - (clamped - min) / (max - min)) * 100);
  }
  return Math.round(((clamped - min) / (max - min)) * 100);
}

function isHighQualityFactor(value: number): boolean {
  return !Number.isNaN(value) && Number.isFinite(value);
}

function scorePE(pe: number | null): number | null {
  if (pe === null || pe <= 0) return null;
  if (pe <= 10) return 85;
  if (pe <= 15) return 75;
  if (pe <= 20) return 60;
  if (pe <= 25) return 50;
  if (pe <= 35) return 35;
  if (pe <= 50) return 20;
  return 10;
}

function scorePB(pb: number | null): number | null {
  if (pb === null || pb <= 0) return null;
  if (pb <= 1) return 85;
  if (pb <= 2) return 70;
  if (pb <= 3) return 55;
  if (pb <= 5) return 40;
  if (pb <= 8) return 25;
  return 15;
}

function scoreEVEBITDA(ev: number | null): number | null {
  if (ev === null || ev <= 0) return null;
  if (ev <= 5) return 85;
  if (ev <= 8) return 75;
  if (ev <= 12) return 60;
  if (ev <= 15) return 45;
  if (ev <= 20) return 30;
  return 15;
}

function scoreDividendYield(dy: number | null): number | null {
  if (dy === null || dy < 0) return null;
  if (dy >= 0.04) return 80;
  if (dy >= 0.025) return 65;
  if (dy >= 0.01) return 50;
  if (dy > 0) return 35;
  return null;
}

function scoreROE(roe: number | null): number | null {
  if (roe === null) return null;
  if (roe >= 0.25) return 85;
  if (roe >= 0.18) return 75;
  if (roe >= 0.12) return 60;
  if (roe >= 0.08) return 45;
  if (roe >= 0.04) return 30;
  if (roe > 0) return 20;
  return 10;
}

function scoreROIC(roic: number | null): number | null {
  if (roic === null) return null;
  if (roic >= 0.20) return 85;
  if (roic >= 0.15) return 75;
  if (roic >= 0.10) return 60;
  if (roic >= 0.06) return 45;
  if (roic >= 0.03) return 30;
  if (roic > 0) return 20;
  return 10;
}

function scoreOperatingMargin(om: number | null): number | null {
  if (om === null) return null;
  if (om >= 0.25) return 85;
  if (om >= 0.18) return 75;
  if (om >= 0.12) return 60;
  if (om >= 0.06) return 45;
  if (om >= 0.02) return 30;
  return 15;
}

function scoreRevenueGrowth(rg: number | null): number | null {
  if (rg === null) return null;
  if (rg >= 0.25) return 85;
  if (rg >= 0.15) return 75;
  if (rg >= 0.10) return 60;
  if (rg >= 0.05) return 45;
  if (rg >= 0) return 30;
  return 15;
}

function scoreProfitGrowth(pg: number | null): number | null {
  if (pg === null) return null;
  if (pg >= 0.30) return 85;
  if (pg >= 0.20) return 75;
  if (pg >= 0.12) return 60;
  if (pg >= 0.05) return 45;
  if (pg >= 0) return 30;
  return 10;
}

function scoreEPSGrowth(eg: number | null): number | null {
  if (eg === null) return null;
  if (eg >= 0.25) return 85;
  if (eg >= 0.15) return 75;
  if (eg >= 0.10) return 60;
  if (eg >= 0.05) return 45;
  if (eg >= 0) return 30;
  return 15;
}

function scoreDebtEquity(de: number | null): number | null {
  if (de === null || de < 0) return null;
  if (de <= 0.1) return 85;
  if (de <= 0.3) return 75;
  if (de <= 0.5) return 60;
  if (de <= 0.8) return 45;
  if (de <= 1.5) return 30;
  return 15;
}

function scoreCurrentRatio(cr: number | null): number | null {
  if (cr === null || cr <= 0) return null;
  if (cr >= 2.5) return 75;
  if (cr >= 1.5) return 85;
  if (cr >= 1.0) return 60;
  if (cr >= 0.75) return 40;
  return 20;
}

function scoreMarketCap(mc: number | null): number | null {
  if (mc === null || mc <= 0) return null;
  if (mc >= 500000000000) return 85;
  if (mc >= 100000000000) return 75;
  if (mc >= 50000000000) return 65;
  if (mc >= 10000000000) return 55;
  if (mc >= 5000000000) return 45;
  return 35;
}

export interface FactorScoreMap {
  [factorId: string]: number | null;
}

export function computeFactorScores(rawData: Record<string, unknown> | null | undefined): FactorScoreMap {
  if (!rawData) return {};

  const pe = normalizeNumericValue(rawData.pe);
  const pb = normalizeNumericValue(rawData.pb);
  const ev = normalizeNumericValue(rawData.ev_ebitda);
  const dy = normalizeNumericValue(rawData.dividend_yield);
  const roe = normalizeNumericValue(rawData.roe);
  const roic = normalizeNumericValue(rawData.roic);
  const om = normalizeNumericValue(rawData.operating_margin);
  const rg = normalizeNumericValue(rawData.revenue_growth);
  const pg = normalizeNumericValue(rawData.profit_growth);
  const eg = normalizeNumericValue(rawData.eps_growth);
  const de = normalizeNumericValue(rawData.debt_equity);
  const cr = normalizeNumericValue(rawData.current_ratio);
  const mc = normalizeNumericValue(rawData.market_cap);

  return {
    pe_ratio: scorePE(pe),
    pb_ratio: scorePB(pb),
    ev_ebitda: scoreEVEBITDA(ev),
    dividend_yield: scoreDividendYield(dy),
    roe: scoreROE(roe),
    roic: scoreROIC(roic),
    operating_margin: scoreOperatingMargin(om),
    revenue_growth: scoreRevenueGrowth(rg),
    profit_growth: scoreProfitGrowth(pg),
    eps_growth: scoreEPSGrowth(eg),
    debt_equity: scoreDebtEquity(de),
    current_ratio: scoreCurrentRatio(cr),
    market_cap: scoreMarketCap(mc),
  };
}

export function countActiveFactors(scores: FactorScoreMap): number {
  return Object.values(scores).filter((v) => v !== null).length;
}

export function countActiveFactorsByCategory(scores: FactorScoreMap): Record<string, number> {
  const cats: Record<string, number> = {};
  Object.entries(scores).forEach(([id, score]) => {
    if (score !== null) {
      const cat = idToCategory(id);
      cats[cat] = (cats[cat] || 0) + 1;
    }
  });
  return cats;
}

function idToCategory(id: string): string {
  if (["pe_ratio", "pb_ratio", "ev_ebitda", "dividend_yield"].includes(id)) return "valuation";
  if (["roe", "roic", "operating_margin"].includes(id)) return "profitability";
  if (["revenue_growth", "profit_growth", "eps_growth"].includes(id)) return "growth";
  if (["debt_equity", "current_ratio"].includes(id)) return "balance_sheet";
  if (["market_cap"].includes(id)) return "sector_context";
  return "other";
}
