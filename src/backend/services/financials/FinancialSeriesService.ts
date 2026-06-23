import type { FinancialSeries } from "../../../shared/financials/FinancialSeriesTypes";
import type { FinancialMetricKey } from "../../../shared/financials/FinancialSeriesTypes";
import { mapToFinancialSeries } from "./FinancialSeriesMapper";

const INDIANAPI_BASE = process.env.INDIANAPI_BASE_URL || "https://stock.indianapi.in";
const API_KEY = process.env.INDIANAPI_KEY || "";
const CACHE_TTL = 12 * 60 * 60 * 1000;

interface CacheEntry {
  series: FinancialSeries[];
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

async function fetchFromIndianApi(symbol: string): Promise<Record<string, unknown>[]> {
  const url = `${INDIANAPI_BASE}/stock?name=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    headers: API_KEY ? { "X-API-KEY": API_KEY } : {},
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`IndianAPI returned ${res.status}`);
  }
  const data = await res.json() as Record<string, unknown>;
  const financials = data["financials"];
  if (!Array.isArray(financials)) {
    throw new Error("No financials data in response");
  }
  return financials as Record<string, unknown>[];
}

export async function getFinancialSeries(
  symbol: string,
  options?: { periodType?: "annual" | "quarterly"; metrics?: FinancialMetricKey[] },
): Promise<{ series: FinancialSeries[]; source: string }> {
  const clean = symbol.toUpperCase().trim();
  const cacheKey = `${clean}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { series: cached.series, source: "cache" };
  }

  try {
    const financials = await fetchFromIndianApi(clean);
    const allSeries = mapToFinancialSeries(clean, financials, options?.metrics);

    cache.set(cacheKey, { series: allSeries, fetchedAt: Date.now() });

    return { series: allSeries, source: "indianapi" };
  } catch (error) {
    return { series: [], source: "unavailable" };
  }
}
