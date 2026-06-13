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

function daysBetween(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function pickFinite(record: Record<string, unknown> | undefined | null, ...keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const val = finiteOrNull(record[key]);
    if (val !== null) return val;
  }
  return null;
}

export function adaptDatabaseSnapshot(
  symbol: string,
  tradeDate: string,
  horizon: number,
  fundamentals: Record<string, unknown>,
  prices: Array<Record<string, unknown>>,
  technicals?: Record<string, unknown>,
  factors?: Record<string, unknown>,
  sector?: string | null,
): UnifiedPredictionInput {
  const mappedHorizon = mapHorizon(horizon);
  const priceFreshness = daysBetween(tradeDate);

  const sortedPrices = [...prices].sort((a, b) => {
    const da = String(a.trade_date ?? a.tradingDate ?? '');
    const db = String(b.trade_date ?? b.tradingDate ?? '');
    return da.localeCompare(db);
  });

  const closePrices: number[] = [];
  const tradeDates: string[] = [];
  let latestClose: number | null = null;
  let latestOpen: number | null = null;
  let latestHigh: number | null = null;
  let latestLow: number | null = null;
  let latestVolume: number | null = null;

  for (const p of sortedPrices) {
    const c = finiteOrNull(p.close ?? p.close_price);
    if (c !== null) closePrices.push(c);
    const td = String(p.trade_date ?? p.tradingDate ?? '');
    if (td) tradeDates.push(td);
    latestClose = c;
    latestOpen = pickFinite(p, 'open', 'open_price');
    latestHigh = pickFinite(p, 'high', 'high_price');
    latestLow = pickFinite(p, 'low', 'low_price');
    latestVolume = pickFinite(p, 'volume');
  }

  const fundamentalAsOf: string | null =
    (String(fundamentals.asOfDate ?? fundamentals.period_end ?? fundamentals.snapshot_date ?? '') || null);
  const fundamentalFreshness = fundamentalAsOf ? daysBetween(fundamentalAsOf) : null;
  const featureFreshness = technicals ? daysBetween(String(technicals.trade_date ?? technicals.snapshot_date ?? '')) : null;
  const factorFreshness = factors ? daysBetween(String(factors.trade_date ?? '')) : null;

  return {
    symbol,
    exchange: null,
    sector: sector ?? (String(fundamentals.sector ?? fundamentals.sector_name ?? '') || null),
    tradeDate,
    horizon: mappedHorizon,

    close: latestClose,
    open: latestOpen,
    high: latestHigh,
    low: latestLow,
    volume: latestVolume,
    closePrices,
    tradeDates,
    priceFreshnessDays: priceFreshness,

    rsi: pickFinite(technicals, 'rsi'),
    macd: pickFinite(technicals, 'macd'),
    macdSignal: pickFinite(technicals, 'macd_signal', 'macdSignal'),
    macdHistogram: pickFinite(technicals, 'macd_histogram', 'macdHistogram'),
    adx: pickFinite(technicals, 'adx'),
    atr: pickFinite(technicals, 'atr'),
    bollingerWidth: pickFinite(technicals, 'bollinger_width', 'bollingerWidth'),
    relativeStrength: pickFinite(technicals, 'relative_strength', 'relativeStrength'),
    movingAverageDistance: pickFinite(technicals, 'moving_average_distance', 'movingAverageDistance'),
    trendStrength: pickFinite(technicals, 'trend_strength', 'trendStrength'),
    featureFreshnessDays: featureFreshness,

    qualityFactor: pickFinite(factors, 'quality_factor', 'qualityFactor'),
    valueFactor: pickFinite(factors, 'value_factor', 'valueFactor'),
    growthFactor: pickFinite(factors, 'growth_factor', 'growthFactor'),
    momentumFactor: pickFinite(factors, 'momentum_factor', 'momentumFactor'),
    riskFactor: pickFinite(factors, 'risk_factor', 'riskFactor'),
    sectorStrengthFactor: pickFinite(factors, 'sector_strength_factor', 'sectorStrengthFactor'),
    factorFreshnessDays: factorFreshness,

    peRatio: pickFinite(fundamentals, 'pe_ratio', 'peRatio'),
    pbRatio: pickFinite(fundamentals, 'pb_ratio', 'pbRatio'),
    eps: pickFinite(fundamentals, 'eps'),
    dividendYield: pickFinite(fundamentals, 'dividend_yield', 'dividendYield'),
    beta: pickFinite(fundamentals, 'beta'),
    marketCap: pickFinite(fundamentals, 'market_cap', 'marketCap'),
    freeFloat: pickFinite(fundamentals, 'free_float', 'freeFloat'),
    fcfYield: pickFinite(fundamentals, 'fcf_yield', 'fcfYield'),
    evEbitda: pickFinite(fundamentals, 'ev_ebitda', 'evEbitda'),
    roa: pickFinite(fundamentals, 'roa'),
    roe: pickFinite(fundamentals, 'roe'),
    roic: pickFinite(fundamentals, 'roic'),
    debtToEquity: pickFinite(fundamentals, 'debt_to_equity', 'debtToEquity'),
    currentRatio: pickFinite(fundamentals, 'current_ratio', 'currentRatio'),
    revenueGrowth: pickFinite(fundamentals, 'revenue_growth', 'revenueGrowth'),
    profitGrowth: pickFinite(fundamentals, 'profit_growth', 'profitGrowth', 'earnings_growth', 'earningsGrowth'),
    epsGrowth: pickFinite(fundamentals, 'eps_growth', 'epsGrowth'),
    fcfGrowth: pickFinite(fundamentals, 'fcf_growth', 'fcfGrowth'),
    grossMargin: pickFinite(fundamentals, 'gross_margin', 'grossMargin'),
    operatingMargin: pickFinite(fundamentals, 'operating_margin', 'operatingMargin'),
    netMargin: pickFinite(fundamentals, 'net_margin', 'netMargin'),
    revenue: pickFinite(fundamentals, 'revenue'),
    operatingProfit: pickFinite(fundamentals, 'operating_profit', 'operatingProfit'),
    netProfit: pickFinite(fundamentals, 'net_profit', 'netProfit'),
    totalAssets: pickFinite(fundamentals, 'total_assets', 'totalAssets'),
    totalDebt: pickFinite(fundamentals, 'total_debt', 'totalDebt'),
    equity: pickFinite(fundamentals, 'equity'),
    cashFlowFromOperations: pickFinite(fundamentals, 'cash_flow_from_operations', 'cashFlowFromOperations'),
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
