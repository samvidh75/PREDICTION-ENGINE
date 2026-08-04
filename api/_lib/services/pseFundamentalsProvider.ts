/**
 * PSE Fundamentals Provider
 *
 * KNOWN GAP (fixed from a real bug): the doc comment here used to claim
 * Yahoo Finance "serves PSE data via the .PSE suffix" — verified false.
 * `.PSE`, `.PS`, and bare symbols were all live-tested against real Yahoo
 * endpoints (both the raw chart API and the yfinance library) across
 * BDO/JFC/SM/TEL/AC/ALI: `.PSE` returns a clean 404 ("symbol may be
 * delisted"); `.PS` returns a dead placeholder shell (exchangeName
 * "YHD", no price, no timestamps). fetchFromYahooPSE below will
 * therefore always return null for a real PSE ticker — it's kept as a
 * harmless no-op fallback path rather than removed outright, in case
 * Yahoo ever adds real PH coverage, but nothing should rely on it working.
 *
 * Every other field this module returns (pe, pb, eps, roe, debtToEquity,
 * growth rates, beta, target price, etc.) is a **deterministic per-symbol
 * hash-based estimate**, not real data, dressed up with sector-typical
 * reference ranges — see fetchPSEFundamentals below. As of this fix, real
 * eps/roe/debtToEquity are available for PSEi-30 symbols via PSE Edge
 * (see scripts/scrape-pse-fundamentals.ts and
 * src/services/scrapers/PSEEdgeScraper.ts) and are used here when
 * present; `isReal` on the returned object reflects this. For any other
 * symbol, all of these fields remain synthetic — callers must not present
 * them as real without checking `isReal`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface RealPseFundamentalsRecord {
  eps: number | null;
  roe: number | null;
  debtToEquity: number | null;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  asOfPeriod: string | null;
}

let realFundamentalsCache: Record<string, RealPseFundamentalsRecord | { error: string }> | null = null;

type RealFundamentalsMap = Record<string, RealPseFundamentalsRecord | { error: string }>;

function loadRealFundamentalsMap(): RealFundamentalsMap {
  if (realFundamentalsCache !== null) return realFundamentalsCache;
  let loaded: RealFundamentalsMap = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), 'data/pse-fundamentals.json'), 'utf-8');
    loaded = JSON.parse(raw).results ?? {};
  } catch {
    // File not generated yet (scripts/scrape-pse-fundamentals.ts hasn't
    // been run) — treat as "no real data available", not an error.
  }
  realFundamentalsCache = loaded;
  return loaded;
}

function loadRealPseFundamentals(symbol: string): RealPseFundamentalsRecord | null {
  const record = loadRealFundamentalsMap()[symbol.toUpperCase()];
  if (!record || 'error' in record) return null;
  return record;
}

const SECTOR_REFERENCE: Record<string, {
  avgPe: number; avgPb: number; avgDividendYield: number;
  avgRoe: number; avgDebtToEquity: number; avgRevenueGrowth: number;
  avgProfitGrowth: number;
}> = {
  'Financials':           { avgPe: 12, avgPb: 1.5, avgDividendYield: 3.5, avgRoe: 14, avgDebtToEquity: 0.3, avgRevenueGrowth: 8, avgProfitGrowth: 10 },
  'Banks':                { avgPe: 13, avgPb: 1.8, avgDividendYield: 3.2, avgRoe: 15, avgDebtToEquity: 0.2, avgRevenueGrowth: 10, avgProfitGrowth: 12 },
  'Real Estate':          { avgPe: 18, avgPb: 2.0, avgDividendYield: 2.5, avgRoe: 10, avgDebtToEquity: 0.6, avgRevenueGrowth: 12, avgProfitGrowth: 10 },
  'Property Development': { avgPe: 16, avgPb: 1.8, avgDividendYield: 2.8, avgRoe: 11, avgDebtToEquity: 0.5, avgRevenueGrowth: 10, avgProfitGrowth: 8 },
  'Consumer Goods':       { avgPe: 22, avgPb: 3.5, avgDividendYield: 2.0, avgRoe: 18, avgDebtToEquity: 0.2, avgRevenueGrowth: 8, avgProfitGrowth: 10 },
  'Food & Beverage':      { avgPe: 24, avgPb: 4.0, avgDividendYield: 1.8, avgRoe: 16, avgDebtToEquity: 0.3, avgRevenueGrowth: 10, avgProfitGrowth: 12 },
  'Telecommunications':   { avgPe: 15, avgPb: 2.5, avgDividendYield: 4.0, avgRoe: 12, avgDebtToEquity: 0.8, avgRevenueGrowth: 5, avgProfitGrowth: 4 },
  'Utilities':            { avgPe: 14, avgPb: 1.8, avgDividendYield: 3.8, avgRoe: 13, avgDebtToEquity: 0.7, avgRevenueGrowth: 6, avgProfitGrowth: 5 },
  'Power Distribution':   { avgPe: 15, avgPb: 2.0, avgDividendYield: 3.5, avgRoe: 14, avgDebtToEquity: 0.8, avgRevenueGrowth: 7, avgProfitGrowth: 6 },
  'Conglomerate':         { avgPe: 15, avgPb: 1.5, avgDividendYield: 2.5, avgRoe: 10, avgDebtToEquity: 0.5, avgRevenueGrowth: 8, avgProfitGrowth: 7 },
  'Industrials':          { avgPe: 16, avgPb: 2.5, avgDividendYield: 2.0, avgRoe: 14, avgDebtToEquity: 0.4, avgRevenueGrowth: 10, avgProfitGrowth: 8 },
  'Logistics & Ports':    { avgPe: 20, avgPb: 4.0, avgDividendYield: 1.5, avgRoe: 18, avgDebtToEquity: 0.3, avgRevenueGrowth: 15, avgProfitGrowth: 12 },
  'Transportation':       { avgPe: 18, avgPb: 3.0, avgDividendYield: 1.5, avgRoe: 12, avgDebtToEquity: 0.6, avgRevenueGrowth: 12, avgProfitGrowth: 10 },
  'Retail':               { avgPe: 20, avgPb: 3.0, avgDividendYield: 2.0, avgRoe: 15, avgDebtToEquity: 0.2, avgRevenueGrowth: 10, avgProfitGrowth: 8 },
  'Energy':               { avgPe: 10, avgPb: 1.2, avgDividendYield: 4.5, avgRoe: 12, avgDebtToEquity: 0.6, avgRevenueGrowth: 8, avgProfitGrowth: 10 },
  'Mining':               { avgPe: 9, avgPb: 1.0, avgDividendYield: 4.0, avgRoe: 10, avgDebtToEquity: 0.3, avgRevenueGrowth: 15, avgProfitGrowth: 12 },
  'Technology':           { avgPe: 25, avgPb: 4.0, avgDividendYield: 0.5, avgRoe: 20, avgDebtToEquity: 0.1, avgRevenueGrowth: 15, avgProfitGrowth: 12 },
  'Healthcare':           { avgPe: 20, avgPb: 3.0, avgDividendYield: 1.5, avgRoe: 14, avgDebtToEquity: 0.2, avgRevenueGrowth: 10, avgProfitGrowth: 8 },
  'General':              { avgPe: 15, avgPb: 2.0, avgDividendYield: 2.5, avgRoe: 12, avgDebtToEquity: 0.4, avgRevenueGrowth: 8, avgProfitGrowth: 6 },
};

export type PSEFundamentals = {
  pe: number | null; pb: number | null; eps: number | null;
  dividendYield: number | null; roe: number | null; roa: number | null;
  roce: number | null; debtToEquity: number | null; currentRatio: number | null;
  interestCoverage: number | null; revenueGrowth: number | null; profitGrowth: number | null;
  marketCap: number | null; beta: number | null; high52w: number | null;
  low52w: number | null; price: number | null; volume: number | null;
  targetMeanPrice: number | null; industryPe: number | null;
  rsi?: number | null;
  /** True when eps/roe/debtToEquity came from a real PSE Edge filing
   * (see loadRealPseFundamentals above) rather than the sector-hash
   * estimate. Every other field on this object is still an estimate even
   * when this is true — PSE Edge only gives us the latest single quarter,
   * not P/B, dividend yield, beta, etc. */
  isReal: boolean;
  /** Real filing period (e.g. "Mar 31, 2026") when isReal is true. */
  realAsOfPeriod: string | null;
};

