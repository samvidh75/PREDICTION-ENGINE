// Single authoritative pipeline that assembles all data for one stock
// from all providers and feeds UnifiedPredictionEngine.
//
// DEPLOYMENT NOTE — required env vars:
//   Vercel (frontend):  VITE_INDIANAPI_KEY (maps to @indianapi-key Vercel secret)
//   Railway (backend):  INDIANAPI_KEY, UPSTOX_ACCESS_TOKEN
// Historical price data is fetched via /api/historical/:symbol (backend proxy)
// to avoid browser CORS blocks on direct Yahoo Finance requests.

import { api } from '../api/client';
import { computeTechnicals, TechnicalSnapshot } from '../marketData/TechnicalIndicators';
import { UnifiedPredictionEngine } from '../../prediction-engine/UnifiedPredictionEngine';
import type { UnifiedPredictionInput, UnifiedPredictionOutput } from '../../prediction-engine/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineResult {
  symbol: string;
  price: {
    current: number | null;
    change: number | null;
    changeAbs: number | null;
    open: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
    weekHigh52: number | null;
    weekLow52: number | null;
    exchange: 'NSE' | 'BSE' | null;
    marketCap: number | null;
    lastTradeTime: string | null;
    source: 'indianapi' | 'yahoo' | null;
  };
  fundamentals: {
    peRatio: number | null;
    pbRatio: number | null;
    eps: number | null;
    dividendYield: number | null;
    roe: number | null;
    roa: number | null;
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
    evEbitda: number | null;
    fcfYield: number | null;
    interestCoverage: number | null;
    beta: number | null;
    bookValue: number | null;
    fundamentalSource: 'screener' | 'indianapi' | 'upstox' | 'partial' | null;
    fundamentalFreshnessDays: number | null;
  };
  technicals: TechnicalSnapshot;
  companyName: string | null;
  sector: string | null;
  sectorStrengthFactor: number | null;
  prediction: UnifiedPredictionOutput | null;
  dataCompleteness: number;
  missingCriticalFields: string[];
  pipelineErrors: string[];
  fetchedAt: string;
}

// ── In-memory cache ───────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60_000;
interface CacheEntry {
  result: PipelineResult;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function fromCache(symbol: string): PipelineResult | null {
  const entry = cache.get(symbol.toUpperCase());
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(symbol.toUpperCase()); return null; }
  return entry.result;
}

