import { UnifiedPredictionInput, UnifiedHorizon } from '../types';

function finiteOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapHorizon(days: number): UnifiedHorizon {
  const horizons: UnifiedHorizon[] = [7, 30, 90, 180, 365];
  return horizons.reduce((prev, curr) =>
    Math.abs(curr - days) < Math.abs(prev - days) ? curr : prev
  );
}

function fundamentalNumber(fundamentals: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = finiteOrNull(fundamentals[key]);
    if (val !== null) return val;
  }
  return null;
}

function daysBetween(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

export function adaptScoreSnapshotParams(
  symbol: string,
  horizon: number,
  closePrices: number[],
  tradeDates: string[],
  fundamentalSnapshot: Record<string, unknown>,
  sectorScore?: number | null,
): UnifiedPredictionInput {
  const mappedHorizon = mapHorizon(horizon);
  const tradeDate = tradeDates.length > 0
    ? tradeDates[tradeDates.length - 1]
    : new Date().toISOString().slice(0, 10);
  const latestClose = closePrices.length > 0
    ? finiteOrNull(closePrices[closePrices.length - 1])
    : null;
  const priceFreshness = tradeDate ? daysBetween(tradeDate) : null;

  const fundamentalAsOf: string | null =
    (String(fundamentalSnapshot.asOfDate ?? fundamentalSnapshot.period_end ?? fundamentalSnapshot.snapshot_date ?? '') || null);
  const fundamentalFreshness = fundamentalAsOf ? daysBetween(fundamentalAsOf) : null;

  return {
    symbol,
    exchange: null,
    sector: (String(fundamentalSnapshot.sector ?? fundamentalSnapshot.sector_name ?? '') || null),
    tradeDate,
    horizon: mappedHorizon,

    close: latestClose,
    open: null,
    high: null,
    low: null,
    volume: null,
    closePrices: closePrices
      .map(c => finiteOrNull(c))
      .filter((v): v is number => v !== null),
    tradeDates: tradeDates.filter(d => typeof d === 'string'),
    priceFreshnessDays: priceFreshness,

    rsi: null,
    macd: null,
    macdSignal: null,
    macdHistogram: null,
    adx: null,
    atr: null,
    bollingerWidth: null,
    relativeStrength: null,
    movingAverageDistance: null,
    trendStrength: null,
    featureFreshnessDays: null,

    qualityFactor: null,
    valueFactor: null,
    growthFactor: null,
    momentumFactor: null,
    riskFactor: null,
    sectorStrengthFactor: sectorScore != null ? finiteOrNull(sectorScore) : null,
    factorFreshnessDays: null,

    peRatio: fundamentalNumber(fundamentalSnapshot, 'pe_ratio', 'peRatio'),
    pbRatio: fundamentalNumber(fundamentalSnapshot, 'pb_ratio', 'pbRatio'),
    eps: fundamentalNumber(fundamentalSnapshot, 'eps'),
    dividendYield: fundamentalNumber(fundamentalSnapshot, 'dividend_yield', 'dividendYield'),
    beta: fundamentalNumber(fundamentalSnapshot, 'beta'),
    marketCap: fundamentalNumber(fundamentalSnapshot, 'market_cap', 'marketCap'),
    freeFloat: fundamentalNumber(fundamentalSnapshot, 'free_float', 'freeFloat'),
    fcfYield: fundamentalNumber(fundamentalSnapshot, 'fcf_yield', 'fcfYield'),
    evEbitda: fundamentalNumber(fundamentalSnapshot, 'ev_ebitda', 'evEbitda'),
    roa: fundamentalNumber(fundamentalSnapshot, 'roa'),
    roe: fundamentalNumber(fundamentalSnapshot, 'roe'),
    roic: fundamentalNumber(fundamentalSnapshot, 'roic'),
    debtToEquity: fundamentalNumber(fundamentalSnapshot, 'debt_to_equity', 'debtToEquity'),
    currentRatio: fundamentalNumber(fundamentalSnapshot, 'current_ratio', 'currentRatio'),
    revenueGrowth: fundamentalNumber(fundamentalSnapshot, 'revenue_growth', 'revenueGrowth'),
    profitGrowth: fundamentalNumber(fundamentalSnapshot, 'profit_growth', 'profitGrowth', 'earnings_growth', 'earningsGrowth'),
    epsGrowth: fundamentalNumber(fundamentalSnapshot, 'eps_growth', 'epsGrowth'),
    fcfGrowth: fundamentalNumber(fundamentalSnapshot, 'fcf_growth', 'fcfGrowth'),
    grossMargin: fundamentalNumber(fundamentalSnapshot, 'gross_margin', 'grossMargin'),
    operatingMargin: fundamentalNumber(fundamentalSnapshot, 'operating_margin', 'operatingMargin'),
    netMargin: fundamentalNumber(fundamentalSnapshot, 'net_margin', 'netMargin'),
    revenue: fundamentalNumber(fundamentalSnapshot, 'revenue'),
    operatingProfit: fundamentalNumber(fundamentalSnapshot, 'operating_profit', 'operatingProfit'),
    netProfit: fundamentalNumber(fundamentalSnapshot, 'net_profit', 'netProfit'),
    totalAssets: fundamentalNumber(fundamentalSnapshot, 'total_assets', 'totalAssets'),
    totalDebt: fundamentalNumber(fundamentalSnapshot, 'total_debt', 'totalDebt'),
    equity: fundamentalNumber(fundamentalSnapshot, 'equity'),
    cashFlowFromOperations: fundamentalNumber(fundamentalSnapshot, 'cash_flow_from_operations', 'cashFlowFromOperations'),
    fundamentalFreshnessDays: fundamentalFreshness,

    providerCount: 1,
    lineageCount: 0,
    fieldCompleteness: 0,
    staleFieldCount: 0,
    partialFactorCount: 0,
    sourceConfidence: 0,

    sectorPeers: [],

    freshnessThresholds: {
      priceMaxAgeDays: 5,
      fundamentalMaxAgeDays: 180,
      factorMaxAgeDays: 7,
      featureMaxAgeDays: 7,
    },
  };
}
