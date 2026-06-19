// Canonical input mapping for Prediction Engine across all product routes

export interface CompanyDetailInput {
  symbol: string;
  pe?: number | null;
  pb?: number | null;
  evEbitda?: number | null;
  dividendYield?: number | null;
  roe?: number | null;
  roic?: number | null;
  roa?: number | null;
  operatingMargin?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
  debtEquity?: number | null;
  marketCap?: number | null;
  eps?: number | null;
  currentRatio?: number | null;
  volatility?: number | null;
  momentum?: number | null;
  rsi?: number | null;
  macd?: number | null;
  factorScores?: Record<string, number> | null;
}

export interface ScannerRowInput {
  symbol: string;
  score?: number | null;
  rank?: number | null;
  conviction?: string | null;
}

export interface RankingsRowInput {
  symbol: string;
  score?: number | null;
  rank?: number | null;
  companyName?: string | null;
  sector?: string | null;
}

export interface CompareCompanyInput {
  symbol: string;
  companyName?: string | null;
  score?: number | null;
}

export interface WatchlistCompanyInput {
  symbol: string;
  companyName?: string | null;
  score?: number | null;
}

import { normalizeNumericValue } from "./factorNormalization";

export function normalizeCompanyDetail(input: Partial<CompanyDetailInput>): CompanyDetailInput {
  return {
    symbol: input.symbol || "",
    pe: normalizeNumericValue(input.pe),
    pb: normalizeNumericValue(input.pb),
    evEbitda: normalizeNumericValue(input.evEbitda),
    dividendYield: normalizeNumericValue(input.dividendYield),
    roe: normalizeNumericValue(input.roe),
    roic: normalizeNumericValue(input.roic),
    roa: normalizeNumericValue(input.roa),
    operatingMargin: normalizeNumericValue(input.operatingMargin),
    revenueGrowth: normalizeNumericValue(input.revenueGrowth),
    profitGrowth: normalizeNumericValue(input.profitGrowth),
    debtEquity: normalizeNumericValue(input.debtEquity),
    marketCap: normalizeNumericValue(input.marketCap),
    eps: normalizeNumericValue(input.eps),
    currentRatio: normalizeNumericValue(input.currentRatio),
    volatility: normalizeNumericValue(input.volatility),
    momentum: normalizeNumericValue(input.momentum),
    rsi: normalizeNumericValue(input.rsi),
    macd: normalizeNumericValue(input.macd),
    factorScores: input.factorScores || null,
  };
}

export function normalizeScannerRow(input: Partial<ScannerRowInput>): ScannerRowInput {
  return {
    symbol: input.symbol || "",
    score: normalizeNumericValue(input.score),
    rank: normalizeNumericValue(input.rank),
    conviction: input.conviction || null,
  };
}

export function normalizeRankingsRow(input: Partial<RankingsRowInput>): RankingsRowInput {
  return {
    symbol: input.symbol || "",
    score: normalizeNumericValue(input.score),
    rank: normalizeNumericValue(input.rank),
    companyName: input.companyName || null,
    sector: input.sector || null,
  };
}

export function normalizeCompareCompany(input: Partial<CompareCompanyInput>): CompareCompanyInput {
  return {
    symbol: input.symbol || "",
    companyName: input.companyName || null,
    score: normalizeNumericValue(input.score),
  };
}

export function normalizeWatchlistCompany(input: Partial<WatchlistCompanyInput>): WatchlistCompanyInput {
  return {
    symbol: input.symbol || "",
    companyName: input.companyName || null,
    score: normalizeNumericValue(input.score),
  };
}