function getSectorRef(sector: string) {
  return SECTOR_REFERENCE[sector] || SECTOR_REFERENCE['General'];
}

async function fetchFromYahooPSE(symbol: string): Promise<Partial<PSEFundamentals> | null> {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + symbol + '.PSE?range=1mo&interval=1d';
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const data = await response.json() as any;
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const closes = quote?.close?.filter((c: number) => c !== null) || [];
    const volumes = quote?.volume?.filter((v: number) => v !== null) || [];
    const price = meta.regularMarketPrice || closes[closes.length - 1] || null;
    const high52w = meta.fiftyTwoWeekHigh || (closes.length > 0 ? Math.max(...closes) : null);
    const low52w = meta.fiftyTwoWeekLow || (closes.length > 0 ? Math.min(...closes) : null);
    const marketCap = meta.marketCap || (price && meta.regularMarketVolume ? price * meta.regularMarketVolume * 10 : null);
    let rsi: number | null = null;
    if (closes.length >= 15) {
      const gains: number[] = []; const losses: number[] = [];
      for (let i = 1; i < 15; i++) {
        const diff = closes[closes.length - 15 + i] - closes[closes.length - 15 + i - 1];
        gains.push(Math.max(0, diff)); losses.push(Math.max(0, -diff));
      }
      const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
      if (avgLoss !== 0) { const rs = avgGain / avgLoss; rsi = Math.round(100 - 100 / (1 + rs)); } else { rsi = 100; }
    }
    return { price, marketCap, high52w, low52w, volume: volumes.length > 0 ? volumes[volumes.length - 1] : null, rsi };
  } catch (error) {
    console.error('Yahoo PSE fetch failed for ' + symbol + ':', error);
    return null;
  }
}

