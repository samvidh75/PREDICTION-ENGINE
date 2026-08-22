/**
 * Real factor scores for a stock, computed from its actual fundamentals.
 *
 * stockHandler previously returned `quality: 50, valuation: 50, growth: 50,
 * momentum: 50, risk: 50, riskAdjusted: 50` — literal constants, identical for
 * every one of the 282 listed companies. Any UI reading them (the design's
 * "StockEX Score 88/100 Excellent" panel, the screener's factor columns) was
 * therefore ranking every stock the same while presenting it as research.
 *
 * Nothing here invents a formula. The scoring already existed, tested, in
 * src/research/features/* and src/research/engine/researchEngine.ts; it was
 * simply never connected to the API. This module adapts the handler's
 * fundamentals into the shape those functions expect and runs them.
 *
 * Honesty rules preserved from the underlying engines:
 *   - a factor with insufficient inputs is `null`, never a default number
 *   - the composite needs MINIMUM_INPUTS_FOR_SCORE factors before it reports
 *     anything, so a stock with thin data has no score rather than a bad one
 *   - `confidence` reflects how much real data backed the result
 */
import { computeQualityFeatures } from "../research/features/qualityFeatures";
import { computeValuationFeatures } from "../research/features/valuationFeatures";
import { computeGrowthFeatures } from "../research/features/growthFeatures";
import { computeRiskFeatures } from "../research/features/riskFeatures";
import { computeMomentumFeatures } from "../research/features/momentumFeatures";
import { computeResearchConviction } from "../research/engine/researchEngine";
import type { NormalizedCandle, NormalizedFundamentals } from "../research/normalization/types";
import type { HistoricalPoint } from "../services/data/types";

/** The subset of handler-local values the scorers need. */
export interface ScoringInputs {
  symbol: string;
  pe: number | null;
  pb: number | null;
  eps: number | null;
  dividendYield: number | null;
  roe: number | null;
  debtToEquity: number | null;
  netMargin: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  /**
   * Latest reported net profit. Only pass a REAL reported figure — the risk
   * engine reads it as a profitable/loss-making signal, so a derived
   * revenue×margin estimate would manufacture an earnings-quality verdict.
   */
  netProfit: number | null;
  /** Published beta. Enables riskFeatures' volatility sub-score. */
  beta: number | null;
  priceHistory: HistoricalPoint[] | null;
}

export interface StockScores {
  quality: number | null;
  valuation: number | null;
  growth: number | null;
  momentum: number | null;
  risk: number | null;
  health: number | null;
  riskAdjusted: number | null;
  /** The engine's own verdict word for the composite, or the pending label. */
  label: string;
  /** 0-100: how much of the scoring surface was backed by real inputs. */
  confidence: number;
  /** Named inputs that were unavailable, for display and debugging. */
  missingInputs: string[];
}

function toNormalizedFundamentals(input: ScoringInputs): NormalizedFundamentals {
  // Fields the handler cannot supply stay null so the engines treat them as
  // missing rather than as a real zero.
  return {
    symbol: input.symbol,
    peRatio: input.pe,
    pbRatio: input.pb,
    evEbitda: null,
    dividendYield: input.dividendYield,
    eps: input.eps,
    bookValue: null,
    roe: input.roe,
    roa: null,
    roic: null,
    debtToEquity: input.debtToEquity,
    currentRatio: null,
    grossMargin: null,
    operatingMargin: input.operatingMargin,
    netMargin: input.netMargin,
    revenueGrowth: input.revenueGrowth,
    profitGrowth: input.profitGrowth,
    epsGrowth: null,
    sales: null,
    netProfit: input.netProfit,
    operatingProfit: null,
    totalAssets: null,
    totalDebt: null,
    equity: null,
    cashFlow: null,
  } as NormalizedFundamentals;
}

function toCandles(history: HistoricalPoint[] | null): NormalizedCandle[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((p) => p && typeof p.close === "number" && Number.isFinite(p.close))
    .map((p) => ({
      date: p.date,
      close: p.close,
      high: Number.isFinite(p.high) ? p.high : null,
      low: Number.isFinite(p.low) ? p.low : null,
      open: Number.isFinite(p.open) ? p.open : null,
      volume: Number.isFinite(p.volume) ? p.volume : null,
    }));
}

/** Compute real factor scores. Any factor lacking inputs comes back null. */
export function computeStockScores(input: ScoringInputs): StockScores {
  const fundamentals = toNormalizedFundamentals(input);
  const candles = toCandles(input.priceHistory);

  const quality = computeQualityFeatures(fundamentals);
  const valuation = computeValuationFeatures(fundamentals);
  const growth = computeGrowthFeatures(fundamentals);
  const risk = computeRiskFeatures(fundamentals, input.beta);
  // Relative strength needs an index benchmark series we don't have here.
  const momentum = computeMomentumFeatures(candles, null);

  const factorScores: Record<string, number | null> = {
    quality: quality.overallQuality,
    valuation: valuation.overallValuation,
    growth: growth.overallGrowth,
    risk: risk.overallRisk,
    momentum: momentum.overallMomentum,
  };

  const conviction = computeResearchConviction(factorScores);

  const missingInputs = [
    ...quality.missingInputs,
    ...valuation.missingInputs,
    ...growth.missingInputs,
    ...risk.missingInputs,
    ...momentum.missingInputs,
  ];

  // Mean of the per-factor confidences that were actually measurable.
  const confidences = [quality.confidence, valuation.confidence, growth.confidence, risk.confidence]
    .filter((c): c is number => typeof c === "number");
  const confidence = confidences.length
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 0;

  return {
    quality: quality.overallQuality,
    valuation: valuation.overallValuation,
    growth: growth.overallGrowth,
    momentum: momentum.overallMomentum,
    risk: risk.overallRisk,
    // The composite doubles as "health" — the handler's previous `health`
    // value fed the thesis generator, which is why that text never varied.
    health: conviction.overallScore,
    riskAdjusted: conviction.overallScore,
    // researchEngine's own vocabulary ("Very Healthy" … "Research signals
    // pending"), not a grade invented here for display.
    label: conviction.conviction,
    confidence,
    missingInputs: [...new Set(missingInputs)],
  };
}
