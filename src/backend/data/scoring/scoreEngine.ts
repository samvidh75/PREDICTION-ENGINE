/**
 * @deprecated Use PredictionFactory (src/predictions/PredictionFactory.ts) instead.
 *
 * This scoring engine (Pipeline B) produces PredictionSnapshot records and writes
 * to prediction_registry with created_by = 'ManualSnapshot'. It is retained only
 * for manual/exploratory use.
 *
 * Pipeline A (PredictionFactory → StockStoryEngine → PredictionRegistryContract)
 * is the canonical daily scoring path used by the scheduler and CI pipeline.
 * Migration: replace `scoreSnapshot(...)` calls with `predictionFactory.generateDaily()`.
 *
 * This module will be removed in a future track.
 */
import type { AnalyticalInputLineage, Availability } from "../lineage/types";
import type { FundamentalSnapshot, MarketPriceRecord } from "../providers/types";
import type { UnifiedPredictionOutput, UnifiedClassification } from "../../../prediction-engine/types";
import { assertValidFactorScore, validateMarketPriceRecords } from "../validation/priceValidation";

export type FactorScore = {
  value: number | null;
  availability: Availability;
  confidence: number;
  reason?: string;
  lineage: AnalyticalInputLineage[];
};

export type PredictionSnapshot = {
  symbol: string;
  horizon: 7 | 30 | 90 | 180 | 365;
  rankingScore: number | null;
  classification: "Exceptional" | "Excellent" | "Good" | "Fair" | "Weak" | "Critical" | null;
  confidenceScore: number;
  availability: Availability;
  factors: Record<"quality_score" | "growth_score" | "value_score" | "momentum_score" | "risk_score" | "sector_score", FactorScore>;
  lineage: AnalyticalInputLineage[];
  generatedAt: string;
  modelVersion: string;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function normalize(value: number, low: number, high: number, inverted = false): number {
  const score = ((value - low) / (high - low)) * 100;
  return clamp(inverted ? 100 - score : score);
}

function daysBetween(asOf: string, now = new Date()): number {
  const then = new Date(`${asOf.slice(0, 10)}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(then)) return 9999;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

function lineage(symbol: string, metric: string, sourceTable: string, sourceField: string, asOf: string, availability: Availability, source = "existing-database", rejectionReason?: string): AnalyticalInputLineage {
  return {
    symbol,
    metric,
    source,
    sourceTable,
    sourceField,
    asOf,
    retrievedAt: new Date().toISOString(),
    freshnessDays: daysBetween(asOf),
    isFallback: false,
    isSynthetic: false,
    availability,
    rejectionReason,
  };
}

function unavailable(symbol: string, metric: string, table: string, reason: string): FactorScore {
  return { value: null, availability: "unavailable", confidence: 0, reason, lineage: [lineage(symbol, metric, table, "*", new Date().toISOString().slice(0, 10), "unavailable", "existing-database", reason)] };
}

function fromParts(symbol: string, metric: string, f: FundamentalSnapshot, parts: number[], reason: string): FactorScore {
  if (parts.length === 0) return unavailable(symbol, metric, "financial_snapshots", reason);
  const value = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  return {
    value,
    availability: parts.length >= 3 ? "real" : "partial",
    confidence: Math.min(95, Math.round(f.completenessScore * (parts.length >= 3 ? 1 : 0.65))),
    reason: parts.length >= 3 ? undefined : reason,
    lineage: [lineage(symbol, metric, "financial_snapshots", metric, f.asOfDate, parts.length >= 3 ? "real" : "partial", f.source)],
  };
}

function scoreQuality(symbol: string, f: FundamentalSnapshot | null): FactorScore {
  if (!f) return unavailable(symbol, "quality_score", "financial_snapshots", "fundamentals unavailable");
  const parts = [
    f.roe == null ? null : normalize(f.roe, 0, 30),
    f.roa == null ? null : normalize(f.roa, 0, 15),
    f.operatingMargin == null ? null : normalize(f.operatingMargin, 0, 35),
    f.netMargin == null ? null : normalize(f.netMargin, 0, 25),
    f.debtToEquity == null || f.debtToEquity < 0 ? null : normalize(f.debtToEquity, 0, 2, true),
  ].filter((value): value is number => value != null && Number.isFinite(value));
  return fromParts(symbol, "quality_score", f, parts, "quality inputs incomplete");
}

function scoreGrowth(symbol: string, f: FundamentalSnapshot | null): FactorScore {
  if (!f) return unavailable(symbol, "growth_score", "financial_snapshots", "growth inputs unavailable");
  const parts = [
    f.revenueGrowth == null ? null : normalize(f.revenueGrowth, -20, 30),
    f.earningsGrowth == null ? null : normalize(f.earningsGrowth, -30, 40),
  ].filter((value): value is number => value != null && Number.isFinite(value));
  return fromParts(symbol, "growth_score", f, parts, "historical growth unavailable");
}

function scoreValue(symbol: string, f: FundamentalSnapshot | null): FactorScore {
  if (!f) return unavailable(symbol, "value_score", "financial_snapshots", "valuation inputs unavailable");
  const parts = [
    f.peRatio == null || f.peRatio <= 0 ? null : normalize(f.peRatio, 5, 45, true),
    f.pbRatio == null || f.pbRatio <= 0 ? null : normalize(f.pbRatio, 1, 10, true),
  ].filter((value): value is number => value != null && Number.isFinite(value));
  return fromParts(symbol, "value_score", f, parts, "valuation inputs unavailable");
}

function priceLineage(symbol: string, metric: string, prices: MarketPriceRecord[], availability: Availability, reason?: string): AnalyticalInputLineage[] {
  if (prices.length === 0) return [lineage(symbol, metric, "daily_prices", "open, high, low, close, volume", new Date().toISOString().slice(0, 10), availability, "existing-database", reason)];
  return [lineage(symbol, metric, "daily_prices", "close", prices[prices.length - 1].tradingDate, availability, prices[prices.length - 1].source, reason)];
}

function scoreMomentum(symbol: string, validPrices: MarketPriceRecord[]): FactorScore {
  if (validPrices.length < 20) return { value: null, availability: "unavailable", confidence: 0, reason: "insufficient valid price history", lineage: priceLineage(symbol, "momentum_score", validPrices, "unavailable", "insufficient valid price history") };
  const last = validPrices[validPrices.length - 1].close;
  const prior = validPrices[Math.max(0, validPrices.length - 21)].close;
  const value = Math.round(normalize(((last - prior) / prior) * 100, -15, 15));
  return { value, availability: "real", confidence: 90, lineage: priceLineage(symbol, "momentum_score", validPrices, "real") };
}

function scoreRisk(symbol: string, validPrices: MarketPriceRecord[]): FactorScore {
  if (validPrices.length < 20) return { value: null, availability: "unavailable", confidence: 0, reason: "insufficient valid price history", lineage: priceLineage(symbol, "risk_score", validPrices, "unavailable", "insufficient valid price history") };
  const returns: number[] = [];
  for (let i = 1; i < validPrices.length; i++) returns.push((validPrices[i].close - validPrices[i - 1].close) / validPrices[i - 1].close);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, current) => sum + (current - mean) ** 2, 0) / returns.length;
  const annualizedVolatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
  const value = Math.round(normalize(annualizedVolatility, 8, 60, true));
  return { value, availability: "real", confidence: 90, lineage: priceLineage(symbol, "risk_score", validPrices, "real") };
}

function classify(score: number): PredictionSnapshot["classification"] {
  if (score >= 85) return "Exceptional";
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 45) return "Fair";
  if (score >= 30) return "Weak";
  return "Critical";
}

function convertUnifiedOutputToPredictionSnapshot(output: UnifiedPredictionOutput): PredictionSnapshot {
  const unifiedToSnapshotClassification: Record<UnifiedClassification, PredictionSnapshot['classification']> = {
    EXCELLENT: 'Excellent',
    HEALTHY: 'Good',
    STABLE: 'Fair',
    WEAKENING: 'Weak',
    AT_RISK: 'Critical',
    INSUFFICIENT_DATA: null,
  };

  const factorGroupToKey: Record<string, keyof PredictionSnapshot['factors']> = {
    quality: 'quality_score',
    growth: 'growth_score',
    value: 'value_score',
    momentum: 'momentum_score',
    risk: 'risk_score',
    sector: 'sector_score',
  };

  const factors: PredictionSnapshot['factors'] = {
    quality_score: { value: null, availability: 'unavailable', confidence: 0, lineage: [] },
    growth_score: { value: null, availability: 'unavailable', confidence: 0, lineage: [] },
    value_score: { value: null, availability: 'unavailable', confidence: 0, lineage: [] },
    momentum_score: { value: null, availability: 'unavailable', confidence: 0, lineage: [] },
    risk_score: { value: null, availability: 'unavailable', confidence: 0, lineage: [] },
    sector_score: { value: null, availability: 'unavailable', confidence: 0, lineage: [] },
  };

  const allLineage: AnalyticalInputLineage[] = [];

  for (const fs of output.factorScores) {
    const key = factorGroupToKey[fs.group];
    if (key) {
      factors[key] = {
        value: fs.value,
        availability: fs.availability >= 50 ? 'real' : fs.availability > 0 ? 'partial' : 'unavailable' as Availability,
        confidence: fs.confidence,
        reason: fs.reason,
        lineage: [],
      };
    }
  }

  const available = Object.values(factors).filter(f => f.value != null);
  const essential = [factors.quality_score, factors.momentum_score, factors.risk_score];
  const availability: Availability = essential.every(f => f.value != null) && available.length === 6
    ? (Object.values(factors).every(f => f.availability === 'real') ? 'real' : 'partial')
    : available.length > 0 ? 'partial' : 'unavailable';

  return {
    symbol: output.symbol,
    horizon: output.horizon as 7 | 30 | 90 | 180 | 365,
    rankingScore: output.rankingScore,
    classification: unifiedToSnapshotClassification[output.classification],
    confidenceScore: output.confidenceScore,
    availability,
    factors,
    lineage: allLineage,
    generatedAt: output.generatedAt,
    modelVersion: output.modelVersion,
  };
}

export function scoreSnapshot(input: {
  symbol: string;
  horizon?: 7 | 30 | 90 | 180 | 365;
  prices: MarketPriceRecord[];
  fundamental: FundamentalSnapshot | null;
  sectorScore?: number | null;
}): PredictionSnapshot {
  const symbol = input.symbol.toUpperCase();
  const validPrices = validateMarketPriceRecords(input.prices).accepted.sort((a, b) => a.tradingDate.localeCompare(b.tradingDate));
  const sectorValue = input.sectorScore ?? null;

  // F5: If unified engine is active, delegate
  const unifiedEngineEnabled = process.env.UNIFIED_PREDICTION_ENGINE_ENABLED === 'true';
  const featuredFlagDelegation = process.env.F5_SCORE_SNAPSHOT_DELEGATE === 'true';

  if (unifiedEngineEnabled && featuredFlagDelegation) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UnifiedPredictionEngine } = require('../../../prediction-engine/UnifiedPredictionEngine');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { adaptScoreSnapshotParams } = require('../../../prediction-engine/adapters/ScoreSnapshotAdapter');
    const engine = new UnifiedPredictionEngine();
    const closePrices = validPrices.map(p => p.close);
    const tradeDates = validPrices.map(p => p.tradingDate);
    const unifiedInput = adaptScoreSnapshotParams(symbol, input.horizon ?? 30, closePrices, tradeDates, (input.fundamental ?? {}) as Record<string, unknown>, sectorValue);
    const output = engine.evaluate(unifiedInput);
    return convertUnifiedOutputToPredictionSnapshot(output);
  }

  const factors = {
    quality_score: scoreQuality(symbol, input.fundamental),
    growth_score: scoreGrowth(symbol, input.fundamental),
    value_score: scoreValue(symbol, input.fundamental),
    momentum_score: scoreMomentum(symbol, validPrices),
    risk_score: scoreRisk(symbol, validPrices),
    sector_score: sectorValue == null
      ? unavailable(symbol, "sector_score", "master_security_registry", "sector-relative peer data unavailable")
      : { value: Math.round(clamp(sectorValue)), availability: "real" as const, confidence: 75, lineage: [lineage(symbol, "sector_score", "master_security_registry", "sector-relative peer score", new Date().toISOString().slice(0, 10), "real")] },
  };
  for (const factor of Object.values(factors)) assertValidFactorScore(factor.value);
  const available = Object.values(factors).filter((factor) => factor.value != null);
  const essential = [factors.quality_score, factors.momentum_score, factors.risk_score];
  const availability: Availability = essential.every((factor) => factor.value != null) && available.length === 6
    ? (Object.values(factors).every((factor) => factor.availability === "real") ? "real" : "partial")
    : available.length > 0 ? "partial" : "unavailable";
  const rankingScore = available.length === 0 ? null : Math.round(available.reduce((sum, factor) => sum + (factor.value ?? 0), 0) / available.length);
  assertValidFactorScore(rankingScore);
  const confidenceScore = Math.round(clamp((available.reduce((sum, factor) => sum + factor.confidence, 0) / 6) * (availability === "real" ? 1 : availability === "partial" ? 0.7 : 0)));
  const classification = rankingScore == null || availability === "unavailable" ? null : classify(rankingScore);
  return { symbol, horizon: input.horizon ?? 30, rankingScore, classification, confidenceScore, availability, factors, lineage: Object.values(factors).flatMap((factor) => factor.lineage), generatedAt: new Date().toISOString(), modelVersion: "f1-data-quality-v2" };
}
