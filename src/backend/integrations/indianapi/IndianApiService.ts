import type {
  IndianApiFetchResult, LayerKind, MarketLivePrice, CompanyProfileOverview,
  FundamentalSnapshot, FinancialStatementTable, ShareholdingTrend,
  CorporateAction, HistoricalPriceSeries, UnifiedIndianStockSnapshot,
} from "./IndianApiTypes";
import { IndianApiError, mapIndianApiError } from "./IndianApiErrors";
import { globalIndianApiCache } from "./IndianApiCache";
import { mapToMarketLivePrice, mapToProfile, mapToFundamentals, mapToFinancialTable, mapToShareholding } from "./IndianApiMapper";

const BASE_URL = process.env.INDIANAPI_BASE_URL || "https://stock.indianapi.in";
const TIMEOUT_MS = Number(process.env.INDIANAPI_TIMEOUT_MS) || 10_000;
const API_KEY = process.env.INDIANAPI_KEY || "";

interface RequestOptions {
  path: string;
  layer: LayerKind;
}

const pendingRequests = new Map<string, Promise<unknown>>();

async function fetchWithTimeout(url: string, timeoutMs: number, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function rawFetch<T>(opts: RequestOptions): Promise<IndianApiFetchResult<T>> {
  const url = `${BASE_URL}${opts.path}`;
  const cacheKey = `indianapi:${opts.layer}:${opts.path}`;

  const cached = globalIndianApiCache.get<T>(cacheKey);
  if (cached && cached.status === "cached") {
    return { ok: true, data: cached.data, status: "cached", fetchedAt: new Date().toISOString(), cacheTtlSeconds: globalIndianApiCache.getLayerTtlSeconds(opts.layer) };
  }

  if (pendingRequests.has(cacheKey)) {
    const result = await pendingRequests.get(cacheKey) as T;
    return { ok: true, data: result, status: "cached", fetchedAt: new Date().toISOString(), cacheTtlSeconds: globalIndianApiCache.getLayerTtlSeconds(opts.layer) };
  }

  if (!API_KEY) {
    if (cached && cached.status === "stale_cached") {
      return { ok: true, data: cached.data, status: "stale_cached", fetchedAt: new Date().toISOString(), cacheTtlSeconds: globalIndianApiCache.getLayerTtlSeconds(opts.layer) };
    }
    return { ok: false, data: null, status: "empty", fetchedAt: new Date().toISOString(), cacheTtlSeconds: 0 };
  }

  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-API-KEY"] = API_KEY;

  const promise = (async () => {
    try {
      const res = await fetchWithTimeout(url, TIMEOUT_MS, headers);
      if (!res.ok) {
        if (res.status === 429) throw new IndianApiError("Rate limit", "RATE_LIMITED", true, 429);
        if (res.status >= 500) throw new IndianApiError("Provider error", "PROVIDER_ERROR", true, res.status);
        throw new IndianApiError(`HTTP ${res.status}`, "HTTP_ERROR", false, res.status);
      }
      const raw = await res.json();
      const data = applyMapper<T>(raw, opts.layer);
      globalIndianApiCache.set(cacheKey, data, opts.layer);
      return data;
    } catch (err) {
      const mapped = mapIndianApiError(err);
      if (cached && cached.status === "stale_cached" && mapped.retryable) {
        return cached.data;
      }
      throw mapped;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, promise);
  const data = await promise;
  return { ok: true, data, status: "fresh", fetchedAt: new Date().toISOString(), cacheTtlSeconds: globalIndianApiCache.getLayerTtlSeconds(opts.layer) };
}

function applyMapper<T>(raw: unknown, layer: LayerKind): T {
  switch (layer) {
    case "price": return mapToMarketLivePrice(raw) as T;
    case "profile": return mapToProfile(raw) as T;
    case "fundamentals": return mapToFundamentals(raw) as T;
    case "financials": return mapToFinancialTable(raw) as T;
    case "shareholding": return mapToShareholding(raw) as T;
    default: return raw as T;
  }
}

export class IndianApiService {
  async getPrice(symbol: string): Promise<IndianApiFetchResult<MarketLivePrice>> {
    return rawFetch<MarketLivePrice>({ path: `/stock?name=${encodeURIComponent(symbol)}`, layer: "price" });
  }

  async getProfile(symbol: string): Promise<IndianApiFetchResult<CompanyProfileOverview>> {
    return rawFetch<CompanyProfileOverview>({ path: `/stock?name=${encodeURIComponent(symbol)}`, layer: "profile" });
  }

  async getFundamentals(symbol: string): Promise<IndianApiFetchResult<FundamentalSnapshot>> {
    return rawFetch<FundamentalSnapshot>({ path: `/stock?name=${encodeURIComponent(symbol)}`, layer: "fundamentals" });
  }

  async getFinancials(symbol: string): Promise<IndianApiFetchResult<FinancialStatementTable>> {
    return rawFetch<FinancialStatementTable>({ path: `/stock?name=${encodeURIComponent(symbol)}`, layer: "financials" });
  }

  async getShareholding(symbol: string): Promise<IndianApiFetchResult<ShareholdingTrend>> {
    return rawFetch<ShareholdingTrend>({ path: `/stock?name=${encodeURIComponent(symbol)}`, layer: "shareholding" });
  }

  async getFullSnapshot(symbol: string, include?: LayerKind[]): Promise<IndianApiFetchResult<UnifiedIndianStockSnapshot>> {
    const layers = include ?? ["price", "profile", "fundamentals", "financials", "shareholding", "corporate_actions", "historical"];
    const [price, profile, fundamentals] = await Promise.all([
      layers.includes("price") ? this.getPrice(symbol) : { ok: false, data: null, status: "empty" as const, fetchedAt: "", cacheTtlSeconds: 0 },
      layers.includes("profile") ? this.getProfile(symbol) : { ok: false, data: null, status: "empty" as const, fetchedAt: "", cacheTtlSeconds: 0 },
      layers.includes("fundamentals") ? this.getFundamentals(symbol) : { ok: false, data: null, status: "empty" as const, fetchedAt: "", cacheTtlSeconds: 0 },
    ]);
    const snapshot: UnifiedIndianStockSnapshot = {
      symbol,
      price: price.data,
      profile: profile.data,
      fundamentals: fundamentals.data,
      shareholding: null,
      corporateActions: [],
      historical: null,
      fetchedAt: new Date().toISOString(),
      dataState: "partial",
    };
    if (price.ok || profile.ok || fundamentals.ok) snapshot.dataState = "available";
    return { ok: true, data: snapshot, status: "fresh", fetchedAt: snapshot.fetchedAt, cacheTtlSeconds: globalIndianApiCache.getLayerTtlSeconds("price") };
  }
}

export const indianApiService = new IndianApiService();