export async function fetchPSEFundamentals(symbol: string, sector: string = 'General', fallbackPrice: number | null = null): Promise<PSEFundamentals> {
  const yahooData = await fetchFromYahooPSE(symbol);
  const realData = loadRealPseFundamentals(symbol);
  const sectorRef = getSectorRef(sector);
  // Deterministic per-symbol variation based on symbol hash
  // This gives each stock unique but stable fundamentals (not random on every call)
  const symHash = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0) * 31, 0);
  const variation = ((symHash % 40) - 20) / 100; // -20% to +20% variation
  let mcapMultiplier = 1.0;
  if (yahooData?.marketCap) {
    const mcapB = yahooData.marketCap / 1_000_000_000;
    if (mcapB > 100) mcapMultiplier = 1.3; else if (mcapB > 50) mcapMultiplier = 1.2;
    else if (mcapB > 10) mcapMultiplier = 1.0; else if (mcapB > 2) mcapMultiplier = 0.8; else mcapMultiplier = 0.6;
  }
  // Use Yahoo price first, then phisix fallback price
  const price = yahooData?.price ?? fallbackPrice;
  // Apply per-symbol variation to P/E (some stocks trade at premium/discount to sector)
  const adjustedPe = sectorRef.avgPe * mcapMultiplier * (1 + variation);
  const estimatedEps = price && adjustedPe > 0 ? Math.round((price / adjustedPe) * 100) / 100 : null;
  const estimatedPe = price && estimatedEps && estimatedEps > 0 ? Math.round((price / estimatedEps) * 10) / 10 : null;

  // Real eps/roe/debtToEquity from an actual PSE Edge filing take priority
  // over the hash estimate when available. PE is recomputed from the real
  // EPS (still an estimate in the sense that "price" may be a snapshot,
  // but the EPS input itself is now real, not guessed).
  const eps = realData?.eps ?? estimatedEps;
  const pe = price && eps && eps > 0 ? Math.round((price / eps) * 10) / 10 : estimatedPe;
  const roe = realData?.roe ?? Math.round(sectorRef.avgRoe * mcapMultiplier * (1 + variation) * 10) / 10;
  const debtToEquity = realData?.debtToEquity ?? Math.round((sectorRef.avgDebtToEquity * (1 - variation * 0.5)) * 10) / 10;
  const isReal = realData !== null && (realData.eps !== null || realData.roe !== null || realData.debtToEquity !== null);

  return {
    pe, pb: Math.round((sectorRef.avgPb * mcapMultiplier * (1 + variation)) * 10) / 10,
    eps, dividendYield: Math.round((sectorRef.avgDividendYield * (1 + variation)) * 10) / 10,
    roe,
    roa: Math.round((sectorRef.avgRoe * 0.6 * (1 + variation)) * 10) / 10,
    roce: Math.round((sectorRef.avgRoe * 0.8 * (1 + variation)) * 10) / 10,
    debtToEquity,
    currentRatio: Math.round((1.5 + (symHash % 20) / 10) * 10) / 10,
    interestCoverage: Math.round((3 + (symHash % 70) / 10) * 10) / 10,
    revenueGrowth: Math.round(sectorRef.avgRevenueGrowth * mcapMultiplier * (1 + variation) * 10) / 10,
    profitGrowth: Math.round(sectorRef.avgProfitGrowth * mcapMultiplier * (1 + variation) * 10) / 10,
    marketCap: yahooData?.marketCap ?? null, beta: Math.round((0.7 + ((symHash % 60) / 100)) * 100) / 100,
    high52w: yahooData?.high52w ?? null, low52w: yahooData?.low52w ?? null, price: price,
    volume: yahooData?.volume ?? null,
    targetMeanPrice: price ? Math.round((price * (1 + ((symHash % 20) - 5) / 100)) * 100) / 100 : null,
    industryPe: Math.round(sectorRef.avgPe * 10) / 10,
    isReal,
    realAsOfPeriod: isReal ? (realData?.asOfPeriod ?? null) : null,
  };
}

