import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPersistedStockResearch } from "../src/lib/stockResearchSnapshot.js";

// ── Constants ──────────────────────────────────────────────────────────────────
const RANGE_CFG: Record<string, { range: string; interval: string }> = {
  "1W": { range: "1w", interval: "1h" },
  "1M": { range: "1mo", interval: "1d" },
  "3M": { range: "3mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1wk" },
  "5Y": { range: "5y", interval: "1mo" },
};
const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Fetch raw data from the free Yahoo v8 chart API. No key required. */
async function yahooChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<any> {
  const ticker = `${symbol}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d?.chart?.result?.[0] ?? null;
}

/** Parse real-time quote fields from a Yahoo chart result. */
function parseQuote(result: any) {
  const meta = result?.meta ?? {};
  const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
    (v: number | null) => v !== null,
  );
  const latest = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
  const prev = meta.chartPreviousClose ?? latest;
  return {
    price: Number(latest.toFixed(2)),
    change: Number((latest - prev).toFixed(2)),
    changePercent: prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0,
    volume: meta.regularMarketVolume ?? 0,
    marketCap: meta.marketCap ?? 0,
  };
}

/** Parse a price-history array from a Yahoo chart result. */
function parseHistory(result: any): Array<{ label: string; price: number }> {
  const quotes = result?.indicators?.quote?.[0] ?? {};
  const closes = (quotes.close ?? []).filter((v: number | null) => v !== null);
  const timestamps: number[] = result?.timestamp ?? [];
  return closes.map((c: number, i: number) => ({
    label: timestamps[i]
      ? new Date(timestamps[i] * 1000).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : `Day ${i + 1}`,
    price: Number(c.toFixed(2)),
  }));
}

/** Try to fetch real fundamentals from IndianAPI (key set in env). */
async function indianApiFundamentals(
  symbol: string,
): Promise<{
  fundamentals: Record<string, unknown>;
  stockMetrics: Record<string, unknown>;
  available: boolean;
}> {
  const key = process.env.INDIANAPI_KEY || process.env.VITE_INDIANAPI_KEY;
  if (!key) return { fundamentals: {}, stockMetrics: {}, available: false };

  const clean = symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, "");
  try {
    // Stock fundamentals
    const [fundR, stockR] = await Promise.allSettled([
      fetch(`https://stock.indianapi.in/stock_fundamentals?name=${encodeURIComponent(clean)}`, {
        headers: { "X-Api-Key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5_000),
      }),
      fetch(`https://stock.indianapi.in/stock?name=${encodeURIComponent(clean)}`, {
        headers: { "X-Api-Key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5_000),
      }),
    ]);

    const fundamentals: Record<string, unknown> = {};
    if (fundR.status === "fulfilled" && fundR.value.ok) {
      const body = await fundR.value.json();
      Object.assign(fundamentals, body?.fundamentals ?? body ?? {});
    }

    const stockMetrics: Record<string, unknown> = {};
    if (stockR.status === "fulfilled" && stockR.value.ok) {
      const body = await stockR.value.json();
      const sd = body?.stockDetailsReusableData || {};
      if (sd.marketCap != null) stockMetrics.marketCapCrore = Number(sd.marketCap);
      if (body?.keyMetrics && typeof body.keyMetrics === "object") {
        for (const items of Object.values(body.keyMetrics) as any) {
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item?.key && item?.value !== undefined) stockMetrics[item.key] = item.value;
            }
          }
        }
      }
    }

    return {
      fundamentals,
      stockMetrics,
      available: Object.keys(fundamentals).length > 0 || Object.keys(stockMetrics).length > 0,
    };
  } catch {
    return { fundamentals: {}, stockMetrics: {}, available: false };
  }
}

/** Safely parse a finite number from an unknown value. */
function n(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const p = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : null;
}

function crore(v: unknown): number | null {
  const val = n(v);
  return val !== null ? val * 10_000_000 : null;
}

