/**
 * Fundamentals Provider: Fetches fundamental data for a symbol.
 * Delegates to the persisted stock research + Yahoo/IndianAPI pipeline.
 */

import { getPersistedStockResearch } from '../../lib/stockResearchSnapshot.js';

export interface FundamentalsResult {
  symbol: string;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  evEbitda: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  marketCap: number;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  eps: number | null;
  volatility: number | null;
  price: number;
  sector: string;
  industry: string;
  dataSource: string;
}

export async function fetchFundamentals(symbol: string): Promise<FundamentalsResult | null> {
  try {
    const research = await getPersistedStockResearch(symbol);
    if (!research) return null;

    return {
      symbol: research.symbol,
      pe: research.pe,
      pb: research.pb,
      roe: research.roe,
      roic: null,
      debtToEquity: research.debtToEquity,
      evEbitda: null,
      fcfYield: null,
      dividendYield: research.dividendYield,
      marketCap: research.marketCap,
      revenueGrowth: research.revenueGrowth,
      profitGrowth: research.profitGrowth,
      eps: research.eps,
      volatility: research.volatility,
      price: research.price,
      sector: research.sector,
      industry: research.industry,
      dataSource: 'persisted-universe',
    };
  } catch {
    return null;
  }
}
