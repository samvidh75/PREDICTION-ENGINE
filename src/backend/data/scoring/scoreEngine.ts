import type { AnalyticalInputLineage, Availability } from "../lineage/types";
import type { FundamentalSnapshot, MarketPriceRecord } from "../providers/types";
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
  classification: string | null;
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

function scoreQuality(symbol: string, f: FundamentalSnapshot | null): FactorScore {
  if (!f) return unavailable(symbol, "quality_score", "financial_snapshots", "fundamentals unavailable");
  const parts = [
    f.roe == null ? null : normalize(f.roe, 0, 30),
    f.operatingMargin == null ? null : normalize(f.operatingMargin, 0, 35),
    f.netMargin == null ? null : normalize(f.netMargin, 0, 25),
    f.totalDebt != null && f.equity != null && f.equity > 0 ? normalize(f.totalDebt / f.equity, 2, 0, true) : f.debtToEquityScore,
  ].filter((v): v is number => v != null && Number.isFinite(v));
  return fromParts(symbol, "quality_score", f, parts, "roe, margins, debt burden");
}

declare module "../providers/types" {
  interface FundamentalSnapshot {
    debtToEquityScore?: number | null;
  }
}

function scoreGrowth(symbol: string, f: FundamentalSnapshot | null): FactorScore {
  if (!f) return unavailable(symbol, "growth_score", "financial_snapshots", "growth inputs unavailable");
  const parts = [
    f.revenueGrowth == null ? null : normalize(f.revenueGrowth, -20, 30),
    f.earningsGrowth == null ? null : normalize(f.earningsGrowth, -30, 40),
  ].filter((v): v is number => v != null && Number.isFinite(v));
  return fromParts(symbol, "growth_score", f, parts, "historical growth unavailable");
}

function scoreValue(symbol: string, f: FundamentalSnapshot | null): FactorScore {
  if (!f) return unavailable(symbol, "value_score", "financial_snapshots", "valuation inputs unavailable");
  const parts = [
    f.peRatio == null || f.peRatio <= 0 ? null : normalize(f.peRatio, 45, 5, true),
    f.pbRatio == null || f.pbRatio <= 0 ? null : normalize(f.pbRatio, 10, 1, true),
  ].filter((v): v is number => v != null && Number.isFinite(v));
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
  const ret = ((last - prior) / prior) * 100;
  const value = Math.round(normalize(ret, -15, 15));
  return { value, availability: "real", confidence: 90, lineage: priceLineage(symbol, "momentum_score", validPrices, "real") };
}

function scoreRisk(symbol: string, validPrices: MarketPriceRecord[]): FactorScore {
  if (validPrices.length < 20) return { value: null, availability: "unavailable", confidence: 0, reason: "insufficient valid price history", lineage: priceLineage(symbol, "risk_score", validPrices, "unavailable", "insufficient valid price history") };
  const returns: number[] = [];
  for (let i = 1; i < validPrices.length; i++) returns.push((validPrices[i].close - validPrices[i - 1].close) / validPrices[i - 1].close);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
  const value = Math.round(normalize(vol, 60, 8, true));
  return { value, availability: "real", confidence: 90, lineage: priceLineage(symbol, "risk_score", validPrices, "real") };
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
  const factors = {
    quality_score: scoreQuality(symbol, input.fundamental),
    growth_score: scoreGrowth(symbol, input.fundamental),
    value_score: scoreValue(symbol, input.fundamental),
    momentum_score: scoreMomentum(symbol, validPrices),
    risk_score: scoreRisk(symbol, validPrices),
    sector_score: sectorValue == null
      ? unavailable(symbol, "sector_score", "master_security_registry", "sector-relative peer data unavailable")
      : { value: Math.round(clamp(sectorValue)), availability: "partial" as const, confidence: 50, lineage: [lineage(symbol, "sector_score", "master_security_registry", "sector", new Date().toISOString().slice(0, 10), "partial")] },
  };
  for (const factor of Object.values(factors)) assertValidFactorScore(factor.value);
  const available = Object.values(factors).filter((f) => f.value != null);
  const essential = [factors.quality_score, factors.momentum_score, factors.risk_score];
  const availability: Availability = essential.every((f) => f.value != null) && available.length >= 4 ? (Object.values(factors).every((f) => f.availability === "real") ? "real" : "partial") : available.length > 0 ? "partial" : "unavailable";
  const rankingScore = available.length === 0 ? null : Math.round(available.reduce((sum, f) => sum + (f.value ?? 0), 0) / available.length);
  assertValidFactorScore(rankingScore);
  const confidenceScore = Math.round(clamp((available.reduce((sum, f) => sum + f.confidence, 0) / Math.max(1, Object.keys(factors).length)) * (availability === "real" ? 1 : availability === "partial" ? 0.7 : 0)));
  const classification = rankingScore == null || availability === "unavailable" ? null : rankingScore >= 75 ? "Healthy" : rankingScore >= 50 ? "Watch" : "At Risk";
  const lineageEntries = Object.values(factors).flatMap((f) => f.lineage);
  return { symbol, horizon: input.horizon ?? 30, rankingScore, classification, confidenceScore, availability, factors, lineage: lineageEntries, generatedAt: new Date().toISOString(), modelVersion: "f1-data-quality-v1" };
}