export function calculatePSEHealthScore(metrics: any) {
  let valuation = 50, quality = 50, growth = 50, momentum = 50, risk = 50, health = 50;
  if (metrics.marketCap) {
    const mcapB = metrics.marketCap / 1_000_000_000;
    if (mcapB > 100) valuation += 8; else if (mcapB > 10) valuation += 5; else if (mcapB > 2) valuation += 0; else valuation -= 3;
  }
  if (metrics.pe) { valuation += metrics.pe < 10 ? 10 : metrics.pe < 15 ? 5 : metrics.pe < 20 ? 0 : metrics.pe < 30 ? -5 : -10; }
  if (metrics.pb) { valuation += metrics.pb < 1 ? 8 : metrics.pb < 1.5 ? 4 : metrics.pb < 2.5 ? 0 : -5; }
  if (metrics.dividendYield) { valuation += metrics.dividendYield > 4 ? 8 : metrics.dividendYield > 2 ? 4 : metrics.dividendYield > 0 ? 2 : 0; }
  if (metrics.roe) { quality += metrics.roe > 20 ? 15 : metrics.roe > 15 ? 10 : metrics.roe > 10 ? 5 : metrics.roe > 5 ? 0 : -10; }
  if (metrics.roa) { quality += metrics.roa > 8 ? 10 : metrics.roa > 5 ? 5 : -5; }
  if (metrics.roce) { quality += metrics.roce > 15 ? 10 : metrics.roce > 10 ? 5 : -3; }
  if (metrics.debtToEquity !== undefined && metrics.debtToEquity !== null) { quality += metrics.debtToEquity < 0.3 ? 12 : metrics.debtToEquity < 0.6 ? 8 : metrics.debtToEquity < 1.0 ? 3 : -5; }
  if (metrics.interestCoverage) { quality += metrics.interestCoverage > 5 ? 10 : metrics.interestCoverage > 3 ? 5 : 0; }
  if (metrics.revenueGrowth) { growth += metrics.revenueGrowth > 20 ? 18 : metrics.revenueGrowth > 15 ? 12 : metrics.revenueGrowth > 10 ? 6 : metrics.revenueGrowth > 5 ? 0 : -5; }
  if (metrics.profitGrowth) { growth += metrics.profitGrowth > 25 ? 18 : metrics.profitGrowth > 15 ? 12 : metrics.profitGrowth > 10 ? 6 : metrics.profitGrowth > 5 ? 0 : -5; }
  if (metrics.high52w && metrics.low52w && metrics.price) {
    const range = metrics.high52w - metrics.low52w;
    const position = range > 0 ? (metrics.price - metrics.low52w) / range : 0.5;
    momentum += position > 0.8 ? 15 : position > 0.6 ? 10 : position > 0.4 ? 5 : position > 0.2 ? 0 : -8;
  }
  if (metrics.rsi !== undefined && metrics.rsi !== null) { momentum += metrics.rsi > 70 ? -8 : metrics.rsi > 60 ? 5 : metrics.rsi > 40 ? 10 : metrics.rsi > 30 ? 3 : -5; }
  if (metrics.volume && metrics.avgVolume) { const volRatio = metrics.volume / metrics.avgVolume; momentum += volRatio > 1.5 ? 8 : volRatio > 1.0 ? 3 : 0; }
  if (metrics.beta) { risk += metrics.beta < 0.7 ? 12 : metrics.beta < 0.9 ? 8 : metrics.beta < 1.1 ? 5 : metrics.beta < 1.3 ? 0 : -8; }
  if (metrics.volatility) { risk += metrics.volatility < 20 ? 12 : metrics.volatility < 30 ? 6 : metrics.volatility < 40 ? 0 : -10; }
  if (metrics.marketCap) { const mcapB = metrics.marketCap / 1_000_000_000; risk += mcapB > 50 ? 8 : mcapB > 10 ? 5 : mcapB > 2 ? 0 : -5; }
  if (metrics.debtToEquity !== undefined && metrics.debtToEquity !== null) { health += metrics.debtToEquity < 0.3 ? 10 : metrics.debtToEquity < 0.6 ? 5 : metrics.debtToEquity < 1.0 ? 0 : -8; }
  if (metrics.currentRatio) { health += metrics.currentRatio > 2.0 ? 8 : metrics.currentRatio > 1.5 ? 4 : metrics.currentRatio > 1.0 ? 0 : -5; }
  if (metrics.roe) { health += metrics.roe > 15 ? 8 : metrics.roe > 10 ? 4 : 0; }
  const overall = Math.round(
    Math.max(0, valuation) * 0.20 + Math.max(0, quality) * 0.25 + Math.max(0, growth) * 0.20 +
    Math.max(0, momentum) * 0.15 + Math.max(0, risk) * 0.10 + Math.max(0, health) * 0.10
  );
  return {
    valuation: Math.max(0, Math.min(100, valuation)),
    quality: Math.max(0, Math.min(100, quality)),
    growth: Math.max(0, Math.min(100, growth)),
    momentum: Math.max(0, Math.min(100, momentum)),
    risk: Math.max(0, Math.min(100, risk)),
    health: Math.max(0, Math.min(100, health)),
    overall: Math.max(0, Math.min(100, overall)),
  };
}


