import { loadStockEdgeConfig } from "./StockEdgeConfig";
import { STOCKEDGE_CODES, StockEdgeIntegrationError } from "./StockEdgeErrors";
import { stockEdgeSessionStore } from "./StockEdgeSessionStore";
import type { StockEdgeConfig, StockEdgeLayer } from "./StockEdgeTypes";
import { StockEdgePlaywrightAuth } from "./StockEdgePlaywrightAuth";

export type SymbolParamStrategy = "path" | "query" | "body" | "unknown";

export interface StockEdgeDiscoveredEndpoint {
  id: string;
  layer: StockEdgeLayer;
  method: "GET" | "POST";
  urlTemplate: string;
  host: string;
  requiredHeaders: string[];
  symbolParamStrategy: SymbolParamStrategy;
  confidence: number;
  sampleKeys: string[];
  discoveredAt: string;
}

export interface StockEdgeDiscoveryResult {
  ok: boolean;
  endpoints: StockEdgeDiscoveredEndpoint[];
  layerCounts: Record<string, number>;
  errorCode?: string;
  elapsedMs: number;
  discoveryFile?: string;
}

function classifyLayer(url: string, sampleKeys: string[]): StockEdgeLayer | null {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("profile") || urlLower.includes("overview")) return "profile";
  if (urlLower.includes("price") || urlLower.includes("quote") || urlLower.includes("live")) return "price";
  if (urlLower.includes("technical") || urlLower.includes("indicator")) return "technicals";
  if (urlLower.includes("fundamental") || urlLower.includes("ratio") || urlLower.includes("financial")) {
    if (urlLower.includes("table") || urlLower.includes("statement") || urlLower.includes("quarterly")) return "financial_tables";
    return "fundamentals";
  }
  if (urlLower.includes("ownership") || urlLower.includes("shareholding") || urlLower.includes("shareholder")) return "ownership";
  if (urlLower.includes("corporate") || urlLower.includes("action") || urlLower.includes("dividend")) return "corporate_actions";
  if (urlLower.includes("screener") || urlLower.includes("checklist") || urlLower.includes("scanner") || urlLower.includes("signal")) return "screener_signals";
  if (urlLower.includes("peer") || urlLower.includes("comparison") || urlLower.includes("comp")) return "screener_signals";

  for (const key of sampleKeys) {
    const kl = key.toLowerCase();
    if (kl === "rsi" || kl === "macd" || kl === "sma") return "technicals";
    if (kl === "pe" || kl === "pb" || kl === "roe" || kl === "roce") return "fundamentals";
    if (kl === "promoter" || kl === "fii" || kl === "dii") return "ownership";
    if (kl === "revenue" || kl === "sales" || kl === "net_profit") return "financial_tables";
  }

  return null;
}

export interface StockEdgeDiscoveryOptions {
  symbol?: string;
  discoveryDir?: string;
  fetchImpl?: typeof fetch;
  config?: StockEdgeConfig;
}

export class StockEdgeEndpointDiscovery {
  private readonly config: StockEdgeConfig;
  private readonly fetchImpl: typeof fetch;