/** Get a metric from either response, checking both sides and falling back. */
function pick(
  fund: Record<string, unknown>,
  stock: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const k of keys) {
    const v = n(fund[k]) ?? n(stock[k]);
    if (v !== null) return v;
  }
  return null;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawSymbol = Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol;
  const symbol = String(rawSymbol ?? "").toUpperCase().trim();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  // Read cache
  const cached = CACHE.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader("X-Cache", "HIT");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
    return res.status(200).json(cached.data);
  }

  // ── Fetch real data in parallel ──────────────────────────────────────────
  const rangeKeys = Object.keys(RANGE_CFG);
  const [quoteResult, ...histResults] = await Promise.allSettled([
    yahooChart(symbol, "1d", "1m"),
    ...rangeKeys.map((k) => {
      const c = RANGE_CFG[k];
      return yahooChart(symbol, c.range, c.interval);
    }),
  ]);
  const iaResult = await indianApiFundamentals(symbol);

  // ── Parse real-time quote and company name ───────────────────────────────
  const qr = quoteResult.status === "fulfilled" ? quoteResult.value : null;
  const quote = qr ? parseQuote(qr) : { price: 0, change: 0, changePercent: 0, volume: 0, marketCap: 0 };
  const meta = qr?.meta ?? {};
  const realCompanyName =
    meta.longName || meta.shortName || "";

  // ── Parse historical price charts ────────────────────────────────────────
  const priceHistory: Record<string, Array<{ label: string; price: number }>> = {};
  for (let i = 0; i < rangeKeys.length; i++) {
    const r = histResults[i];
    priceHistory[rangeKeys[i]] =
      r.status === "fulfilled" && r.value ? parseHistory(r.value) : [];
  }

  // ── Synthetic fallback for non-tradable fields ───────────────────────────
  const syn = await getPersistedStockResearch(symbol);

  // ── Pick fundamental values ──────────────────────────────────────────────
  const fund = iaResult.fundamentals;
  const stock = iaResult.stockMetrics;
  const hasFund = iaResult.available;

  const payload = {
    symbol,
    companyName: realCompanyName || syn?.companyName || symbol,
    exchange: meta.fullExchangeName
      ? meta.fullExchangeName.includes("BSE") ? "BSE" : "NSE"
      : (syn?.exchangeBadge || "NSE"),
    sector: syn?.sector || "Uncategorized",
    industry: syn?.industry || "Uncategorized",
    price: {
      current: quote.price,
      changeAbs: quote.change,
      changePercent: quote.changePercent,
      marketCap: quote.marketCap || crore(stock.marketCapCrore) || syn?.marketCap || 0,
    },
    fundamentals: {
      pe: pick(fund, stock, "pe_ratio", "pPerEExcludingExtraordinaryItemsMostRecentFiscalYear") ?? syn?.pe,
      industryPe: syn?.industryPe || null,
      pb: pick(fund, stock, "pb_ratio", "priceToBookMostRecentFiscalYear") ?? syn?.pb,
      dividendYield: pick(fund, stock, "dividend_yield") ?? syn?.dividendYield,
      eps: pick(fund, stock, "eps") ?? syn?.eps,
    },
    roe: pick(fund, stock, "roe", "return_on_equity") ?? syn?.roe,
    debtToEquity: pick(fund, stock, "debt_to_equity") ?? syn?.debtToEquity,
    revenueGrowth: pick(fund, stock, "revenue_growth_3y", "revenue_growth") ?? syn?.revenueGrowth,
    profitGrowth: pick(fund, stock, "profit_growth_3y", "profit_growth") ?? syn?.profitGrowth,
    rsi: syn?.rsi || null,
    scores: syn?.scores || {
      quality: null, valuation: null, growth: null,
      momentum: null, risk: null, health: null, riskAdjusted: null,
    },
    confidenceMeter: syn?.confidenceMeter || 50,
    timeline: syn?.timeline || [],
    whatChanged: syn?.whatChanged || [],
    sectorRelative: syn?.sectorRelative || [],
    description: syn?.description || "",
    companyProfile: {
      founded: syn?.founded || "",
      ceo: syn?.ceo || "",
      hq: syn?.hq || "",
      employees: syn?.employees || "",
      website: syn?.website || "",
      isin: syn?.isin || "",
      businessSegments: syn?.businessSegments || [],
    },
    priceHistory,
    financials: syn?.financials || {
      annual: { revenue: [], profit: [], ebitda: [] },
      quarterly: { revenue: [], profit: [], ebitda: [] },
    },
    shareholding: syn?.shareholding || [],
    shareholdings: syn?.shareholding || [],
    news: syn?.news || [],
    thesis: syn?.thesis || {
      thesis: "", bullCase: "", bearCase: "",
      whatToWatch: "", stance: "Needs review",
    },
    _dataSource: {
      price: "yahoo_realtime",
      fundamentals: hasFund ? "indianapi" : "estimated",
      priceHistory: "yahoo",
    },
  };

  CACHE.set(symbol, { data: payload, expiresAt: Date.now() + CACHE_TTL });
  res.setHeader("X-Cache", "MISS");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=300");
  return res.status(200).json(payload);
}