/**
 * Generate estimated financial history (annual + quarterly) based on
 * market cap and sector growth rates. Uses real market cap from Yahoo
 * when available, combined with sector-typical revenue/margin profiles.
 */
export function generatePSEFinancialHistory(
  symbol: string,
  marketCap: number | null,
  sector: string = 'General',
): {
  annual: { revenue: Array<{ period: string; value: number }>; profit: Array<{ period: string; value: number }>; ebitda: Array<{ period: string; value: number }> };
  quarterly: { revenue: Array<{ period: string; value: number }>; profit: Array<{ period: string; value: number }>; ebitda: Array<{ period: string; value: number }> };
} {
  const sectorRef = getSectorRef(sector);
  const baseRevenue = marketCap ? marketCap / (sectorRef.avgPe * 0.8) : 5000000000;
  const growthRate = sectorRef.avgRevenueGrowth / 100;
  const profitMargin = 0.12;
  const ebitdaMargin = 0.18;

  const currentYear = new Date().getFullYear();
  const annual = { revenue: [] as any[], profit: [] as any[], ebitda: [] as any[] };
  const quarterly = { revenue: [] as any[], profit: [] as any[], ebitda: [] as any[] };

  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i;
    const revenueMultiplier = Math.pow(1 + growthRate, -i);
    const revenue = Math.round(baseRevenue * revenueMultiplier);
    annual.revenue.push({ period: `FY${year}`, value: revenue });
    annual.profit.push({ period: `FY${year}`, value: Math.round(revenue * profitMargin) });
    annual.ebitda.push({ period: `FY${year}`, value: Math.round(revenue * ebitdaMargin) });
  }

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  for (let i = 3; i >= 0; i--) {
    const year = currentYear - i;
    const yearRevenue = baseRevenue * Math.pow(1 + growthRate, -i);
    for (let q = 0; q < 4; q++) {
      const quarterRevenue = Math.round(yearRevenue / 4 * (0.9 + Math.random() * 0.2));
      quarterly.revenue.push({ period: `${year} ${quarters[q]}`, value: quarterRevenue });
      quarterly.profit.push({ period: `${year} ${quarters[q]}`, value: Math.round(quarterRevenue * profitMargin) });
      quarterly.ebitda.push({ period: `${year} ${quarters[q]}`, value: Math.round(quarterRevenue * ebitdaMargin) });
    }
  }

  return { annual, quarterly };
}

