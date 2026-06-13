export interface FinancialPrimitiveSnapshot {
  symbol: string;
  exchange: string;
  isin?: string | null;
  companyName?: string;
  sector?: string;
  industry?: string;
  fiscalPeriod: string;
  periodEnd: string;
  sourceAsOf: string;
  retrievedAt: string;

  revenue?: number | null;
  grossProfit?: number | null;
  operatingProfit?: number | null;
  netProfit?: number | null;
  totalAssets?: number | null;
  totalDebt?: number | null;
  equity?: number | null;
  cashAndEquivalents?: number | null;
  currentAssets?: number | null;
  currentLiabilities?: number | null;
  cashFlowFromOperations?: number | null;
  capitalExpenditure?: number | null;
  freeCashFlow?: number | null;
  ebitda?: number | null;
  eps?: number | null;
  sharesOutstanding?: number | null;
  freeFloatShares?: number | null;
  dividendPerShare?: number | null;

  marketCap?: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  freeFloat?: number | null;
  fcfYield?: number | null;
  evEbitda?: number | null;
  roa?: number | null;
  roe?: number | null;
  roic?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
  epsGrowth?: number | null;
  fcfGrowth?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;

  _sources: Record<string, string>;
  _sourceUrls: Record<string, string>;
  _sourceAsOf: Record<string, string>;
  _fieldConfidence: Record<string, number>;
  _providerErrors: string[];
  _statementBasis?: 'consolidated' | 'standalone' | 'unknown';
}
