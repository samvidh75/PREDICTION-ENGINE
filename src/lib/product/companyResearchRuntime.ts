import type { ProductDataState } from "./productDataStates";
import { buildProductIdentity, buildProductActionResult, type ProductIdentity, type ProductActionResult } from "./productRuntime";
import { buildPredictionViewModel, type PredictionViewState } from "./predictionEngine/predictionViewModel";
import { buildHealthometerViewModel, type HealthometerViewState } from "./predictionEngine/healthometerViewModel";
import { computeHealthometerFromResearch } from "./predictionEngine/researchScore";

export interface FinancialSnapshotView {
  pe: number | null;
  pb: number | null;
  evEbitda: number | null;
  dividendYield: number | null;
  roe: number | null;
  roic: number | null;
  roa: number | null;
  operatingMargin: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  debtEquity: number | null;
  marketCap: number | null;
  eps: number | null;
  currentRatio: number | null;
}

export interface CompanyResearchResult {
  identity: ProductIdentity;
  prediction: PredictionViewState;
  healthometer: HealthometerViewState;
  actions: ProductActionResult;
  financialSnapshot: FinancialSnapshotView;
  state: ProductDataState;
  message: string;
}

export function buildFinancialSnapshotView(raw: Record<string, unknown> | null | undefined): FinancialSnapshotView {
  if (!raw) {
    return {
      pe: null, pb: null, evEbitda: null, dividendYield: null,
      roe: null, roic: null, roa: null, operatingMargin: null,
      revenueGrowth: null, profitGrowth: null, debtEquity: null,
      marketCap: null, eps: null, currentRatio: null,
    };
  }

  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
    return null;
  };

  return {
    pe: num(raw.pe ?? raw.peRatio ?? raw.pe_ratio),
    pb: num(raw.pb ?? raw.pbRatio ?? raw.pb_ratio),
    evEbitda: num(raw.evEbitda ?? raw.ev_ebitda),
    dividendYield: num(raw.dividendYield ?? raw.dividend_yield),
    roe: num(raw.roe),
    roic: num(raw.roic),
    roa: num(raw.roa),
    operatingMargin: num(raw.operatingMargin ?? raw.operating_margin),
    revenueGrowth: num(raw.revenueGrowth ?? raw.revenue_growth),
    profitGrowth: num(raw.profitGrowth ?? raw.profit_growth),
    debtEquity: num(raw.debtEquity ?? raw.debt_equity ?? raw.debtToEquity),
    marketCap: num(raw.marketCap ?? raw.market_cap),
    eps: num(raw.eps),
    currentRatio: num(raw.currentRatio ?? raw.current_ratio),
  };
}

export function buildCompanyResearch(
  symbol: string,
  companyName: string | null | undefined,
  sector: string | null | undefined,
  rawMetrics: Record<string, unknown> | null | undefined,
  isTracked: boolean
): CompanyResearchResult {
  const identity = buildProductIdentity(symbol, companyName, sector);
  const financialSnapshot = buildFinancialSnapshotView(rawMetrics);
  const prediction = buildPredictionViewModel(symbol, null, null, rawMetrics);
  const healthometerInput = computeHealthometerFromResearch(rawMetrics);
  const healthometer = buildHealthometerViewModel(
    healthometerInput.quality,
    healthometerInput.valuation,
    healthometerInput.growth,
    healthometerInput.stability,
    healthometerInput.risk,
    healthometerInput.momentum,
    healthometerInput.financialStrength
  );

  const hasRealData = rawMetrics !== null && rawMetrics !== undefined;
  const state: ProductDataState = !symbol ? "empty" : hasRealData ? "ready" : "partial";

  const actions = buildProductActionResult(isTracked, state === "ready");
  const message = state === "empty" ? "Not enough information for this view yet."
    : state === "partial" ? "Research context is based on available data."
    : "";

  return { identity, prediction, healthometer, actions, financialSnapshot, state, message };
}
