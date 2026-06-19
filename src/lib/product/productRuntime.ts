import type { ProductDataState } from "./productDataStates";
import { normalizeNumericValue } from "./predictionEngine/factorNormalization";
import { buildPredictionViewModel, type PredictionViewState } from "./predictionEngine/predictionViewModel";
import { buildHealthometerViewModel, type HealthometerViewState } from "./predictionEngine/healthometerViewModel";
import { computeHealthometerFromResearch } from "./predictionEngine/researchScore";

export interface ProductIdentity {
  symbol: string;
  companyName: string;
  displayName: string;
  sector: string | null;
}

export interface ProductActionResult {
  canInvest: boolean;
  canTrack: boolean;
  canCompare: boolean;
  trackLabel: string;
  investLabel: string;
}

export interface ProductRuntimeResult<T> {
  state: ProductDataState;
  data: T | null;
  message: string;
}

export function buildProductIdentity(symbol: string, companyName?: string | null, sector?: string | null): ProductIdentity {
  const name = companyName && companyName !== symbol ? companyName : symbol;
  return {
    symbol,
    companyName: name,
    displayName: name,
    sector: sector || null,
  };
}

export function buildProductActionResult(isTracked: boolean, hasEnoughData: boolean): ProductActionResult {
  return {
    canInvest: hasEnoughData,
    canTrack: true,
    canCompare: true,
    trackLabel: isTracked ? "Tracked" : "Track",
    investLabel: "Invest",
  };
}

export function getProductStateMessage(state: ProductDataState, hasData: boolean): string {
  if (state === "loading") return "Loading...";
  if (state === "empty") return "Not enough information for this view yet.";
  if (state === "error") return "Research signals are being prepared.";
  if (state === "partial") return "Partial research context";
  if (!hasData) return "Research context is based on available data.";
  return "";
}

export function runFullResearchRuntime(
  symbol: string,
  companyName: string | null | undefined,
  sector: string | null | undefined,
  rawMetrics: Record<string, unknown> | null | undefined,
  score: number | null | undefined,
  riskScore: number | null | undefined,
  isTracked: boolean
): {
  identity: ProductIdentity;
  prediction: PredictionViewState;
  healthometer: HealthometerViewState;
  actions: ProductActionResult;
  state: ProductDataState;
  message: string;
} {
  const identity = buildProductIdentity(symbol, companyName, sector);
  const prediction = buildPredictionViewModel(symbol, score, riskScore, rawMetrics);
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

  const hasRealData = rawMetrics !== null && rawMetrics !== undefined && Object.keys(rawMetrics).length > 0;
  const state: ProductDataState = !symbol ? "empty" : hasRealData ? "ready" : "partial";

  const actions = buildProductActionResult(isTracked, state === "ready");
  const message = getProductStateMessage(state, hasRealData);

  return { identity, prediction, healthometer, actions, state, message };
}

export function isEmptyMetrics(metrics: Record<string, unknown> | null | undefined): boolean {
  if (!metrics) return true;
  const hasAnyValue = Object.values(metrics).some((v) => {
    const n = normalizeNumericValue(v);
    return n !== null && n !== undefined;
  });
  return !hasAnyValue;
}
