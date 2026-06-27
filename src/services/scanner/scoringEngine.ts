import { STOCK_UNIVERSE, type StockFundamentals } from './stockUniverse';

export interface FactorScores {
  quality: number;
  valuation: number;
  growth: number;
  risk: number;
  technical: number;
  overall: number;
}

export type ScanType = 'quality' | 'value' | 'momentum' | 'stable';

function scoreQuality(roe: number, debtToEquity: number): number {
  let score = 40;
  if (roe > 30) score = 92;
  else if (roe > 25) score = 85;
  else if (roe > 20) score = 75;
  else if (roe > 15) score = 65;
  else if (roe > 10) score = 55;

  if (debtToEquity < 0.3) score += 5;
  else if (debtToEquity > 2) score -= 10;

  return Math.min(100, Math.max(0, score));
}

function scoreValuation(pe: number, pb: number): number {
  let score = 40;
  if (pe < 10) score = 90;
  else if (pe < 15) score = 82;
  else if (pe < 20) score = 72;
  else if (pe < 25) score = 62;
  else if (pe < 30) score = 52;
  else if (pe < 40) score = 42;
  else score = 30;

  if (pb < 1.5) score += 8;
  else if (pb > 10) score -= 8;

  return Math.min(100, Math.max(0, score));
}

function scoreGrowth(revenueGrowth: number, profitGrowth: number): number {
  const avg = (revenueGrowth + profitGrowth) / 2;
  let score = 40;
  if (avg > 25) score = 88;
  else if (avg > 20) score = 80;
  else if (avg > 15) score = 72;
  else if (avg > 10) score = 62;
  else if (avg > 5) score = 52;
  else score = 35;

  return Math.min(100, Math.max(0, score));
}

function scoreRisk(debtToEquity: number, dividendYield: number): number {
  let score = 50;
  if (debtToEquity < 0.1) score = 88;
  else if (debtToEquity < 0.3) score = 82;
  else if (debtToEquity < 0.5) score = 75;
  else if (debtToEquity < 1) score = 65;
  else if (debtToEquity < 2) score = 55;
  else if (debtToEquity < 3) score = 42;
  else score = 28;

  if (dividendYield > 3) score += 8;
  else if (dividendYield > 2) score += 4;

  return Math.min(100, Math.max(0, score));
}

function scoreTechnical(rsi: number): number {
  if (rsi >= 40 && rsi <= 60) return 82;
  if (rsi >= 30 && rsi <= 70) return 62;
  return 38;
}

export function computeScores(f: StockFundamentals): FactorScores {
  const quality = scoreQuality(f.roe, f.debtToEquity);
  const valuation = scoreValuation(f.pe, f.pb);
  const growth = scoreGrowth(f.revenueGrowth, f.profitGrowth);
  const risk = scoreRisk(f.debtToEquity, f.dividendYield);
  const technical = scoreTechnical(f.rsi);

  const overall = Math.round(
    quality * 0.35 +
    valuation * 0.25 +
    growth * 0.20 +
    risk * 0.15 +
    technical * 0.05
  );

  return { quality, valuation, growth, risk, technical, overall };
}

export function scanByType(type: ScanType): (StockFundamentals & FactorScores)[] {
  const scored = STOCK_UNIVERSE.map((s) => ({ ...s, ...computeScores(s) }));
  const weights: Record<ScanType, keyof FactorScores> = {
    quality: 'quality',
    value: 'valuation',
    momentum: 'growth',
    stable: 'risk',
  };
  const sortKey = weights[type];
  return scored.sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
}

export function getStockBySymbol(symbol: string): (StockFundamentals & FactorScores) | undefined {
  const stock = STOCK_UNIVERSE.find(
    (s) => s.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!stock) return undefined;
  return { ...stock, ...computeScores(stock) };
}
