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

export function adaptPredictionFactoryData(
  symbol: string,
  horizon: number,
  tradeDate: string,
  financials: Record<string, unknown>,
  features: Record<string, unknown>,
  factors: Record<string, unknown>,
  sector: string | null,
  sectorStrengthFactor: number | null,
  closePrices: number[],
  tradeDates: string[],
): UnifiedPredictionInput {
  const mappedHorizon = mapHorizon(horizon);
  const priceFreshness = daysBetween(tradeDate);
  const latestClose = closePrices.length > 0
    ? finiteOrNull(closePrices[closePrices.length - 1])
    : null;

  const fundamentalAsOf: string | null =
    (String(financials.period_end ?? financials.snapshot_date ?? '') || null);
  const fundamentalFreshness = fundamentalAsOf ? daysBetween(fundamentalAsOf) : null;
  const featureFreshness = daysBetween(String(features.trade_date ?? ''));
  const factorFreshness = daysBetween(String(factors.trade_date ?? ''));

  return {
    symbol,
    exchange: null,
    sector,
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

    rsi: pickFinite(features, 'rsi'),
    macd: pickFinite(features, 'macd'),
    macdSignal: pickFinite(features, 'macd_signal', 'macdSignal'),
    macdHistogram: pickFinite(features, 'macd_histogram', 'macdHistogram'),
    adx: pickFinite(features, 'adx'),
    atr: pickFinite(features, 'atr'),
    bollingerWidth: pickFinite(features, 'bollinger_width', 'bollingerWidth'),
    relativeStrength: pickFinite(features, 'relative_strength', 'relativeStrength'),
    movingAverageDistance: pickFinite(features, 'moving_average_distance', 'movingAverageDistance'),
    trendStrength: pickFinite(features, 'trend_strength', 'trendStrength'),
    featureFreshnessDays: featureFreshness,

    qualityFactor: pickFinite(factors, 'quality_factor', 'qualityFactor'),
    valueFactor: pickFinite(factors, 'value_factor', 'valueFactor'),
    growthFactor: pickFinite(factors, 'growth_factor', 'growthFactor'),
    momentumFactor: pickFinite(factors, 'momentum_factor', 'momentumFactor'),
    riskFactor: pickFinite(factors, 'risk_factor', 'riskFactor'),
    sectorStrengthFactor: sectorStrengthFactor != null ? finiteOrNull(sectorStrengthFactor) : pickFinite(factors, 'sector_strength_factor', 'sectorStrengthFactor'),
    factorFreshnessDays: factorFreshness,

    peRatio: pickFinite(financials, 'pe_ratio', 'peRatio'),
    pbRatio: pickFinite(financials, 'pb_ratio', 'pbRatio'),
    eps: pickFinite(financials, 'eps'),
    dividendYield: pickFinite(financials, 'dividend_yield', 'dividendYield'),
    beta: pickFinite(financials, 'beta'),
    marketCap: pickFinite(financials, 'market_cap', 'marketCap'),
    freeFloat: pickFinite(financials, 'free_float', 'freeFloat'),
    fcfYield: pickFinite(financials, 'fcf_yield', 'fcfYield'),
    evEbitda: pickFinite(financials, 'ev_ebitda', 'evEbitda'),
    roa: pickFinite(financials, 'roa'),
    roe: pickFinite(financials, 'roe'),
    roic: pickFinite(financials, 'roic'),
    debtToEquity: pickFinite(financials, 'debt_to_equity', 'debtToEquity'),
    currentRatio: pickFinite(financials, 'current_ratio', 'currentRatio'),
    revenueGrowth: pickFinite(financials, 'revenue_growth', 'revenueGrowth'),
    profitGrowth: pickFinite(financials, 'profit_growth', 'profitGrowth', 'earnings_growth', 'earningsGrowth'),
    epsGrowth: pickFinite(financials, 'eps_growth', 'epsGrowth'),
    fcfGrowth: pickFinite(financials, 'fcf_growth', 'fcfGrowth'),
    grossMargin: pickFinite(financials, 'gross_margin', 'grossMargin'),
    operatingMargin: pickFinite(financials, 'operating_margin', 'operatingMargin'),
    netMargin: pickFinite(financials, 'net_margin', 'netMargin'),
    revenue: pickFinite(financials, 'revenue'),
    operatingProfit: pickFinite(financials, 'operating_profit', 'operatingProfit'),
    netProfit: pickFinite(financials, 'net_profit', 'netProfit'),
    totalAssets: pickFinite(financials, 'total_assets', 'totalAssets'),
    totalDebt: pickFinite(financials, 'total_debt', 'totalDebt'),
    equity: pickFinite(financials, 'equity'),
    cashFlowFromOperations: pickFinite(financials, 'cash_flow_from_operations', 'cashFlowFromOperations'),
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
