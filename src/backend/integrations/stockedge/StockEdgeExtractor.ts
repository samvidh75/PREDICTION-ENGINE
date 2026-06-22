import type { StockEdgeCanonicalSnapshot, StockEdgeLayer } from "./StockEdgeTypes";
import { StockEdgeWrapper } from "./StockEdgeWrapper";

export interface StockEdgeExtractionPlan {
  symbol: string;
  layers: StockEdgeLayer[];
  reason: string;
}

export interface StockEdgeExtractionResult {
  symbol: string;
  ok: boolean;
  layersAttempted: StockEdgeLayer[];
  snapshot: StockEdgeCanonicalSnapshot | null;
  errors: string[];
}

export class StockEdgeExtractor {
  private readonly wrapper: StockEdgeWrapper;

  constructor(wrapper = new StockEdgeWrapper()) {
    this.wrapper = wrapper;
  }

  buildPlan(symbol: string, layers: StockEdgeLayer[] = ["full_snapshot"]): StockEdgeExtractionPlan {
    return {
      symbol: symbol.trim().toUpperCase(),
      layers,
      reason: "scheduled_snapshot_refresh",
    };
  }

  async extract(plan: StockEdgeExtractionPlan): Promise<StockEdgeExtractionResult> {
    const result = await this.wrapper.fetchFullSnapshot(plan.symbol);
    return {
      symbol: plan.symbol,
      ok: result.ok && Boolean(result.data),
      layersAttempted: plan.layers,
      snapshot: result.data,
      errors: result.internalErrorCode ? [result.internalErrorCode] : [],
    };
  }
}
