import { StockEdgeClient } from "./StockEdgeClient";
import { mapCanonicalSnapshot } from "./StockEdgeMapper";
import type { StockEdgeCanonicalSnapshot, StockEdgeFetchResult, StockEdgeLayer } from "./StockEdgeTypes";

export interface StockEdgeWrapperOptions {
  client?: StockEdgeClient;
}

export class StockEdgeWrapper {
  private readonly client: StockEdgeClient;

  constructor(options: StockEdgeWrapperOptions = {}) {
    this.client = options.client ?? new StockEdgeClient();
  }

  configSummary(): Record<string, boolean | number> {
    return this.client.getConfigSummary();
  }

  async fetchFullSnapshot(symbol: string): Promise<StockEdgeFetchResult<StockEdgeCanonicalSnapshot>> {
    const normalized = symbol.trim().toUpperCase();
    const result = await this.client.getJson<Record<string, unknown>>({
      layer: "full_snapshot",
      symbol: normalized,
      path: `/stocks/${encodeURIComponent(normalized)}/full`,
      suffix: "full-v1",
    });

    if (!result.ok || !result.data) {
      return { ...result, data: null };
    }

    return {
      ...result,
      data: mapCanonicalSnapshot(normalized, result.data),
    };
  }

  async fetchLayer(symbol: string, layer: Exclude<StockEdgeLayer, "full_snapshot">): Promise<StockEdgeFetchResult<unknown>> {
    const normalized = symbol.trim().toUpperCase();
    return this.client.getJson({
      layer,
      symbol: normalized,
      path: `/stocks/${encodeURIComponent(normalized)}/${layer}`,
      suffix: `${layer}-v1`,
    });
  }
}
