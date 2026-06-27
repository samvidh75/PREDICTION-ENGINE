import type { StockFundamentals } from './stockUniverse';
import { getScannerStocks, getStockResearch } from '../../lib/stockResearch';

export interface FactorScores {
  quality: number;
  valuation: number;
  growth: number;
  risk: number;
  technical: number;
  overall: number;
}

export type ScanType = 'quality' | 'value' | 'momentum' | 'stable';

export function computeScores(f: StockFundamentals): FactorScores {
  const detail = getStockResearch(f.symbol);
  return {
    quality: detail?.scores.quality ?? 50,
    valuation: detail?.scores.valuation ?? 50,
    growth: detail?.scores.growth ?? 50,
    risk: detail?.scores.risk ?? 50,
    technical: detail?.scores.momentum ?? 50,
    overall: detail?.scores.health ?? 50,
  };
}

export function scanByType(type: ScanType): (StockFundamentals & FactorScores)[] {
  return getScannerStocks(type).map((stock) => ({
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    industry: stock.industry,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    pe: stock.pe ?? 0,
    pb: stock.pb ?? 0,
    roe: stock.roe ?? 0,
    debtToEquity: stock.debtToEquity ?? 0,
    marketCap: stock.marketCap,
    dividendYield: stock.dividendYield ?? 0,
    revenueGrowth: stock.revenueGrowth ?? 0,
    profitGrowth: stock.profitGrowth ?? 0,
    rsi: stock.rsi ?? 50,
    quality: stock.scores.quality ?? 50,
    valuation: stock.scores.valuation ?? 50,
    growth: stock.scores.growth ?? 50,
    risk: stock.scores.risk ?? 50,
    technical: stock.scores.momentum ?? 50,
    overall: stock.scores.health ?? 50,
  }));
}

export function getStockBySymbol(symbol: string): (StockFundamentals & FactorScores) | undefined {
  const stock = getStockResearch(symbol);
  if (!stock) return undefined;
  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    industry: stock.industry,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    pe: stock.pe ?? 0,
    pb: stock.pb ?? 0,
    roe: stock.roe ?? 0,
    debtToEquity: stock.debtToEquity ?? 0,
    marketCap: stock.marketCap,
    dividendYield: stock.dividendYield ?? 0,
    revenueGrowth: stock.revenueGrowth ?? 0,
    profitGrowth: stock.profitGrowth ?? 0,
    rsi: stock.rsi ?? 50,
    quality: stock.scores.quality ?? 50,
    valuation: stock.scores.valuation ?? 50,
    growth: stock.scores.growth ?? 50,
    risk: stock.scores.risk ?? 50,
    technical: stock.scores.momentum ?? 50,
    overall: stock.scores.health ?? 50,
  };
}