function toCache(symbol: string, result: PipelineResult): void {
  cache.set(symbol.toUpperCase(), { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function finiteOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeExchange(ex: string | undefined): 'NSE' | 'BSE' | null {
  if (!ex) return null;
  const u = ex.toUpperCase();
  if (u.includes('NSE') || u.includes('NATIONAL')) return 'NSE';
  if (u.includes('BSE') || u.includes('BOMBAY')) return 'BSE';
  return null;
}

function computeDataCompleteness(r: PipelineResult): number {
  const fields: Array<unknown> = [
    r.price.current, r.price.change, r.price.volume,
    r.fundamentals.peRatio, r.fundamentals.pbRatio, r.fundamentals.eps,
    r.fundamentals.roe, r.fundamentals.roa, r.fundamentals.roic,
    r.fundamentals.debtToEquity, r.fundamentals.currentRatio,
    r.fundamentals.revenueGrowth, r.fundamentals.epsGrowth, r.fundamentals.profitGrowth,
    r.fundamentals.grossMargin, r.fundamentals.operatingMargin, r.fundamentals.netMargin,
    r.fundamentals.evEbitda, r.fundamentals.fcfYield,
    r.technicals.rsi14, r.technicals.macd, r.technicals.adx14,
  ];
  const present = fields.filter(f => f !== null && f !== undefined).length;
  return Math.round((present / fields.length) * 100);
}

function findMissingCritical(r: PipelineResult): string[] {
  const missing: string[] = [];
  if (r.price.current === null) missing.push('livePrice');
  if (r.fundamentals.peRatio === null) missing.push('peRatio');
  if (r.fundamentals.roe === null) missing.push('roe');
  if (r.fundamentals.revenueGrowth === null) missing.push('revenueGrowth');
  if (r.fundamentals.debtToEquity === null) missing.push('debtToEquity');
  return missing;
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

export async function runCompanyDataPipeline(symbol: string): Promise<PipelineResult> {
  const sym = symbol.toUpperCase();

  const cached = fromCache(sym);
  if (cached) return cached;

  const pipelineErrors: string[] = [];
  const fetchedAt = new Date().toISOString();

  // Fetch all data in parallel; historical via backend proxy (/api/historical/:symbol) to avoid CORS
  async function fetchHistorical(): Promise<{ points: Array<{ date: string; close: number; open?: number; high?: number; low?: number; volume?: number }> }> {
    const resp = await fetch(`/api/historical/${encodeURIComponent(sym)}?range=3mo`);
    if (!resp.ok) throw new Error(`Historical proxy ${resp.status}`);
    return resp.json();
  }

  const [quoteSettled, researchSettled, financialsSettled, historicalSettled] = await Promise.allSettled([
    api.getQuote(sym),
    api.getCompanyResearch(sym),
    api.getCompanyFinancials(sym),
    fetchHistorical(),
  ]);

  // ── Price layer ─────────────────────────────────────────────────────────────
  let priceSource: 'indianapi' | 'yahoo' | null = null;
  let priceCurrent: number | null = null;
  let priceChange: number | null = null;
  let priceChangeAbs: number | null = null;
  let priceOpen: number | null = null;
  let priceHigh: number | null = null;
  let priceLow: number | null = null;
  let priceVolume: number | null = null;
  let weekHigh52: number | null = null;
  let weekLow52: number | null = null;
  let exchange: 'NSE' | 'BSE' | null = null;
  let marketCap: number | null = null;
  let lastTradeTime: string | null = null;

  if (quoteSettled.status === 'fulfilled') {
    const q = quoteSettled.value;
    priceCurrent = finiteOrNull(q.price);
    priceChange = finiteOrNull(q.changePercent);
    priceChangeAbs = finiteOrNull(q.change);
    priceVolume = finiteOrNull(q.volume ?? null);
    exchange = normalizeExchange(q.exchange);
    lastTradeTime = q.updatedAt ?? q.retrievedAt ?? null;
    priceSource = 'indianapi';
  } else {
    pipelineErrors.push(`Price fetch failed: ${(quoteSettled as PromiseRejectedResult).reason?.message ?? 'unknown'}`);
  }

  // Enrich price layer from research candles / fundamentals if quote failed or missing fields
  let candles: Array<{ date: string; close: number; high: number | null; low: number | null; volume: number | null }> = [];
  let companyName: string | null = null;
  let sector: string | null = null;
  let researchFundamentals: Record<string, unknown> | null = null;

  // Prefer backend-proxied historical data (no CORS); fall back to research candles
  if (historicalSettled.status === 'fulfilled') {
    candles = (historicalSettled.value.points ?? []).map(p => ({
      date: p.date,
      close: p.close,
      high: finiteOrNull(p.high),
      low: finiteOrNull(p.low),
      volume: finiteOrNull(p.volume),
    }));
  } else {
    pipelineErrors.push(`Historical fetch failed: ${(historicalSettled as PromiseRejectedResult).reason?.message ?? 'unknown'}`);
  }

  if (researchSettled.status === 'fulfilled') {
    const rd = researchSettled.value.data;
    companyName = rd.companyName ?? null;
    sector = rd.sector ?? null;
    // Only use research candles if backend historical unavailable
    if (candles.length === 0) candles = rd.candles ?? [];
    researchFundamentals = rd.fundamentals as Record<string, unknown> | null;

    if (rd.quote) {
      const rq = rd.quote;
      if (priceCurrent === null) {
        priceCurrent = finiteOrNull(rq.lastPrice);
        priceChange = finiteOrNull(rq.changePercent);
        priceChangeAbs = finiteOrNull(rq.change);
        priceSource = 'yahoo';
      }
      if (priceOpen === null) priceOpen = finiteOrNull(rq.open);
      if (priceHigh === null) priceHigh = finiteOrNull(rq.high);
      if (priceLow === null) priceLow = finiteOrNull(rq.low);
      if (priceVolume === null) priceVolume = finiteOrNull(rq.volume);
      if (weekHigh52 === null) weekHigh52 = finiteOrNull(rq.week52High);
      if (weekLow52 === null) weekLow52 = finiteOrNull(rq.week52Low);
      if (marketCap === null) marketCap = finiteOrNull(rq.marketCap);
    }
  } else {
    pipelineErrors.push(`Research fetch failed: ${(researchSettled as PromiseRejectedResult).reason?.message ?? 'unknown'}`);
  }

  // ── Fundamentals layer ──────────────────────────────────────────────────────
  // Priority: VALUATION (PE, PB, EPS, dividend) → from financials API (Provider C)
  //           QUALITY/GROWTH/STABILITY (ROE, D/E, margins, growth) → from research (Provider D via backend)
  //           PRICE fields always come from price layer

  const fin = financialsSettled.status === 'fulfilled' ? financialsSettled.value : null;
  if (financialsSettled.status === 'rejected') {
    pipelineErrors.push(`Financials fetch failed: ${(financialsSettled as PromiseRejectedResult).reason?.message ?? 'unknown'}`);
  }

  const rf = researchFundamentals as Record<string, unknown> | null;

  // Valuation — Provider C (financials) wins, fall through to research (Provider D)
  const peRatio = finiteOrNull(fin?.pe_ratio) ?? finiteOrNull(rf?.peRatio);
  const pbRatio = finiteOrNull(fin?.pb_ratio) ?? finiteOrNull(rf?.pbRatio);
  const eps = finiteOrNull(fin?.earnings_growth) !== null ? finiteOrNull(rf?.eps) : finiteOrNull(rf?.eps);
  const dividendYield = finiteOrNull(rf?.dividendYield);
  const evEbitda = finiteOrNull(fin?.ev_ebitda) ?? finiteOrNull(rf?.evEbitda);
  const beta = finiteOrNull(fin?.beta) ?? finiteOrNull(rf?.beta as any);
  const bookValue = finiteOrNull(rf?.bookValue as any);

  // Quality / Growth / Stability — Provider D (screener via research endpoint)
  const roe = finiteOrNull(fin?.roe) ?? finiteOrNull(rf?.roe);
  const roa = finiteOrNull(fin?.roa) ?? finiteOrNull(rf?.roa);
  const roic = finiteOrNull(fin?.roic) ?? finiteOrNull(rf?.roic);
  const debtToEquity = finiteOrNull(fin?.debt_to_equity) ?? finiteOrNull(rf?.debtToEquity);
  const currentRatio = finiteOrNull(fin?.current_ratio) ?? finiteOrNull(rf?.currentRatio);
  const revenueGrowth = finiteOrNull(fin?.revenue_growth) ?? finiteOrNull(rf?.revenueGrowth);
  const profitGrowth = finiteOrNull(fin?.profit_growth) ?? finiteOrNull(rf?.profitGrowth);
  const epsGrowth = finiteOrNull(fin?.earnings_growth) ?? finiteOrNull(rf?.epsGrowth);
  const grossMargin = finiteOrNull(fin?.market_cap !== null ? (rf?.grossMargin as any) : null) ?? finiteOrNull(rf?.grossMargin as any);
  const operatingMargin = finiteOrNull(fin?.operating_margin) ?? finiteOrNull(rf?.operatingMargin);
  const netMargin = finiteOrNull(fin?.net_margin) ?? finiteOrNull(rf?.netMargin);
  const interestCoverage: number | null = null; // Screener-only, not in current API contract
  const fcfGrowth: number | null = null; // Not currently in API response

  // FCF yield: derive from marketCap if not available directly
  const rawFcfYield = finiteOrNull(fin?.fcf_yield) ?? finiteOrNull(rf?.fcfYield as any);
  const fcfYield = rawFcfYield;

  // Determine fundamental source
  let fundamentalSource: 'screener' | 'indianapi' | 'upstox' | 'partial' | null = null;
  const hasSomeFinancials = peRatio !== null || roe !== null || revenueGrowth !== null;
  if (hasSomeFinancials) {
    const hasScreenerFields = roe !== null || debtToEquity !== null || revenueGrowth !== null;
    const hasValuationFields = peRatio !== null || pbRatio !== null;
    if (hasScreenerFields && hasValuationFields) fundamentalSource = 'partial';
    else if (hasScreenerFields) fundamentalSource = 'screener';
    else if (hasValuationFields) fundamentalSource = 'indianapi';
  }

  // ── Technicals layer ────────────────────────────────────────────────────────
  // Compute from candles (Yahoo 90d historical via research endpoint)
  const closes = candles.map(c => c.close).filter(c => typeof c === 'number' && c > 0);
  const technicals = computeTechnicals(closes);

  // ── Build result ────────────────────────────────────────────────────────────
  const result: PipelineResult = {
    symbol: sym,
    price: {
      current: priceCurrent,
      change: priceChange,
      changeAbs: priceChangeAbs,
      open: priceOpen,
      high: priceHigh,
      low: priceLow,
      volume: priceVolume,
      weekHigh52,
      weekLow52,
      exchange,
      marketCap,
      lastTradeTime,
      source: priceSource,
    },
    fundamentals: {
      peRatio,
      pbRatio,
      eps: finiteOrNull(rf?.eps as any),
      dividendYield,
      roe,
      roa,
      roic,
      debtToEquity,
      currentRatio,
      revenueGrowth,
      profitGrowth,
      epsGrowth,
      fcfGrowth,
      grossMargin,
      operatingMargin,
      netMargin,
      evEbitda,
      fcfYield,
      interestCoverage,
      beta,
      bookValue,
      fundamentalSource,
      fundamentalFreshnessDays: fin?.snapshot_date
        ? Math.round((Date.now() - new Date(fin.snapshot_date).getTime()) / 86_400_000)
        : null,
    },
    technicals,
    companyName,
    sector,
    sectorStrengthFactor: null,
    prediction: null,
    dataCompleteness: 0,
    missingCriticalFields: [],
    pipelineErrors,
    fetchedAt,
  };

  result.dataCompleteness = computeDataCompleteness(result);
  result.missingCriticalFields = findMissingCritical(result);

  // ── Run prediction engine ───────────────────────────────────────────────────
  try {
    const engine = new UnifiedPredictionEngine();
    const input: UnifiedPredictionInput = {
      symbol: sym,
      exchange: result.price.exchange,
      sector: result.sector,
      tradeDate: new Date().toISOString().split('T')[0],
      horizon: 90,

      close: result.price.current,
      open: result.price.open,
      high: result.price.high,
      low: result.price.low,
      volume: result.price.volume,
      closePrices: technicals.closePrices,
      tradeDates: [],
      priceFreshnessDays: null,

      rsi: technicals.rsi14,
      macd: technicals.macd,
      macdSignal: technicals.macdSignal,
      macdHistogram: technicals.macdHistogram,
      adx: technicals.adx14,
      atr: technicals.atr14,
      bollingerWidth: technicals.bollingerWidth,
      relativeStrength: null,
      movingAverageDistance: technicals.movingAverageDistance50,
      trendStrength: null,
      featureFreshnessDays: null,

      qualityFactor: null,
      valueFactor: null,
      growthFactor: null,
      momentumFactor: null,
      riskFactor: null,
      sectorStrengthFactor: null,
      factorFreshnessDays: null,

      peRatio: result.fundamentals.peRatio,
      pbRatio: result.fundamentals.pbRatio,
      eps: result.fundamentals.eps,
      dividendYield: result.fundamentals.dividendYield,
      beta: result.fundamentals.beta,
      marketCap: result.price.marketCap,
      freeFloat: null,
      fcfYield: result.fundamentals.fcfYield,
      evEbitda: result.fundamentals.evEbitda,
      roa: result.fundamentals.roa,
      roe: result.fundamentals.roe,
      roic: result.fundamentals.roic,
      debtToEquity: result.fundamentals.debtToEquity,
      currentRatio: result.fundamentals.currentRatio,
      revenueGrowth: result.fundamentals.revenueGrowth,
      profitGrowth: result.fundamentals.profitGrowth,
      epsGrowth: result.fundamentals.epsGrowth,
      fcfGrowth: null,
      grossMargin: result.fundamentals.grossMargin,
      operatingMargin: result.fundamentals.operatingMargin,
      netMargin: result.fundamentals.netMargin,
      revenue: null,
      operatingProfit: null,
      netProfit: null,
      totalAssets: null,
      totalDebt: null,
      equity: null,
      cashFlowFromOperations: null,
      fundamentalFreshnessDays: result.fundamentals.fundamentalFreshnessDays,

      providerCount: [quoteSettled, researchSettled, financialsSettled, historicalSettled].filter(s => s.status === 'fulfilled').length,
      lineageCount: 1,
      fieldCompleteness: result.dataCompleteness,
      staleFieldCount: result.missingCriticalFields.length,
      partialFactorCount: result.missingCriticalFields.length,
      sourceConfidence: result.dataCompleteness / 100,

      sectorPeers: [],

      freshnessThresholds: {
        priceMaxAgeDays: 1,
        fundamentalMaxAgeDays: 90,
        factorMaxAgeDays: 30,
        featureMaxAgeDays: 30,
      },
    };

    result.prediction = engine.evaluate(input);
  } catch (err: unknown) {
    pipelineErrors.push(`Engine error: ${err instanceof Error ? err.message : String(err)}`);
  }

  toCache(sym, result);
  return result;
}

export function clearPipelineCache(symbol?: string): void {
  if (symbol) {
    cache.delete(symbol.toUpperCase());
  } else {
    cache.clear();
  }
}
