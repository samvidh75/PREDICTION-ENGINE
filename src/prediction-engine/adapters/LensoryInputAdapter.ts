import { UnifiedPredictionInput, UnifiedHorizon } from '../types';
import { EngineInputs } from '../../stockstory/types';

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

export function adaptLensoryInputs(
  symbol: string,
  horizon: number,
  inputs: EngineInputs,
): UnifiedPredictionInput {
  const mappedHorizon = mapHorizon(horizon);
  const tradeDate = inputs.tradeDate;
  const priceFreshness = daysBetween(tradeDate);

  const prices = inputs.historical?.priceHistory ?? [];
  const closePrices = prices.map(p => finiteOrNull(p.close)).filter((v): v is number => v !== null);
  const tradeDates = prices.map(p => p.tradeDate);

  let latestClose: number | null = null;
  const latestOpen: number | null = null;
  const latestHigh: number | null = null;
  const latestLow: number | null = null;
  const latestVolume: number | null = null;
  if (prices.length > 0) {
    const last = prices[prices.length - 1];
    latestClose = finiteOrNull(last.close);
  }

  return {
    symbol,
    exchange: null,
    sector: inputs.sector?.name ?? null,
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

    rsi: finiteOrNull(inputs.features.rsi),
    macd: finiteOrNull(inputs.features.macd),
    macdSignal: finiteOrNull(inputs.features.macdSignal),
    macdHistogram: finiteOrNull(inputs.features.macdHistogram),
    adx: finiteOrNull(inputs.features.adx),
    atr: finiteOrNull(inputs.features.atr),
    bollingerWidth: finiteOrNull(inputs.features.bollingerWidth),
    relativeStrength: finiteOrNull(inputs.features.relativeStrength),
    movingAverageDistance: finiteOrNull(inputs.features.movingAverageDistance),
    trendStrength: finiteOrNull(inputs.features.trendStrength),
    featureFreshnessDays: priceFreshness,

    qualityFactor: finiteOrNull(inputs.factors.qualityFactor),
    valueFactor: finiteOrNull(inputs.factors.valueFactor),
    growthFactor: finiteOrNull(inputs.factors.growthFactor),
    momentumFactor: finiteOrNull(inputs.factors.momentumFactor),
    riskFactor: finiteOrNull(inputs.factors.riskFactor),
    sectorStrengthFactor: finiteOrNull(inputs.factors.sectorStrengthFactor),
    factorFreshnessDays: priceFreshness,

    peRatio: finiteOrNull(inputs.financials.peRatio),
    pbRatio: finiteOrNull(inputs.financials.pbRatio),
    eps: finiteOrNull(inputs.financials.eps),
    dividendYield: finiteOrNull(inputs.financials.dividendYield),
    beta: finiteOrNull(inputs.financials.beta),
    marketCap: finiteOrNull(inputs.financials.marketCap),
    freeFloat: finiteOrNull(inputs.financials.freeFloat),
    fcfYield: finiteOrNull(inputs.financials.fcfYield),
    evEbitda: finiteOrNull(inputs.financials.evEbitda),
    roa: finiteOrNull(inputs.financials.roa),
    roe: finiteOrNull(inputs.financials.roe),
    roic: finiteOrNull(inputs.financials.roic),
    debtToEquity: finiteOrNull(inputs.financials.debtToEquity),
    currentRatio: finiteOrNull(inputs.financials.currentRatio),
    revenueGrowth: finiteOrNull(inputs.financials.revenueGrowth),
    profitGrowth: finiteOrNull(inputs.financials.profitGrowth),
    epsGrowth: finiteOrNull(inputs.financials.epsGrowth),
    fcfGrowth: finiteOrNull(inputs.financials.fcfGrowth),
    grossMargin: finiteOrNull(inputs.financials.grossMargin),
    operatingMargin: finiteOrNull(inputs.financials.operatingMargin),
    netMargin: null,
    revenue: null,
    operatingProfit: null,
    netProfit: null,
    totalAssets: null,
    totalDebt: null,
    equity: null,
    cashFlowFromOperations: null,
    fundamentalFreshnessDays: priceFreshness,

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
