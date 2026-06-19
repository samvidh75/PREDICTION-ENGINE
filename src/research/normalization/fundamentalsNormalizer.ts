import type { NormalizedFundamentals, NormalizationResult } from "./types";
import { safeFinite, normalizeSymbol } from "./numericUtils";

export interface RawFundamentalsInput {
  symbol: string;
  peRatio?: unknown;
  pbRatio?: unknown;
  evEbitda?: unknown;
  dividendYield?: unknown;
  eps?: unknown;
  bookValue?: unknown;
  roe?: unknown;
  roa?: unknown;
  roic?: unknown;
  debtToEquity?: unknown;
  currentRatio?: unknown;
  grossMargin?: unknown;
  operatingMargin?: unknown;
  netMargin?: unknown;
  revenueGrowth?: unknown;
  profitGrowth?: unknown;
  epsGrowth?: unknown;
  sales?: unknown;
  netProfit?: unknown;
  operatingProfit?: unknown;
  totalAssets?: unknown;
  totalDebt?: unknown;
  equity?: unknown;
  cashFlow?: unknown;
  freeCashFlow?: unknown;
  [key: string]: unknown;
}

export function normalizeFundamentals(raw: RawFundamentalsInput): NormalizationResult<NormalizedFundamentals> {
  if (!raw || typeof raw !== "object") {
    return {
      data: null,
      error: "Invalid fundamentals input: expected object",
      normalizedAt: new Date().toISOString(),
      inputValid: false,
    };
  }

  const symbol = normalizeSymbol(raw.symbol?.toString() ?? "");
  if (!symbol) {
    return {
      data: null,
      error: "Invalid fundamentals input: missing symbol",
      normalizedAt: new Date().toISOString(),
      inputValid: false,
    };
  }

  const pe = safeFinite(raw.peRatio);
  const roe = safeFinite(raw.roe);
  const sales = safeFinite(raw.sales);

  return {
    data: {
      symbol,
      peRatio: pe,
      pbRatio: safeFinite(raw.pbRatio),
      evEbitda: safeFinite(raw.evEbitda),
      dividendYield: safeFinite(raw.dividendYield),
      eps: safeFinite(raw.eps),
      bookValue: safeFinite(raw.bookValue),
      roe,
      roa: safeFinite(raw.roa),
      roic: safeFinite(raw.roic),
      debtToEquity: safeFinite(raw.debtToEquity),
      currentRatio: safeFinite(raw.currentRatio),
      grossMargin: safeFinite(raw.grossMargin),
      operatingMargin: safeFinite(raw.operatingMargin),
      netMargin: safeFinite(raw.netMargin),
      revenueGrowth: safeFinite(raw.revenueGrowth),
      profitGrowth: safeFinite(raw.profitGrowth),
      epsGrowth: safeFinite(raw.epsGrowth),
      sales,
      netProfit: safeFinite(raw.netProfit),
      operatingProfit: safeFinite(raw.operatingProfit),
      totalAssets: safeFinite(raw.totalAssets),
      totalDebt: safeFinite(raw.totalDebt),
      equity: safeFinite(raw.equity),
      cashFlow: safeFinite(raw.cashFlow),
      freeCashFlow: safeFinite(raw.freeCashFlow),
      timestamp: new Date().toISOString(),
      sourceSuccess: pe !== null || roe !== null || sales !== null,
    },
    error: null,
    normalizedAt: new Date().toISOString(),
    inputValid: true,
  };
}
