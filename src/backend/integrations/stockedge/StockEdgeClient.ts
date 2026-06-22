import { loadStockEdgeConfig } from "./StockEdgeConfig";
import { stockEdgeMemoryCache } from "./StockEdgeCache";
import { STOCKEDGE_CODES, StockEdgeIntegrationError } from "./StockEdgeErrors";
import type { StockEdgeConfig, StockEdgeFetchResult, StockEdgeLayer } from "./StockEdgeTypes";

export interface StockEdgeClientOptions {
  config?: StockEdgeConfig;
  fetchImpl?: typeof fetch;
}

export interface StockEdgeRequestOptions {
  layer: StockEdgeLayer;
  symbol?: string;
  path: string;
  suffix?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function disabledResult<T>(layer: StockEdgeLayer, symbol?: string): StockEdgeFetchResult<T> {
  return {
    ok: false,
    status: "disabled",
    layer,
    symbol,
    fetchedAt: nowIso(),
    cacheTtlSeconds: 0,
    data: null,
    internalErrorCode: STOCKEDGE_CODES.disabled,
  };
}

export class StockEdgeClient {
  private readonly config: StockEdgeConfig;
  private readonly fetchImpl: typeof fetch;
  private requestWindowStartedAt = 0;
  private requestCountInWindow = 0;

  constructor(options: StockEdgeClientOptions = {}) {
    this.config = options.config ?? loadStockEdgeConfig();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  getConfigSummary(): Record<string, boolean | number> {
    return {
      enabled: this.config.enabled,
      hasAccountId: Boolean(this.config.accountId),
      hasAccessToken: Boolean(this.config.accessSecret),
      hasBaseUrl: Boolean(this.config.baseUrl),
      timeoutMs: this.config.timeoutMs,
      rateLimitPerMinute: this.config.rateLimitPerMinute,
    };
  }

  async getJson<T>(options: StockEdgeRequestOptions): Promise<StockEdgeFetchResult<T>> {
    const ttl = this.config.cacheTtlSeconds[options.layer];
    const symbol = options.symbol?.toUpperCase();
    const cacheKey = stockEdgeMemoryCache.key(options.layer, symbol, options.suffix ?? options.path);
    const cached = stockEdgeMemoryCache.get<T>(cacheKey);
    if (cached.state === "fresh" && cached.value != null) {
      return { ok: true, status: "cached", layer: options.layer, symbol, fetchedAt: nowIso(), cacheTtlSeconds: ttl, data: cached.value };
    }

    if (!this.config.enabled) return disabledResult<T>(options.layer, symbol);
    if (!this.config.baseUrl) {
      return {
        ok: false,
        status: cached.value ? "stale_cached" : "error",
        layer: options.layer,
        symbol,
        fetchedAt: nowIso(),
        cacheTtlSeconds: ttl,
        data: cached.value,
        internalErrorCode: STOCKEDGE_CODES.configMissing,
      };
    }

    return stockEdgeMemoryCache.coalesce(cacheKey, async () => {
      try {
        this.enforceRateLimit();
        const value = await this.fetchJson<T>(options.path);
        stockEdgeMemoryCache.set(cacheKey, value, ttl);
        return { ok: true, status: "fresh", layer: options.layer, symbol, fetchedAt: nowIso(), cacheTtlSeconds: ttl, data: value };
      } catch (error) {
        const code = error instanceof StockEdgeIntegrationError ? error.code : STOCKEDGE_CODES.remoteError;
        return {
          ok: false,
          status: cached.value ? "stale_cached" : "error",
          layer: options.layer,
          symbol,
          fetchedAt: nowIso(),
          cacheTtlSeconds: ttl,
          data: cached.value,
          internalErrorCode: code,
        };
      }
    });
  }

  private enforceRateLimit(): void {
    const now = Date.now();
    if (now - this.requestWindowStartedAt > 60_000) {
      this.requestWindowStartedAt = now;
      this.requestCountInWindow = 0;
    }
    this.requestCountInWindow += 1;
    if (this.requestCountInWindow > this.config.rateLimitPerMinute) {
      throw new StockEdgeIntegrationError(STOCKEDGE_CODES.rateLimited, "StockEdge request limit reached", true);
    }
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const url = new URL(path, this.config.baseUrl);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (this.config.accessSecret) headers.Authorization = `Bearer ${this.config.accessSecret}`;
      const response = await this.fetchImpl(url, { headers, signal: controller.signal });
      if (!response.ok) {
        throw new StockEdgeIntegrationError(
          response.status === 429 ? STOCKEDGE_CODES.rateLimited : STOCKEDGE_CODES.remoteError,
          `StockEdge returned ${response.status}`,
          response.status >= 500 || response.status === 429,
        );
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new StockEdgeIntegrationError(STOCKEDGE_CODES.timeout, "StockEdge request timed out", true);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
