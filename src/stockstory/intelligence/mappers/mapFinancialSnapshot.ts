/**
 * Financial Snapshot Mapper
 *
 * Maps a raw DB row from financial_snapshots to canonical
 * IntelligenceInput.financials with safe numeric conversion.
 * Invalid/NaN/Infinity values are set to null.
 */

export interface FinancialSnapshotRaw {
  market_cap?: number | string | null;
  pe_ratio?: number | string | null;
  pb_ratio?: number | string | null;
  eps?: number | string | null;
  dividend_yield?: number | string | null;
  beta?: number | string | null;
  free_float?: number | string | null;
  fcf_yield?: number | string | null;
  ev_ebitda?: number | string | null;
  roa?: number | string | null;
  roe?: number | string | null;
  roic?: number | string | null;
  roce?: number | string | null;
  debt_to_equity?: number | string | null;
  current_ratio?: number | string | null;
  revenue_growth?: number | string | null;
  profit_growth?: number | string | null;
  eps_growth?: number | string | null;
  fcf_growth?: number | string | null;
  gross_margin?: number | string | null;
  operating_margin?: number | string | null;
  net_margin?: number | string | null;
  interest_coverage?: number | string | null;
  asset_turnover?: number | string | null;
  receivables_turnover?: number | string | null;
  inventory_turnover?: number | string | null;
  operating_cash_flow?: number | string | null;
  free_cash_flow?: number | string | null;
  capex?: number | string | null;
  asOf?: string;
}

export interface FinancialSnapshotMapped {
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  beta: number | null;
  marketCap: number | null;
  freeFloat: number | null;
  fcfYield: number | null;
  evEbitda: number | null;
  roa: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  fcfGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  interestCoverage: number | null;
  assetTurnover: number | null;
  receivablesTurnover: number | null;
  inventoryTurnover: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  capex: number | null;
  asOf: string | null;
}

export function mapFinancialSnapshot(raw: FinancialSnapshotRaw): FinancialSnapshotMapped {
  return {
    peRatio: toNumber(raw.pe_ratio),
    pbRatio: toNumber(raw.pb_ratio),
    eps: toNumber(raw.eps),
    dividendYield: toNumber(raw.dividend_yield),
    beta: toNumber(raw.beta),
    marketCap: toNumber(raw.market_cap),
    freeFloat: toNumber(raw.free_float),
    fcfYield: toNumber(raw.fcf_yield),
    evEbitda: toNumber(raw.ev_ebitda),
    roa: toNumber(raw.roa),
    roe: toNumber(raw.roe),
    roic: toNumber(raw.roic),
    debtToEquity: toRatioPct(raw.debt_to_equity),
    currentRatio: toNumber(raw.current_ratio),
    revenueGrowth: toNumber(raw.revenue_growth),
    profitGrowth: toNumber(raw.profit_growth),
    epsGrowth: toNumber(raw.eps_growth),
    fcfGrowth: toNumber(raw.fcf_growth),
    grossMargin: toNumber(raw.gross_margin),
    operatingMargin: toNumber(raw.operating_margin),
    netMargin: toNumber(raw.net_margin),
    interestCoverage: toNumber(raw.interest_coverage),
    assetTurnover: toNumber(raw.asset_turnover),
    receivablesTurnover: toNumber(raw.receivables_turnover),
    inventoryTurnover: toNumber(raw.inventory_turnover),
    operatingCashFlow: toNumber(raw.operating_cash_flow),
    freeCashFlow: toNumber(raw.free_cash_flow),
    capex: toNumber(raw.capex),
    asOf: raw.asOf ?? null,
  };
}

/** Safely convert a value to a number or null. Rejects NaN, ±Infinity. */
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Converts a decimal ratio (e.g. D/E stored as 0.3 for 30%) to
 * percent form (30 for 30%) that the engines expect.
 */
function toRatioPct(v: unknown): number | null {
  const n = toNumber(v);
  if (n === null) return null;
  return n * 100;
}
