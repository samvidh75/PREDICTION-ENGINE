import { StockEdgeClient } from "./StockEdgeClient";
import { mapCanonicalSnapshot } from "./StockEdgeMapper";
import { STOCKEDGE_CODES } from "./StockEdgeErrors";
import { stockEdgeEndpointDiscovery } from "./StockEdgeEndpointDiscovery";
import type { StockEdgeCanonicalSnapshot, StockEdgeFetchResult, StockEdgeLayer } from "./StockEdgeTypes";

export interface StockEdgeWrapperOptions {
  client?: StockEdgeClient;
}

const LAYER_PATH_MAP: Partial<Record<StockEdgeLayer, string>> = {
  profile: "/api/stock/{symbol}",
  price: "/api/stock/{symbol}/price",
  technicals: "/api/stock/{symbol}/technical",
  fundamentals: "/api/stock/{symbol}/fundamental",
  financial_tables: "/api/stock/{symbol}/financials/profit-loss",
  ownership: "/api/stock/{symbol}/shareholding",
  corporate_actions: "/api/stock/{symbol}/corporate-actions",
  screener_signals: "/api/stock/{symbol}/screener",
};

function interpolatePath(template: string, symbol: string): string {
  return template.replace(/\{symbol\}/g, encodeURIComponent(symbol));
}

export class StockEdgeWrapper {
  private readonly client: StockEdgeClient;
  private discovered = false;

  constructor(options: StockEdgeWrapperOptions = {}) {
    this.client = options.client ?? new StockEdgeClient();
  }

  configSummary(): Record<string, boolean | number> {
    return this.client.getConfigSummary();
  }

  async ensureDiscovered(): Promise<void> {
    if (this.discovered) return;
    const result = await stockEdgeEndpointDiscovery.discover({ symbol: "RELIANCE" });
    if (result.ok) {
      this.discovered = true;
    }
  }

  async fetchFullSnapshot(symbol: string): Promise<StockEdgeFetchResult<StockEdgeCanonicalSnapshot>> {
    const normalized = symbol.trim().toUpperCase();
    await this.ensureDiscovered();
    const errors: string[] = [];

    const combined: Record<string, unknown> = {};
    for (const layer of Object.keys(LAYER_PATH_MAP) as StockEdgeLayer[]) {
      const template = LAYER_PATH_MAP[layer];
      if (!template) continue;
      const path = interpolatePath(template, normalized);
      const result = await this.client.getJson<unknown>({
        layer,
        symbol: normalized,
        path,
        suffix: `wrapper-${layer}`,
      });
      if (result.ok && result.data) {
        combined[layer] = result.data;
        combined._sources = combined._sources || [];
        (combined._sources as string[]).push(layer);
      }
      if (result.internalErrorCode && result.internalErrorCode !== STOCKEDGE_CODES.disabled) {
        errors.push(result.internalErrorCode);
      }
    }

    if (Object.keys(combined).length === 0) {
      return {
        ok: false,
        status: "error",
        layer: "full_snapshot",
        symbol: normalized,
        fetchedAt: new Date().toISOString(),
        cacheTtlSeconds: 0,
        data: null,
        internalErrorCode: errors[0] ?? STOCKEDGE_CODES.endpointNotDiscovered,
      };
    }

    return {
      ok: true,
      status: "fresh",
      layer: "full_snapshot",
      symbol: normalized,
      fetchedAt: new Date().toISOString(),
      cacheTtlSeconds: this.client.getConfigSummary().sessionTtlSeconds as number || 3600,
      data: mapCanonicalSnapshot(normalized, combined),
      internalErrorCode: errors.length > 0 ? errors[0] : undefined,
    };
  }

  async fetchLayer(symbol: string, layer: Exclude<StockEdgeLayer, "full_snapshot">): Promise<StockEdgeFetchResult<unknown>> {
    const normalized = symbol.trim().toUpperCase();
    const template = LAYER_PATH_MAP[layer];
    if (!template) {
      return {
        ok: false,
        status: "error",
        layer,
        symbol: normalized,
        fetchedAt: new Date().toISOString(),
        cacheTtlSeconds: 0,
        data: null,
        internalErrorCode: STOCKEDGE_CODES.endpointNotDiscovered,
      };
    }
    const path = interpolatePath(template, normalized);
    return this.client.getJson({
      layer,
      symbol: normalized,
      path,
      suffix: `${layer}-v2`,
    });
  }
}
