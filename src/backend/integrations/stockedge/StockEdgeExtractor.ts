import type { StockEdgeCanonicalSnapshot, StockEdgeLayer } from "./StockEdgeTypes";
import { StockEdgeWrapper } from "./StockEdgeWrapper";
import { buildStockEdgePredictionInput } from "./StockEdgePredictionBridge";
import { stockEdgeExtractionRunStore } from "./StockEdgeExtractionRunStore";

export interface StockEdgeExtractionPlan {
  symbol: string;
  layers: StockEdgeLayer[];
  reason: string;
  dryRun?: boolean;
}

export interface StockEdgeExtractionResult {
  symbol: string;
  ok: boolean;
  layersAttempted: StockEdgeLayer[];
  layersAvailable: string[];
  snapshot: StockEdgeCanonicalSnapshot | null;
  mappedFieldCount: number;
  activeFactorInputCount: number;
  missingSections: string[];
  elapsedMs: number;
  errors: string[];
  discoveryEndpoints?: number;
}

export class StockEdgeExtractor {
  private readonly wrapper: StockEdgeWrapper;

  constructor(wrapper = new StockEdgeWrapper()) {
    this.wrapper = wrapper;
  }

  buildPlan(symbol: string, layers?: StockEdgeLayer[], reason?: string): StockEdgeExtractionPlan {
    return {
      symbol: symbol.trim().toUpperCase(),
      layers: layers ?? ["profile", "price", "technicals", "fundamentals", "financial_tables", "ownership", "corporate_actions", "screener_signals"],
      reason: reason ?? "scheduled_snapshot_refresh",
    };
  }

  async extract(plan: StockEdgeExtractionPlan): Promise<StockEdgeExtractionResult> {
    const start = Date.now();
    const result = await this.wrapper.fetchFullSnapshot(plan.symbol);

    if (!result.ok || !result.data) {
      const failed: StockEdgeExtractionResult = {
        symbol: plan.symbol,
        ok: false,
        layersAttempted: plan.layers,
        layersAvailable: [],
        snapshot: null,
        mappedFieldCount: 0,
        activeFactorInputCount: 0,
        missingSections: ["snapshot"],
        elapsedMs: Date.now() - start,
        errors: result.internalErrorCode ? [result.internalErrorCode] : ["extraction_failed"],
        discoveryEndpoints: 0,
      };
      stockEdgeExtractionRunStore.recordRun({ id: `extract-${plan.symbol}-${Date.now()}`, symbol: plan.symbol, startedAt: new Date(start).toISOString(), completedAt: new Date().toISOString(), ok: false, layersAttempted: plan.layers, layersAvailable: [], mappedFieldCount: 0, activeFactorInputCount: 0, errors: failed.errors, elapsedMs: failed.elapsedMs });
      return failed;
    }

    const snapshot = result.data;
    const layersAvailable: string[] = [];
    if (snapshot.profile?.companyName) layersAvailable.push("profile");
    if (snapshot.price?.price) layersAvailable.push("price");
    if (snapshot.technicals?.rsi) layersAvailable.push("technicals");
    if (snapshot.fundamentals?.peRatio) layersAvailable.push("fundamentals");
    if (snapshot.financialTables.length > 0) layersAvailable.push("financial_tables");
    if (snapshot.ownership.length > 0) layersAvailable.push("ownership");
    if (snapshot.corporateActions.length > 0) layersAvailable.push("corporate_actions");
    if (snapshot.screenerSignals.length > 0) layersAvailable.push("screener_signals");

    const missingSections = plan.layers.filter((l) => !layersAvailable.includes(l));
    const predictionInput = buildStockEdgePredictionInput(snapshot);

    const success: StockEdgeExtractionResult = {
      symbol: plan.symbol,
      ok: true,
      layersAttempted: plan.layers,
      layersAvailable,
      snapshot: plan.dryRun ? null : snapshot,
      mappedFieldCount: Object.keys(snapshot).length,
      activeFactorInputCount: predictionInput.activeFieldCount,
      missingSections,
      elapsedMs: Date.now() - start,
      errors: result.internalErrorCode ? [result.internalErrorCode] : [],
    };

    stockEdgeExtractionRunStore.recordRun({ id: `extract-${plan.symbol}-${Date.now()}`, symbol: plan.symbol, startedAt: new Date(start).toISOString(), completedAt: new Date().toISOString(), ok: true, layersAttempted: plan.layers, layersAvailable, mappedFieldCount: success.mappedFieldCount, activeFactorInputCount: success.activeFactorInputCount, errors: success.errors, elapsedMs: success.elapsedMs });

    if (!plan.dryRun) {
      stockEdgeExtractionRunStore.recordSnapshot({ symbol: plan.symbol, capturedAt: new Date().toISOString(), layersAvailable, mappedFieldCount: success.mappedFieldCount, ttlSeconds: 3600 });
    }

    return success;
  }
}