  constructor(options: StockEdgeDiscoveryOptions = {}) {
    this.config = options.config ?? loadStockEdgeConfig();
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async discover(options: StockEdgeDiscoveryOptions = {}): Promise<StockEdgeDiscoveryResult> {
    const start = Date.now();
    const symbol = options.symbol ?? "RELIANCE";
    const endpoints: StockEdgeDiscoveredEndpoint[] = [];

    if (!this.config.enabled) {
      return { ok: false, endpoints, layerCounts: {}, errorCode: STOCKEDGE_CODES.disabled, elapsedMs: Date.now() - start };
    }

    const session = stockEdgeSessionStore.getSession();
    if (!session) {
      return { ok: false, endpoints, layerCounts: {}, errorCode: STOCKEDGE_CODES.sessionExpired, elapsedMs: Date.now() - start };
    }

    const candidateTemplates = this.buildCandidateEndpoints(symbol);
    for (const candidate of candidateTemplates) {
      try {
        const endpoint = await this.probeEndpoint(candidate, session);
        if (endpoint) endpoints.push(endpoint);
      } catch {
        continue;
      }
    }

    const layerCounts: Record<string, number> = {};
    for (const ep of endpoints) {
      layerCounts[ep.layer] = (layerCounts[ep.layer] || 0) + 1;
    }

    return {
      ok: endpoints.length > 0,
      endpoints,
      layerCounts,
      elapsedMs: Date.now() - start,
      errorCode: endpoints.length === 0 ? STOCKEDGE_CODES.endpointNotDiscovered : undefined,
    };
  }

  private buildCandidateEndpoints(symbol: string): { url: string; layer: StockEdgeLayer; method: "GET" | "POST"; sampleKeys: string[] }[] {
    const base = this.config.baseUrl || "https://web.stockedge.com";
    const candidates = [
      { url: `${base}/api/stock/${symbol}`, layer: "profile" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["companyName", "sector"] },
      { url: `${base}/api/stock/${symbol}/price`, layer: "price" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["price", "change"] },
      { url: `${base}/api/stocks/${symbol}/price`, layer: "price" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["ltp", "volume"] },
      { url: `${base}/api/stock/${symbol}/technical`, layer: "technicals" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["rsi", "macd"] },
      { url: `${base}/api/stock/${symbol}/fundamental`, layer: "fundamentals" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["pe", "roe"] },
      { url: `${base}/api/stock/${symbol}/ratios`, layer: "fundamentals" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["peRatio", "pbRatio"] },
      { url: `${base}/api/stock/${symbol}/financials/quarterly`, layer: "financial_tables" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["revenue", "profit"] },
      { url: `${base}/api/stock/${symbol}/financials/profit-loss`, layer: "financial_tables" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["sales", "expenses"] },
      { url: `${base}/api/stock/${symbol}/financials/balance-sheet`, layer: "financial_tables" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["assets", "liabilities"] },
      { url: `${base}/api/stock/${symbol}/financials/cash-flow`, layer: "financial_tables" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["operating", "investing"] },
      { url: `${base}/api/stock/${symbol}/shareholding`, layer: "ownership" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["promoter", "fii"] },
      { url: `${base}/api/stock/${symbol}/ownership`, layer: "ownership" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["promoters", "institutions"] },
      { url: `${base}/api/stock/${symbol}/corporate-actions`, layer: "corporate_actions" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["dividend", "split"] },
      { url: `${base}/api/stock/${symbol}/screener`, layer: "screener_signals" as StockEdgeLayer, method: "GET" as const, sampleKeys: ["signal", "check"] },
    ];
    return candidates;
  }

  private async probeEndpoint(
    candidate: { url: string; layer: StockEdgeLayer; method: "GET" | "POST"; sampleKeys: string[] },
    session: { cookieHeader: string },
  ): Promise<StockEdgeDiscoveredEndpoint | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchImpl(candidate.url, {
        method: candidate.method,
        headers: {
          Cookie: session.cookieHeader,
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
        signal: controller.signal,
      });

      if (!response.ok) return null;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("json")) return null;

      const body = await response.json();
      if (!body || (typeof body === "object" && Object.keys(body).length === 0)) return null;

      const keys = typeof body === "object" ? Object.keys(body as Record<string, unknown>) : [];
      const urlObj = new URL(candidate.url);
      const path = urlObj.pathname;

      const discoveredLayer = classifyLayer(path, keys) || candidate.layer;

      return {
        id: `se-${discoveredLayer}-${Date.now()}`,
        layer: discoveredLayer,
        method: candidate.method,
        urlTemplate: path,
        host: urlObj.host,
        requiredHeaders: ["Cookie"],
        symbolParamStrategy: "path",
        confidence: keys.length > 0 ? 0.7 : 0.3,
        sampleKeys: keys.slice(0, 10),
        discoveredAt: new Date().toISOString(),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async discoverWithPlaywright(symbol: string): Promise<StockEdgeDiscoveryResult> {
    const start = Date.now();
    if (!this.config.enabled) {
      return { ok: false, endpoints: [], layerCounts: {}, errorCode: STOCKEDGE_CODES.disabled, elapsedMs: Date.now() - start };
    }
    if (!this.config.accountId || !this.config.password) {
      return { ok: false, endpoints: [], layerCounts: {}, errorCode: STOCKEDGE_CODES.authNotConfigured, elapsedMs: Date.now() - start };
    }

    try {
      const pwAuth = new StockEdgePlaywrightAuth(this.config);
      const result = await pwAuth.discoverEndpoints(symbol);

      const endpoints: StockEdgeDiscoveredEndpoint[] = result.endpoints.map((ep, i) => ({
        id: `se-pw-${ep.layer}-${Date.now()}-${i}`,
        layer: ep.layer as StockEdgeLayer,
        method: "GET" as const,
        urlTemplate: ep.url,
        host: ep.host,
        requiredHeaders: ["Cookie"],
        symbolParamStrategy: "unknown" as SymbolParamStrategy,
        confidence: ep.sampleKeys.length > 0 ? 0.8 : 0.3,
        sampleKeys: ep.sampleKeys,
        discoveredAt: new Date().toISOString(),
      }));

      const layerCounts: Record<string, number> = {};
      for (const ep of endpoints) {
        const layer = ep.layer;
        layerCounts[layer] = (layerCounts[layer] || 0) + 1;
      }

      return {
        ok: endpoints.length > 0,
        endpoints,
        layerCounts,
        elapsedMs: Date.now() - start,
        errorCode: endpoints.length === 0 ? STOCKEDGE_CODES.endpointNotDiscovered : undefined,
      };
    } catch (error) {
      const code = error instanceof StockEdgeIntegrationError ? error.code : STOCKEDGE_CODES.endpointNotDiscovered;
      return { ok: false, endpoints: [], layerCounts: {}, errorCode: code, elapsedMs: Date.now() - start };
    }
  }
}

export const stockEdgeEndpointDiscovery = new StockEdgeEndpointDiscovery();
