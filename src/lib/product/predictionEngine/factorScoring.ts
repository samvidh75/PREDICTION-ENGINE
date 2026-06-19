import { normalizeNumericValue } from "./factorNormalization";

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
  if (dy >= 0.06) return 60;
  if (dy >= 0.04) return 75;
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

function scoreROA(roa: number | null): number | null {
  if (roa === null) return null;
  if (roa >= 0.12) return 80;
  if (roa >= 0.08) return 70;
  if (roa >= 0.05) return 55;
  if (roa >= 0.02) return 40;
  if (roa > 0) return 25;
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

function scoreNetMargin(nm: number | null): number | null {
  if (nm === null) return null;
  if (nm >= 0.15) return 80;
  if (nm >= 0.10) return 70;
  if (nm >= 0.06) return 55;
  if (nm >= 0.02) return 40;
  if (nm > 0) return 25;
  return 10;
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

function scoreEPS(eps: number | null): number | null {
  if (eps === null || eps <= 0) return null;
  if (eps >= 100) return 80;
  if (eps >= 50) return 70;
  if (eps >= 20) return 60;
  if (eps >= 10) return 50;
  if (eps >= 5) return 40;
  if (eps >= 1) return 30;
  return 20;
}

function scoreSales(sales: number | null): number | null {
  if (sales === null || sales <= 0) return null;
  if (sales >= 500000000000) return 85;
  if (sales >= 100000000000) return 75;
  if (sales >= 10000000000) return 65;
  if (sales >= 5000000000) return 55;
  if (sales >= 1000000000) return 45;
  if (sales >= 500000000) return 35;
  return 25;
}

function scoreBookValue(bv: number | null): number | null {
  if (bv === null || bv <= 0) return null;
  if (bv >= 1000) return 75;
  if (bv >= 500) return 65;
  if (bv >= 100) return 55;
  if (bv >= 50) return 45;
  if (bv >= 10) return 35;
  return 25;
}

export interface FactorScoreMap {
  [factorId: string]: number | null;
}

export function computeFactorScores(rawData: Record<string, unknown> | null | undefined): FactorScoreMap {
  if (!rawData) return {};

  const pe = normalizeNumericValue(rawData.pe ?? rawData.peRatio);
  const pb = normalizeNumericValue(rawData.pb ?? rawData.pbRatio);
  const ev = normalizeNumericValue(rawData.ev_ebitda ?? rawData.evEbitda);
  const dy = normalizeNumericValue(rawData.dividend_yield ?? rawData.dividendYield);
  const roe = normalizeNumericValue(rawData.roe);
  const roic = normalizeNumericValue(rawData.roic);
  const roa = normalizeNumericValue(rawData.roa);
  const om = normalizeNumericValue(rawData.operating_margin ?? rawData.operatingMargin);
  const nm = normalizeNumericValue(rawData.net_margin ?? rawData.netMargin);
  const rg = normalizeNumericValue(rawData.revenue_growth ?? rawData.revenueGrowth);
  const pg = normalizeNumericValue(rawData.profit_growth ?? rawData.profitGrowth);
  const eg = normalizeNumericValue(rawData.eps_growth ?? rawData.epsGrowth);
  const de = normalizeNumericValue(rawData.debt_equity ?? rawData.debtToEquity);
  const cr = normalizeNumericValue(rawData.current_ratio ?? rawData.currentRatio);
  const mc = normalizeNumericValue(rawData.market_cap ?? rawData.marketCap);
  const eps = normalizeNumericValue(rawData.eps);
  const sales = normalizeNumericValue(rawData.sales);
  const bv = normalizeNumericValue(rawData.book_value ?? rawData.bookValue);

  return {
    pe_ratio: scorePE(pe),
    pb_ratio: scorePB(pb),
    ev_ebitda: scoreEVEBITDA(ev),
    dividend_yield: scoreDividendYield(dy),
    roe: scoreROE(roe),
    roic: scoreROIC(roic),
    roa: scoreROA(roa),
    operating_margin: scoreOperatingMargin(om),
    net_margin: scoreNetMargin(nm),
    revenue_growth: scoreRevenueGrowth(rg),
    profit_growth: scoreProfitGrowth(pg),
    eps_growth: scoreEPSGrowth(eg),
    debt_equity: scoreDebtEquity(de),
    current_ratio: scoreCurrentRatio(cr),
    market_cap: scoreMarketCap(mc),
    eps: scoreEPS(eps),
    sales: scoreSales(sales),
    book_value: scoreBookValue(bv),
  };
}

export function countActiveFactors(scores: FactorScoreMap): number {
  return Object.values(scores).filter((v) => v !== null).length;
}

export function countActiveFactorsByCategory(scores: FactorScoreMap): Record<string, number> {
  const cats: Record<string, number> = {};
  Object.entries(scores).forEach(([id, score]) => {
    if (score !== null) {
      cats[idToCategory(id)] = (cats[idToCategory(id)] || 0) + 1;
    }
  });
  return cats;
}

export function getTopFactors(scores: FactorScoreMap, count: number = 3): Array<{ id: string; score: number }> {
  return Object.entries(scores)
    .filter(([_, v]) => v !== null)
    .map(([id, v]) => ({ id, score: v as number }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export function getBottomFactors(scores: FactorScoreMap, count: number = 3): Array<{ id: string; score: number }> {
  return Object.entries(scores)
    .filter(([_, v]) => v !== null)
    .map(([id, v]) => ({ id, score: v as number }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count);
}

const CATEGORY_MAP: Record<string, string> = {
  pe_ratio: "valuation", pb_ratio: "valuation", ev_ebitda: "valuation", dividend_yield: "valuation",
  roe: "profitability", roic: "profitability", roa: "profitability", operating_margin: "profitability", net_margin: "profitability",
  revenue_growth: "growth", profit_growth: "growth", eps_growth: "growth",
  debt_equity: "balance_sheet", current_ratio: "balance_sheet",
  market_cap: "sector_context", eps: "profitability", sales: "profitability", book_value: "valuation",
};

function idToCategory(id: string): string {
  return CATEGORY_MAP[id] || "other";
}
