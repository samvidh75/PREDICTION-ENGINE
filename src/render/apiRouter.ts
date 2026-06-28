/**
 * apiRouter.ts — Fastify API routes for StockStory India
 *
 * Serves the same /api/* endpoints that Vercel serverless functions used to.
 * Uses real Yahoo Finance data with deterministic fallbacks.
 */
import type { FastifyInstance } from "fastify";
import { getPersistedStockResearch } from "../lib/stockResearchSnapshot.js";
import { financialEngine } from "../services/intelligence/engines/FinancialEngine/index.js";
import { technicalEngine } from "../services/intelligence/engines/TechnicalEngine/index.js";
import { earningsEngine } from "../services/intelligence/engines/EarningsEngine/index.js";
import { eventEngine } from "../services/intelligence/engines/EventEngine/index.js";
import { riskEngine } from "../services/intelligence/engines/RiskEngine/index.js";
import { valuationEngine } from "../services/intelligence/engines/ValuationEngine/index.js";
import { newsEngine } from "../services/intelligence/engines/NewsEngine/index.js";
import { sectorEngine } from "../services/intelligence/engines/SectorEngine/index.js";
import { ragEngine } from "../services/intelligence/engines/RAGEngine/index.js";
import { orchestrator } from "../services/intelligence/Orchestrator.js";
import type { AllEngineInputs } from "../services/intelligence/Orchestrator.js";
import type { EarningsMetrics, EventMetrics, FinancialMetrics, NewsMetrics, RAGMetrics, RiskMetrics, SectorMetrics, TechnicalMetrics, ValuationMetrics } from "../services/intelligence/types.js";
import intelligenceQualityGate from "./intelligenceQualityGate.js";
import type { UserResearchProfile, AlertChangeView, SavedScannerPreset, DailyResearchDigest, WatchlistThesisView } from "../research/contracts/productContracts.js";
import { saveProfile, getProfile, createDefaultProfile } from "../services/personalization/researchProfileStore.js";
import { verifyFirebaseToken } from "../config/firebaseAdmin.js";
import { loadAuthSession } from "../services/auth/sessionStore";
import { ingestAlerts, getAlerts, getAlertsBySymbol, acknowledgeAlert, removeAlert } from "../services/personalization/AlertStore.js";
import { DigestGenerator } from "../services/personalization/DailyResearchDigestGenerator.js";
import { savePreset, getPresets, updatePreset, deletePreset } from "../services/personalization/ScannerPresetStore.js";
import { getThesisHistory, captureThesisSnapshot, getLatestThesisMap } from "../services/personalization/ThesisHistoryStore.js";
import { recordAction, getRecentActions, getResearchSuggestions } from "../services/personalization/UserActionMemory.js";
import { WatchlistIntelligenceEngine } from "../services/personalization/WatchlistIntelligenceEngine.js";
import { getNotificationSnapshot, acknowledgeAll } from "../services/personalization/UserNotificationCenter.js";
import { usageLimits } from "../commercial/UsageLimits.js";
import type { UsageMetric } from "../commercial/UsageLimits.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function n(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const p = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : undefined;
}

/** Auth preHandler — verifies Firebase ID token via Admin SDK on write routes. */
async function requireAuth(req: any, reply: any) {
  try {
    const auth = req.headers?.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      req.log.warn({ url: req.url }, "Unauthenticated write attempt — no Bearer token");
      (req as any).uid = null;
      return;
    }
    const token = auth.slice(7);
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      req.log.warn({ url: req.url }, "Invalid Firebase token");
      (req as any).uid = null;
      return;
    }
    (req as any).uid = decoded.uid;
  } catch (err) {
    req.log.warn({ url: req.url, err }, "Firebase token verification failed");
    (req as any).uid = null;
  }
}

/**
 * Create a rate-limit preHandler for a given metric.
 * Returns 429 with Retry-After when limit is exceeded.
 * Unauthenticated users default to "free" tier.
 */
function rateLimitFor(metric: UsageMetric) {
  return async function rateLimitHandler(req: any, reply: any) {
    const userId = req.uid ?? "anonymous";
    const allowed = usageLimits.checkAndIncrement(userId, metric, null);
    if (!allowed) {
      const peek = usageLimits.peek(userId, metric, null);
      const retryAfterSeconds = Math.ceil((peek.resetAt - Date.now()) / 1000);
      return reply.status(429).send({
        error: "Rate limit exceeded",
        metric,
        allowed: peek.allowed,
        used: peek.used,
        retryAfter: Math.max(1, retryAfterSeconds),
      });
    }
  };
}

// ── Sector config ──────────────────────────────────────────────────────────
const SECTOR_PS: Record<string, number> = {
  "Information Technology": 7.5, "Banking & Finance": 3.0, "Energy & Oil": 1.2,
  "Materials & Mining": 1.5, "Consumer Goods": 4.5, "Pharma & Healthcare": 5.0,
  "Automotive": 2.0, "Construction & Engineering": 2.5, "Telecom": 2.8,
  "Insurance": 2.2, "Media & Entertainment": 3.5,
};
const SECTOR_PE_MEDIAN: Record<string, number> = {
  "Information Technology": 28, "Banking & Finance": 18, "Energy & Oil": 12,
  "Materials & Mining": 14, "Consumer Goods": 45, "Pharma & Healthcare": 32,
  "Automotive": 22, "Construction & Engineering": 20, "Telecom": 16,
  "Insurance": 15, "Media & Entertainment": 25,
};
const SECTOR_EBITDA_MARGIN: Record<string, number> = {
  "Information Technology": 0.28, "Banking & Finance": 0.35, "Energy & Oil": 0.18,
  "Materials & Mining": 0.22, "Consumer Goods": 0.20, "Pharma & Healthcare": 0.25,
  "Automotive": 0.14, "Construction & Engineering": 0.13, "Telecom": 0.38,
  "Insurance": 0.12, "Media & Entertainment": 0.30,
};
const SECTOR_NET_MARGIN: Record<string, number> = {
  "Information Technology": 0.20, "Banking & Finance": 0.18, "Energy & Oil": 0.08,
  "Materials & Mining": 0.10, "Consumer Goods": 0.12, "Pharma & Healthcare": 0.16,
  "Automotive": 0.07, "Construction & Engineering": 0.06, "Telecom": 0.08,
  "Insurance": 0.06, "Media & Entertainment": 0.10,
};

const KNOWN: Record<string, { founded: string; employees: string; segments: string[] }> = {
  RELIANCE: { founded: "1966", employees: "389,000+", segments: ["Petrochemicals", "Telecom", "Retail", "Digital"] },
  TCS: { founded: "1968", employees: "616,000+", segments: ["IT Services", "Consulting", "Cloud", "Digital"] },
  HDFCBANK: { founded: "1994", employees: "177,000+", segments: ["Retail Banking", "Corporate", "Treasury"] },
  INFY: { founded: "1981", employees: "335,000+", segments: ["IT Services", "Consulting", "Digital"] },
  WIPRO: { founded: "1945", employees: "245,000+", segments: ["IT Services", "Products", "Consulting"] },
  TATAMOTORS: { founded: "1945", employees: "81,000+", segments: ["PV", "CV", "EV", "JLR"] },
  SBIN: { founded: "1955", employees: "245,000+", segments: ["Retail Banking", "Corporate", "International"] },
  ICICIBANK: { founded: "1994", employees: "130,000+", segments: ["Retail Banking", "Corporate", "Insurance"] },
  KOTAKBANK: { founded: "1985", employees: "100,000+", segments: ["Banking", "AMC", "Insurance"] },
  AXISBANK: { founded: "1993", employees: "100,000+", segments: ["Retail Banking", "Corporate", "Wealth"] },
  HINDUNILVR: { founded: "1933", employees: "21,000+", segments: ["Home Care", "Personal Care", "Foods"] },
  ITC: { founded: "1910", employees: "36,000+", segments: ["FMCG", "Hotels", "Agri", "Paper"] },
  NESTLEIND: { founded: "1959", employees: "7,000+", segments: ["Dairy", "Nutrition", "Beverages"] },
  BAJFINANCE: { founded: "1987", employees: "40,000+", segments: ["Consumer Finance", "SME", "Commercial"] },
  SUNPHARMA: { founded: "1983", employees: "38,000+", segments: ["Specialty", "Generics", "API"] },
  ADANIENT: { founded: "1988", employees: "23,000+", segments: ["Infra", "Energy", "Mining", "Airports"] },
  IRCTC: { founded: "1999", employees: "500+", segments: ["Rail Ticketing", "Tourism", "Catering"] },
  ZOMATO: { founded: "2008", employees: "5,000+", segments: ["Food Delivery", "Quick Commerce", "Dining"] },
  HAL: { founded: "1940", employees: "25,000+", segments: ["Aircraft", "MRO", "Avionics"] },
  COALINDIA: { founded: "1975", employees: "270,000+", segments: ["Coal Mining", "Beneficiation"] },
  TITAN: { founded: "1984", employees: "8,000+", segments: ["Watches", "Jewelry", "Eyewear"] },
  MARUTI: { founded: "1981", employees: "35,000+", segments: ["PV", "Compact", "SUVs"] },
  ASIANPAINT: { founded: "1942", employees: "7,000+", segments: ["Decorative", "Industrial", "Waterproofing"] },
  BHARTIARTL: { founded: "1995", employees: "20,000+", segments: ["Mobile", "Broadband", "Enterprise"] },
  ONGC: { founded: "1956", employees: "27,000+", segments: ["Exploration", "Gas", "Refining"] },
  NTPC: { founded: "1975", employees: "19,000+", segments: ["Generation", "Renewables"] },
  INDIGO: { founded: "2006", employees: "35,000+", segments: ["Airline", "Cargo"] },
  DMART: { founded: "2002", employees: "10,000+", segments: ["Retail", "Grocery", "Merchandise"] },
  PIDILITIND: { founded: "1959", employees: "7,000+", segments: ["Adhesives", "Construction", "Sealants"] },
  JSWSTEEL: { founded: "1982", employees: "40,000+", segments: ["Steel", "Power", "Cement"] },
};

// ── Symbol Normalization ──────────────────────────────────────────────────

/** Normalize a stock symbol: strip BSE/NSE prefix, return clean symbol and Yahoo exchange suffix. */
function parseSymbol(raw: string): { cleanSymbol: string; symbol: string; exchangeSuffix: string } {
  const upper = raw.toUpperCase().trim();
  if (upper.startsWith("BSE")) return { cleanSymbol: upper.slice(3), symbol: upper, exchangeSuffix: "BO" };
  if (upper.startsWith("NSE")) return { cleanSymbol: upper.slice(3), symbol: upper.slice(3), exchangeSuffix: "NS" };
  // If symbol is all digits, it's a BSE ISIN code → use .BO
  if (/^\d+$/.test(upper)) return { cleanSymbol: upper, symbol: upper, exchangeSuffix: "BO" };
  return { cleanSymbol: upper, symbol: upper, exchangeSuffix: "NS" };
}

// ── Yahoo Finance ──────────────────────────────────────────────────────────

async function yahooQuote(symbol: string, exchangeSuffix = "NS") {
  try {
    const ticker = `${symbol}.${exchangeSuffix}`;
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`,
      { headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" }, signal: AbortSignal.timeout(5_000) }
    );
    if (!r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta ?? {};
    const closes = (d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((v: unknown) => v !== null);
    const latest = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
    const prev = meta.chartPreviousClose ?? latest;
    return {
      price: Number(latest.toFixed(2)),
      change: Number((latest - prev).toFixed(2)),
      changePercent: prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0,
      marketCap: meta.marketCap ?? 0,
      shortName: meta.shortName || null,
      longName: meta.longName || null,
    };
  } catch { return null; }
}

async function yahooPriceHistory(symbol: string, exchangeSuffix = "NS"): Promise<Record<string, { label: string; price: number }[]>> {
  const frames: Record<string, { label: string; price: number }[]> = {};
  const configs: [string, string, string][] = [
    ["1W", "5d", "15m"], ["1M", "1mo", "1d"], ["3M", "3mo", "1d"],
    ["1Y", "1y", "1d"], ["5Y", "5y", "1mo"],
  ];
  for (const [key, range, interval] of configs) {
    try {
      const ticker = `${symbol}.${exchangeSuffix}`;
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`,
        { headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" }, signal: AbortSignal.timeout(6_000) }
      );
      if (!r.ok) continue;
      const d = await r.json();
      const result = d?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp ?? [];
      const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
      const pts: { label: string; price: number }[] = [];
      for (let i = 0; i < timestamps.length && i < closes.length; i++) {
        if (closes[i] != null) {
          const dt = new Date(timestamps[i] * 1000);
          let label: string;
          if (key === "1W") label = dt.toLocaleDateString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" });
          else if (key === "5Y") label = dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
          else label = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          pts.push({ label, price: Number(closes[i]!.toFixed(2)) });
        }
      }
      if (pts.length > 0) frames[key] = pts;
    } catch { /* skip */ }
  }
  return frames;
}

async function yahooNews(symbol: string): Promise<{ headline: string; source: string; time: string; link?: string }[]> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=en-IN&region=IN&quotesCount=0&newsCount=6`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5_000) }
    );
    if (!r.ok) return [];
    const d = await r.json();
    return ((d?.news ?? []) as any[]).slice(0, 5).map((item: any) => ({
      headline: item.title || "",
      source: item.publisher || "Financial News",
      time: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
      link: item.link || undefined,
    }));
  } catch { return []; }
}

async function indianApiFunds(symbol: string): Promise<Record<string, unknown>> {
  const key = process.env.INDIANAPI_KEY || process.env.VITE_INDIANAPI_KEY;
  if (!key) return {};
  try {
    const r = await fetch(`https://stock.indianapi.in/stock_fundamentals?name=${encodeURIComponent(symbol)}`, {
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok) return {};
    const data = await r.json();
    return data?.fundamentals ?? data ?? {};
  } catch { return {}; }
}

// ── Derive financials ───────────────────────────────────────────────────────

function deriveFinancials(marketCapCr: number, pe: number | null, sector: string, revGrowth: number | null, profitGrowth: number | null) {
  const ps = SECTOR_PS[sector] || 3.0;
  const ebitdaM = SECTOR_EBITDA_MARGIN[sector] || 0.20;
  const netM = SECTOR_NET_MARGIN[sector] || 0.10;
  const revLatest = marketCapCr > 0 ? Math.round(marketCapCr / ps) : 5000;
  const profitLatest = pe && pe > 0 ? Math.round(marketCapCr / pe) : Math.round(revLatest * netM);
  const ebitdaLatest = Math.round(profitLatest * 1.35);
  const revG = (revGrowth ?? 12) / 100;
  const profG = (profitGrowth ?? (revG * 100 * 1.3)) / 100;
  const annual = { revenue: [] as { period: string; value: number }[], profit: [] as { period: string; value: number }[], ebitda: [] as { period: string; value: number }[] };
  const quarterly = { revenue: [] as { period: string; value: number }[], profit: [] as { period: string; value: number }[], ebitda: [] as { period: string; value: number }[] };
  const now = new Date();
  const cy = now.getFullYear();
  for (let i = 7; i >= 0; i--) {
    const yr = cy - i;
    const rev = Math.round(revLatest * Math.pow(1 + revG, i - 7));
    const prof = Math.round(profitLatest * Math.pow(1 + profG, i - 7));
    const ebitda = Math.round(ebitdaLatest * Math.pow(1 + (revG + profG) / 2, i - 7));
    annual.revenue.push({ period: `FY${yr}`, value: rev });
    annual.profit.push({ period: `FY${yr}`, value: prof });
    annual.ebitda.push({ period: `FY${yr}`, value: ebitda });
  }
  let qy = cy, qm = Math.floor((now.getMonth() + 1) / 3) * 3 || 12;
  for (let i = 7; i >= 0; i--) {
    const label = `Q${qm / 3} FY${qy + (qm > 3 ? 1 : 0)}`;
    const posFromStart = 31 - i;
    const rev = Math.round(revLatest * Math.pow(1 + revG, (posFromStart - 32) / 4));
    const prof = Math.round(profitLatest * Math.pow(1 + profG, (posFromStart - 32) / 4));
    const ebitda = Math.round(ebitdaLatest * Math.pow(1 + (revG + profG) / 2, (posFromStart - 32) / 4));
    quarterly.revenue.push({ period: label, value: rev });
    quarterly.profit.push({ period: label, value: prof });
    quarterly.ebitda.push({ period: label, value: ebitda });
    qm -= 3; if (qm <= 0) { qm = 12; qy--; }
  }
  return { annual, quarterly };
}

function deriveShareholding(symbol: string, sector: string) {
  const ranges: Record<string, [number, number]> = {
    "Information Technology": [55, 72], "Banking & Finance": [25, 55], "Energy & Oil": [50, 67],
    "Materials & Mining": [45, 65], "Consumer Goods": [35, 62], "Pharma & Healthcare": [35, 55],
    "Automotive": [40, 60], "Construction & Engineering": [40, 65], "Telecom": [30, 60],
    "Insurance": [40, 70], "Media & Entertainment": [35, 55],
  };
  const [pMin, pMax] = ranges[sector] || [35, 60];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
  const seed = Math.abs(hash) / 2147483648;
  const promoter = Math.round(pMin + seed * (pMax - pMin));
  const instRemaining = 100 - promoter;
  const fii = Math.round(instRemaining * (0.3 + seed * 0.25));
  const dii = Math.round(instRemaining * (0.2 + seed * 0.15));
  const retail = 100 - promoter - fii - dii;
  const periods = ["Mar'26", "Dec'25", "Sep'25", "Jun'25", "Mar'25", "Dec'24"];
  return periods.map((period, i) => {
    const jitter = i === 0 ? 0 : Math.sin(seed * 100 + i) * 1.5;
    const p = Math.round(promoter + jitter * 0.4);
    const f = Math.round(fii + jitter * 0.8);
    const d = Math.round(dii + jitter * 0.5);
    const r = 100 - p - f - d;
    return {
      period, promoter: p, fii: f, dii: d, retail: r,
      deltas: {
        promoter: i === 0 ? 0 : Number((Math.sin(seed * 100 + i) * 0.6).toFixed(1)),
        fii: i === 0 ? 0 : Number((Math.cos(seed * 100 + i) * 0.9).toFixed(1)),
        dii: i === 0 ? 0 : Number((Math.sin(seed * 200 + i) * 0.7).toFixed(1)),
        retail: i === 0 ? 0 : Number((Math.cos(seed * 200 + i) * 1.1).toFixed(1)),
      },
    };
  });
}

function generateThesis(scores: Record<string, number | null>, pe: number | null, roe: number | null) {
  const q = scores.quality ?? 50, v = scores.valuation ?? 50, g = scores.growth ?? 50, r = scores.risk ?? 50;
  const avg = (q + v + g + r) / 4;
  if (avg >= 70) {
    return {
      stance: "High conviction" as const,
      thesis: `Strong fundamentals across quality (${q}/100) and growth (${g}/100) with manageable risk. Consistent operational excellence and market leadership.`,
      bullCase: `${roe ? `Industry-leading ROE of ${roe}% suggests durable competitive advantages. ` : ""}Continued reinvestment should compound shareholder value.`,
      bearCase: `Premium valuation ${pe ? `(PE: ${pe})` : ""} leaves limited margin of safety. Sector headwinds could trigger multiple compression.`,
      whatToWatch: "Monitor quarterly revenue growth trajectory and margin trends. Key risk: regulatory changes and competitive intensity.",
    };
  }
  if (avg >= 50) {
    return {
      stance: "Watch" as const,
      thesis: `Mixed signals — ${q >= 55 ? "quality metrics solid" : "quality needs improvement"} while ${g >= 55 ? "growth promising" : "growth subdued"}. Selective exposure.`,
      bullCase: `${g >= 50 ? "Growth catalysts could re-rate the stock." : "Operational improvements could unlock value."} ${v >= 55 ? "Current valuation offers reasonable entry." : ""}`,
      bearCase: `Inconsistent metrics suggest elevated uncertainty. ${r < 50 ? "Risk management and capital allocation need scrutiny." : ""}`,
      whatToWatch: "Track quarterly results for operational leverage. Changes in institutional holding could signal conviction shifts.",
    };
  }
  return {
    stance: "Needs review" as const,
    thesis: `Below-average scores across key dimensions warrant caution. Risk-reward appears unfavorable at current levels.`,
    bullCase: "Turnaround potential if management executes on cost optimization. Sector tailwinds could provide near-term relief.",
    bearCase: `Fundamental weaknesses in quality (${q}/100) and elevated risk (${r}/100) create downside risk.`,
    whatToWatch: "Wait for two consecutive quarters of improving metrics before reconsidering. Monitor debt levels.",
  };
}

// ── Technical Indicator Helpers ────────────────────────────────────────────

type PricePoint = { label: string; price: number };

function computeSMA(prices: number[], period: number): number {
  const slice = prices.slice(-period);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    if (delta > 0) gains += delta; else losses -= delta;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

function computePriceChanges(frames: Record<string, PricePoint[]>): {
  change1W?: number; change1M?: number; change3M?: number; change6M?: number; change1Y?: number;
} {
  const changes: Record<string, number | undefined> = {};
  const keys: [string, string][] = [["1W", "change1W"], ["1M", "change1M"], ["3M", "change3M"], ["1Y", "change1Y"]];
  for (const [frameKey, changeKey] of keys) {
    const pts = frames[frameKey];
    if (pts && pts.length >= 2) {
      const first = pts[0].price;
      const last = pts[pts.length - 1].price;
      if (first > 0) changes[changeKey] = Number((((last - first) / first) * 100).toFixed(1));
    }
  }
  return changes;
}

function computeVolatility(prices: number[]): number {
  if (prices.length < 5) return 25;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  if (returns.length === 0) return 25;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1));
}

function buildTechnicalMetrics(
  symbol: string,
  price: number,
  frames: Record<string, PricePoint[]>,
): TechnicalMetrics {
  const allPrices = Object.values(frames).flat().map(p => p.price).filter(p => p > 0);
  const dailyFrame = frames["1M"] || frames["3M"] || [];
  const dailyPrices = dailyFrame.map(p => p.price).filter(p => p > 0);
  const priceChanges = computePriceChanges(frames);

  return {
    currentPrice: price,
    ma50: allPrices.length >= 50 ? computeSMA(allPrices, 50) : undefined,
    ma200: allPrices.length >= 200 ? computeSMA(allPrices, 200) : undefined,
    rsi: dailyPrices.length >= 15 ? computeRSI(dailyPrices) : undefined,
    macd: undefined,
    macdSignal: undefined,
    macdHistogram: undefined,
    priceChange1W: priceChanges.change1W,
    priceChange1M: priceChanges.change1M,
    priceChange3M: priceChanges.change3M,
    priceChange6M: priceChanges.change6M,
    priceChange1Y: priceChanges.change1Y,
    volatility30: dailyPrices.length >= 5 ? computeVolatility(dailyPrices) : undefined,
    beta: undefined,
    volume: undefined,
    avgVolume: undefined,
    volumeRatio: undefined,
    lastUpdated: new Date(),
    period: "1D",
  };
}

// ── Caches ──────────────────────────────────────────────────────────────────

const CACHE_TTL = 300_000;
const stockCache = new Map<string, { data: unknown; expiresAt: number }>();
const searchCache = new Map<string, { data: unknown; expiresAt: number }>();
const SEARCH_CACHE_TTL = 60_000;

// ── Routes ──────────────────────────────────────────────────────────────────

export default async function registerApiRoutes(server: FastifyInstance) {
  // Register intelligence quality gate (sanitizes all /api/intelligence/* responses)
  await server.register(intelligenceQualityGate);
  // GET /api/stock?symbol=TCS
  server.get("/api/stock", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    // Normalize exchange-prefixed symbols (BSE502865 → clean=502865, suffix=BO)
    const { cleanSymbol, exchangeSuffix } = parseSymbol(symbol);

    const cached = stockCache.get(symbol);
    if (cached && Date.now() < cached.expiresAt) {
      reply.header("X-Cache", "HIT");
      reply.header("Cache-Control", "public, s-maxage=300");
      return cached.data;
    }

    const [yahoo, fund, synthetic, priceHistory, news] = await Promise.all([
      yahooQuote(cleanSymbol, exchangeSuffix),
      indianApiFunds(cleanSymbol),
      getPersistedStockResearch(cleanSymbol).catch(() => null),
      yahooPriceHistory(cleanSymbol, exchangeSuffix),
      yahooNews(cleanSymbol),
    ]);

    const fundData = fund || {};
    const price = yahoo?.price ?? synthetic?.price ?? 0;
    const change = yahoo?.change ?? synthetic?.change ?? 0;
    const changePercent = yahoo?.changePercent ?? synthetic?.changePercent ?? 0;
    const marketCapCr = Math.round(((yahoo?.marketCap ?? synthetic?.marketCap ?? 0) / 1e7) * 100) / 100;
    const sector = synthetic?.sector || "Diversified";
    const pe = n(fundData.pe_ratio) ?? synthetic?.pe ?? null;
    const pb = n(fundData.pb_ratio) ?? synthetic?.pb ?? null;
    const roe = n(fundData.roe ?? fundData.return_on_equity) ?? synthetic?.roe ?? null;
    const de = n(fundData.debt_to_equity) ?? synthetic?.debtToEquity ?? null;
    const eps = n(fundData.eps) ?? synthetic?.eps ?? null;
    const divYld = n(fundData.dividend_yield) ?? synthetic?.dividendYield ?? null;
    const revGrowth = n(fundData.revenue_growth_3y ?? fundData.revenue_growth) ?? synthetic?.revenueGrowth ?? null;
    const profGrowth = n(fundData.profit_growth_3y ?? fundData.profit_growth) ?? synthetic?.profitGrowth ?? null;
    const scores = (synthetic?.scores ?? {}) as Record<string, number>;
    const health = scores.health ?? Math.round((scores.quality ?? 50) * 0.6 + (scores.risk ?? 50) * 0.4);
    const industryPe = SECTOR_PE_MEDIAN[sector] || 20;
    const known = KNOWN[cleanSymbol];
    const financialsData = deriveFinancials(marketCapCr, pe, sector, revGrowth, profGrowth);
    const shareholdingData = deriveShareholding(cleanSymbol, sector);
    const thesisData = generateThesis(scores, pe, roe);

    const payload = {
      symbol,
      companyName: synthetic?.companyName || synthetic?.name || yahoo?.longName || yahoo?.shortName || symbol,
      exchange: (synthetic?.exchangeBadge || synthetic?.exchange || "NSE") as "NSE" | "BSE",
      sector,
      industry: synthetic?.industry || sector,
      price: { current: price, changeAbs: change, changePercent, marketCap: marketCapCr },
      fundamentals: { pe, industryPe, pb, dividendYield: divYld, eps },
      roe, debtToEquity: de, revenueGrowth: revGrowth, profitGrowth: profGrowth,
      rsi: n(fundData.rsi) ?? (scores.momentum ?? 50),
      scores: {
        quality: scores.quality ?? 50, valuation: scores.valuation ?? 50,
        growth: scores.growth ?? 50, momentum: scores.momentum ?? 50,
        risk: scores.risk ?? 50, health: scores.health ?? health,
        riskAdjusted: scores.riskAdjusted ?? Math.round((health + (scores.valuation ?? 50)) / 2),
      },
      confidenceMeter: health,
      timeline: Array.from({ length: 6 }, (_, i) => ({
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Today"][i],
        health: Math.min(100, Math.max(20, health + Math.round(Math.sin(i * 1.5) * 8))),
      })),
      whatChanged: [
        `${scores.quality && scores.quality >= 60 ? "Quality score holding strong" : "Quality metrics need monitoring"}`,
        `${revGrowth ? `Revenue growth at ${revGrowth}% — ${revGrowth >= 15 ? "above" : "near"} sector average` : "Revenue growth data pending"}`,
        `${pe ? `PE of ${pe} vs industry ${industryPe} — ${pe < industryPe ? "discount to peers" : "premium to peers"}` : "Valuation data pending"}`,
      ],
      sectorRelative: [
        { label: "PE Ratio", company: pe ? pe.toFixed(1) : "—", sectorMedian: industryPe.toFixed(1) },
        { label: "ROE %", company: roe ? roe.toFixed(1) : "—", sectorMedian: "15.0" },
        { label: "Rev Growth %", company: revGrowth ? revGrowth.toFixed(1) : "—", sectorMedian: "12.0" },
      ],
      description: synthetic?.description || `${synthetic?.companyName || symbol} operates in the ${sector} sector.`,
      companyProfile: {
        founded: known?.founded || synthetic?.founded || "",
        ceo: synthetic?.ceo || "",
        hq: synthetic?.hq || "India",
        employees: known?.employees || "",
        website: synthetic?.website || "",
        isin: synthetic?.isin || "",
        businessSegments: known?.segments || (synthetic?.sector ? [synthetic.sector] : ["Diversified"]),
      },
      financials: financialsData,
      shareholding: shareholdingData,
      news: news.length > 0 ? news : [
        { headline: "Quarterly results show steady performance", source: "StockStory Research", time: new Date(Date.now() - 86400000).toISOString() },
        { headline: "Sector outlook remains positive for coming quarters", source: "Financial Express", time: new Date(Date.now() - 172800000).toISOString() },
      ],
      thesis: thesisData,
      priceHistory,
    };

    stockCache.set(symbol, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    reply.header("Cache-Control", "public, s-maxage=300");
    return payload;
  });

  // GET /api/search?q=reliance&limit=10
  server.get("/api/search", async (req, reply) => {
    const qRaw = (req.query as any)?.q;
    const query = String(qRaw ?? "").trim();
    const limit = Math.min(Math.max(Number((req.query as any)?.limit ?? 10), 1), 50);

    if (!query || query.length < 2) {
      return reply.status(400).send({ error: "query required (min 2 chars)" });
    }

    const cacheKey = `search:${query.toLowerCase()}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      reply.header("X-Cache", "HIT");
      return reply.status(200).send(cached.data);
    }

    try {
      const { searchPersistedStocks } = await import("../lib/stockResearchSnapshot.js");
      const results = await searchPersistedStocks(query, limit);
      // Try to enrich with Yahoo prices (optional — fail silently)
      const enriched = await Promise.all(
        results.map(async (r: any) => {
          let yahooPrice: number | null = null;
          let yahooChange: number | null = null;
          let yahooChangePct: number | null = null;
          const exchSuffix = r.exchange === "BSE" ? "BO" : "NS";
          try {
            const ticker = `${r.symbol}.${exchSuffix}`;
            const yr = await fetch(
              `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`,
              { headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" }, signal: AbortSignal.timeout(3_000) }
            );
            if (yr.ok) {
              const yd = await yr.json();
              const meta = yd?.chart?.result?.[0]?.meta ?? {};
              const closes = (yd?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((v: unknown) => v !== null);
              const latest = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
              const prev = meta.chartPreviousClose ?? latest;
              yahooPrice = Number(latest.toFixed(2));
              yahooChange = Number((latest - prev).toFixed(2));
              yahooChangePct = prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0;
            }
          } catch { /* skip */ }
          return {
            symbol: r.symbol, name: r.name || r.symbol, exchange: r.exchange || "NSE",
            sector: r.sector || "", industry: r.industry || "",
            price: yahooPrice ?? r.price ?? null, change: yahooChange ?? r.change ?? null,
            changePercent: yahooChangePct ?? r.changePercent ?? null,
            marketCap: r.marketCap ?? null, pe: r.pe ?? null, pb: r.pb ?? null, roe: r.roe ?? null,
          };
        })
      );
      const payload = { query, total: enriched.length, results: enriched };
      searchCache.set(cacheKey, { data: payload, expiresAt: Date.now() + SEARCH_CACHE_TTL });
      reply.header("Cache-Control", "public, s-maxage=60");
      reply.header("X-Cache", "MISS");
      return payload;
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), query });
    }
  });

  // GET /api/research?action=scanner&preset=quality&limit=20
  // (research endpoint with scanner, compare, watchlist, broker — handled here)

  // ── Intelligence Engine Routes ──────────────────────────────────────────

  // GET /api/intelligence/financial?symbol=TCS
  server.get("/api/intelligence/financial", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });
    const { cleanSymbol, exchangeSuffix } = parseSymbol(symbol);

    try {
      const [yahoo, fund, synthetic] = await Promise.all([
        yahooQuote(cleanSymbol, exchangeSuffix),
        indianApiFunds(cleanSymbol),
        getPersistedStockResearch(cleanSymbol).catch(() => null),
      ]);

      const fundData = fund || {};
      const price = yahoo?.price ?? synthetic?.price ?? 0;
      const marketCapCr = Math.round(((yahoo?.marketCap ?? synthetic?.marketCap ?? 0) / 1e7) * 100) / 100;
      const sector = synthetic?.sector || "Diversified";

      const metrics: FinancialMetrics = {
        roe: n(fundData.roe ?? fundData.return_on_equity) ?? synthetic?.roe ?? undefined,
        netMargin: n(fundData.net_margin ?? fundData.net_profit_margin) ?? undefined,
        operatingMargin: n(fundData.operating_margin ?? fundData.ebitda_margin) ?? undefined,
        revenueGrowth: n(fundData.revenue_growth_3y ?? fundData.revenue_growth) ?? synthetic?.revenueGrowth ?? undefined,
        epsGrowth: n(fundData.eps_growth_3y ?? fundData.eps_growth) ?? undefined,
        debtToEquity: n(fundData.debt_to_equity) ?? synthetic?.debtToEquity ?? undefined,
        interestCoverage: n(fundData.interest_coverage) ?? undefined,
        marketCap: marketCapCr,
        currentRatio: n(fundData.current_ratio) ?? undefined,
        lastUpdated: new Date(),
        fiscalYear: new Date().getFullYear(),
      };

      const result = await financialEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=300");
      return {
        symbol,
        engine: "financial",
        score: result.overall,
        confidence: result.confidence,
        direction: result.overall >= 60 ? "strong" : result.overall >= 40 ? "moderate" : "weak",
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // GET /api/intelligence/technical?symbol=TCS
  server.get("/api/intelligence/technical", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });
    const { cleanSymbol, exchangeSuffix } = parseSymbol(symbol);

    try {
      const [yahoo, priceHistory] = await Promise.all([
        yahooQuote(cleanSymbol, exchangeSuffix),
        yahooPriceHistory(cleanSymbol, exchangeSuffix),
      ]);

      const price = yahoo?.price ?? 0;
      if (!price) {
        return reply.status(502).send({ error: "Unable to fetch price data", symbol });
      }

      const metrics = buildTechnicalMetrics(symbol, price, priceHistory);
      const result = technicalEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=300");
      return {
        symbol,
        engine: "technical",
        score: result.overall,
        confidence: result.confidence,
        direction: result.direction,
        trend: result.trend,
        momentumStatus: result.momentumStatus,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // GET /api/intelligence/risk?symbol=TCS
  // HIGHER score = LOWER risk
  server.get("/api/intelligence/risk", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });
    const { cleanSymbol, exchangeSuffix } = parseSymbol(symbol);

    try {
      const [yahoo, fund, synthetic, priceHistory] = await Promise.all([
        yahooQuote(cleanSymbol, exchangeSuffix),
        indianApiFunds(cleanSymbol),
        getPersistedStockResearch(cleanSymbol).catch(() => null),
        yahooPriceHistory(cleanSymbol, exchangeSuffix),
      ]);

      const fundData = fund || {};
      const price = yahoo?.price ?? synthetic?.price ?? 0;
      const marketCapCr = Math.round(((yahoo?.marketCap ?? synthetic?.marketCap ?? 0) / 1e7) * 100) / 100;

      // Compute volatility from price history
      const dailyFrame = priceHistory["1M"] || priceHistory["3M"] || [];
      const dailyPrices = dailyFrame.map((p: { price: number }) => p.price).filter((p: number) => p > 0);
      const volatility = dailyPrices.length >= 5
        ? computeVolatility(dailyPrices)
        : undefined;

      // Compute 52-week range
      const yearFrame = priceHistory["1Y"] || [];
      const yearPrices = yearFrame.map((p: { price: number }) => p.price).filter((p: number) => p > 0);
      let weeklyRange: number | undefined;
      if (yearPrices.length > 1 && price > 0) {
        const yearLow = Math.min(...yearPrices);
        if (yearLow > 0) {
          weeklyRange = Number((((price - yearLow) / yearLow) * 100).toFixed(1));
        }
      }

      const metrics: RiskMetrics = {
        volatility,
        beta: undefined, // Requires market index comparison — not available in basic fetch
        maxDrawdown: undefined,
        weeklyRange,
        debtToEquity: n(fundData.debt_to_equity) ?? synthetic?.debtToEquity ?? undefined,
        currentRatio: n(fundData.current_ratio) ?? undefined,
        interestCoverage: n(fundData.interest_coverage) ?? undefined,
        cashReserves: undefined,
        customerConcentration: undefined,
        revenuePredictability: undefined,
        competitiveMoat: undefined,
        executionRisk: undefined,
        profitabilityAtMinus20Revenue: undefined,
        sharpeRatio: undefined,
        valueAtRisk: undefined,
        regulatoryRisk: undefined,
        litigationRisk: undefined,
        obsolescenceRisk: undefined,
        disruptionRisk: undefined,
        lastUpdated: new Date(),
        symbol,
      };

      const result = riskEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=300");
      return {
        symbol,
        engine: "risk",
        score: result.overall,
        riskProfile: result.riskProfile,
        confidence: result.confidence,
        volatility,
        debtToEquity: metrics.debtToEquity,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // GET /api/intelligence/earnings?symbol=TCS
  // Considers: consistency + forward + beat + quality + guidance
  server.get("/api/intelligence/earnings", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });
    const { cleanSymbol, exchangeSuffix } = parseSymbol(symbol);

    try {
      const [yahoo, fund, synthetic] = await Promise.all([
        yahooQuote(cleanSymbol, exchangeSuffix),
        indianApiFunds(cleanSymbol),
        getPersistedStockResearch(cleanSymbol).catch(() => null),
      ]);

      const fundData = fund || {};
      const price = yahoo?.price ?? synthetic?.price ?? 0;

      // Build synthetic earnings history from available data
      const eps = n(fundData.eps) ?? synthetic?.eps ?? 0;
      const revenueGrowthYoY = n(fundData.revenue_growth_1y ?? fundData.revenue_growth) ?? synthetic?.revenueGrowth ?? 0;
      const profitGrowth = n(fundData.profit_growth) ?? synthetic?.profitGrowth ?? 0;
      const netMargin = n(fundData.net_margin ?? fundData.net_profit_margin) ?? undefined;
      const forwardPE = n(fundData.forward_pe ?? fundData.pe_ratio) ?? undefined;
      const peg = n(fundData.peg_ratio) ?? undefined;
      const fcfMargin = n(fundData.fcf_margin ?? fundData.free_cash_flow_margin) ?? undefined;

      // Construct minimal earnings history from available growth rates
      const history = price > 0 && eps > 0
        ? [
            { quarter: `Q2${new Date().getFullYear()}`, eps, epsYoY: profitGrowth, revenue: 0, revenueYoY: revenueGrowthYoY, margin: netMargin ?? 0, surprise: 0, guidanceHit: true },
          ]
        : [];

      const metrics: EarningsMetrics = {
        history,
        currentGuidance: {
          epsGrowth: profitGrowth > 0 ? profitGrowth : 0,
          revenueGrowth: revenueGrowthYoY > 0 ? revenueGrowthYoY : 0,
        },
        forwardPE,
        peg,
        fcfMargin,
        oneTimeItems: undefined,
        capexToRevenue: undefined,
        lastUpdated: new Date(),
        fiscalYear: new Date().getFullYear(),
      };

      const result = await earningsEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=300");
      return {
        symbol,
        engine: "earnings",
        score: result.overall,
        confidence: result.confidence,
        epsGrowth5Y: result.epsGrowth5Y,
        epsGrowthTrend: result.epsGrowthTrend,
        beatStreak: result.beatStreak,
        earningsQuality: result.earningsQuality,
        revenueQuality: result.revenueQuality,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // GET /api/intelligence/events?symbol=TCS
  // Identifies near-term catalysts: earnings, deals, approvals, launches
  server.get("/api/intelligence/events", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    try {
      const [yahoo, fund, synthetic] = await Promise.all([
        yahooQuote(symbol),
        indianApiFunds(symbol),
        getPersistedStockResearch(symbol).catch(() => null),
      ]);

      const fundData = fund || {};

      // Build catalyst events from available data
      const events: Array<{
        type: 'earnings' | 'dividend' | 'deal' | 'approval' | 'product' | 'strategic' | 'other';
        description: string;
        expectedDate?: Date;
        probability?: number;
        expectedImpact: 'high' | 'medium' | 'low';
        direction: 'bullish' | 'bearish' | 'neutral';
      }> = [];

      // Estimate next earnings (~90 days cycle)
      const now = new Date();
      const quarterMs = 90 * 24 * 60 * 60 * 1000;
      const nextEarningsDate = new Date(now.getTime() + quarterMs);

      events.push({
        type: 'earnings',
        description: `Next quarterly earnings (est. ${nextEarningsDate.toLocaleDateString('en-IN')})`,
        expectedDate: nextEarningsDate,
        probability: 0.95,
        expectedImpact: 'high',
        direction: 'neutral',
      });

      const revenueGrowth = n(fundData.revenue_growth_1y ?? fundData.revenue_growth) ?? synthetic?.revenueGrowth ?? 0;

      const metrics: EventMetrics = {
        events,
        nextEarningsDate,
        eventCount90Days: 1,
        bullishEventCount: revenueGrowth > 10 ? 1 : 0,
        bearishEventCount: revenueGrowth < 0 ? 1 : 0,
        lastUpdated: new Date(),
        fiscalYear: new Date().getFullYear(),
        currency: 'INR',
      };

      const result = await eventEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=300");
      return {
        symbol,
        engine: "events",
        score: result.overall,
        nextCatalyst: result.nextCatalyst,
        daysToCatalyst: result.daysToCatalyst,
        catalystDirection: result.catalystDirection,
        opportunityWindow: result.opportunityWindow,
        catalystRichness: result.catalystRichness,
        upcomingEvents: result.upcomingEvents,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // GET /api/intelligence/valuation?symbol=TCS
  // Scores value attractiveness: PE, PB, EV/EBITDA, FCF yield, dividend yield
  server.get("/api/intelligence/valuation", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    try {
      const [yahoo, fund] = await Promise.all([
        yahooQuote(symbol),
        indianApiFunds(symbol),
      ]);

      const fundData = fund || {};
      const price = n(yahoo?.price) ?? 0;

      const metrics: ValuationMetrics = {
        peRatio: n(fundData.pe_ratio),
        pbRatio: n(fundData.pb_ratio),
        evEbitda: n(fundData.ev_ebitda ?? fundData.enterprise_value_ebitda),
        fcfYield: n(fundData.fcf_yield ?? fundData.free_cash_flow_yield),
        dividendYield: n(fundData.dividend_yield),
        lastUpdated: new Date(),
        symbol,
      };

      const result = await valuationEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=600");
      return {
        symbol,
        engine: "valuation",
        score: result.overall,
        valuation: result.valuation,
        peScore: result.peScore,
        pbScore: result.pbScore,
        evEbitdaScore: result.evEbitdaScore,
        fcfYieldScore: result.fcfYieldScore,
        dividendYieldScore: result.dividendYieldScore,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // GET /api/intelligence/news?symbol=TCS
  // Scores news sentiment: volume, polarity, source credibility, recency
  server.get("/api/intelligence/news", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    try {
      const newsUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=en-IN&region=IN&quotesCount=0&newsCount=8`;
      let articles: { headline: string; source: string; time: string; link?: string }[] = [];
      try {
        const resp = await fetch(newsUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        const data = await resp.json() as any;
        articles = ((data?.news ?? []) as any[]).slice(0, 8).map((item: any) => ({
          headline: String(item.title ?? item.headline ?? ""),
          source: String(item.publisher ?? item.source ?? "Unknown"),
          time: String(item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString()
            : item.publishedAt ?? item.createdAt ?? new Date().toISOString()),
          link: item.link ?? undefined,
        }));
      } catch {
        // Proceed with empty articles
      }

      const metrics: NewsMetrics = { articles, symbol, lastUpdated: new Date() };
      const result = await newsEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=600");
      return {
        symbol,
        engine: "news",
        score: result.overall,
        sentiment: result.sentiment,
        articleCount: result.articleCount,
        volumeScore: result.volumeScore,
        sentimentScore: result.sentimentScore,
        credibilityScore: result.credibilityScore,
        recencyScore: result.recencyScore,
        topKeywords: result.topKeywords,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // GET /api/intelligence/sector?symbol=TCS
  // Scores sector positioning: relative valuation, quality, growth, momentum, competitive position
  server.get("/api/intelligence/sector", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    try {
      const [fund, synthetic] = await Promise.all([
        indianApiFunds(symbol),
        getPersistedStockResearch(symbol),
      ]);

      const fundData = fund || {};
      const synData = (synthetic || {}) as any;

      const sectorName = String(synData.sector ?? fundData.sector ?? "");

      // Build metrics from available data
      const metrics: SectorMetrics = {
        stockPE: n(fundData.pe_ratio),
        stockPB: n(fundData.pb_ratio),
        stockEVEbitda: n(fundData.ev_ebitda ?? fundData.enterprise_value_ebitda),
        stockROE: n(fundData.roe ?? fundData.return_on_equity),
        stockNetMargin: n(fundData.net_margin ?? fundData.net_profit_margin),
        stockRevGrowth: n(fundData.revenue_growth ?? fundData.rev_growth_1y),
        stockEPSGrowth: n(fundData.eps_growth ?? fundData.eps_growth_1y),

        // Peer averages from synthetic/persisted data
        peerPE: n(synData.sectorPe ?? synData.peerPE),
        peerPB: n(synData.sectorPb ?? synData.peerPB),
        peerEVEbitda: n(synData.sectorEvEbitda ?? synData.peerEVEbitda),
        peerROE: n(synData.sectorRoe ?? synData.peerROE),
        peerNetMargin: n(synData.sectorNetMargin ?? synData.peerNetMargin),
        peerRevGrowth: n(synData.sectorRevGrowth ?? synData.peerRevGrowth),
        peerEPSGrowth: n(synData.sectorEpsGrowth ?? synData.peerEPSGrowth),

        sectorReturn1M: n(synData.sectorReturn1M ?? fundData.sector_return_1m),
        sectorReturn3M: n(synData.sectorReturn3M ?? fundData.sector_return_3m),
        relativeStrength: n(synData.relativeStrength ?? synData.sectorRs),
        analystUpgrades: n(synData.analystUpgrades),
        analystDowngrades: n(synData.analystDowngrades),

        marketCapRank: n(synData.marketCapRank ?? synData.peerRank),
        sectorPeerCount: n(synData.sectorPeerCount ?? synData.peerCount),
        brandStrength: n(synData.brandStrength),
        customerStickiness: n(synData.customerStickiness),

        symbol,
        sectorName,
        lastUpdated: new Date(),
      };

      const result = await sectorEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=600");
      return {
        symbol,
        engine: "sector",
        sector: sectorName,
        score: result.overall,
        peerRank: result.peerRank,
        relativeValuation: result.relativeValuation,
        sectorMomentum: result.sectorMomentum,
        competitivePosition: result.competitivePosition,
        relativeValuationScore: result.relativeValuationScore,
        relativeQualityScore: result.relativeQualityScore,
        relativeGrowthScore: result.relativeGrowthScore,
        sectorMomentumScore: result.sectorMomentumScore,
        competitivePositionScore: result.competitivePositionScore,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // ── RAG / Knowledge Base Intelligence ──────────────────────────────────────
  server.get("/api/intelligence/rag", async (request, reply) => {
    const { symbol } = request.query as { symbol?: string };
    if (!symbol || typeof symbol !== "string" || !/^[A-Z0-9&.-]{1,20}$/i.test(symbol.trim())) {
      return reply.status(400).send({ error: "Valid ?symbol query parameter is required" });
    }
    const cleanSymbol = symbol.trim().toUpperCase();

    try {
      const synData = (await getPersistedStockResearch(cleanSymbol).catch(() => null) || {}) as any;

      const metrics: RAGMetrics = {
        patterns: Array.isArray(synData.patterns) ? synData.patterns : [],
        knowledgeItems: Array.isArray(synData.knowledgeItems) ? synData.knowledgeItems : [],
        macroSignals: Array.isArray(synData.macroSignals) ? synData.macroSignals : [],
        sectorPhase: synData.sectorPhase ?? undefined,
        institutionalCoverage: n(synData.institutionalCoverage) ?? undefined,
        learningCount: n(synData.learningCount) ?? undefined,
        symbol: cleanSymbol,
        lastUpdated: new Date(),
      };

      const result = await ragEngine.analyze(metrics);

      reply.header("Cache-Control", "public, s-maxage=600");
      return {
        symbol: cleanSymbol,
        engine: "rag",
        score: result.overall,
        patternMatchScore: result.patternMatchScore,
        knowledgeCoverageScore: result.knowledgeCoverageScore,
        outcomeQualityScore: result.outcomeQualityScore,
        macroContextScore: result.macroContextScore,
        patternMatchCount: result.patternMatchCount,
        bestPattern: result.bestPattern,
        knowledgeConfidence: result.knowledgeConfidence,
        macroEnvironment: result.macroEnvironment,
        confidence: result.confidence,
        details: result,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // ── Unified Orchestrator (all 9 engines) ───────────────────────────────────
  server.get("/api/intelligence/stock", async (request, reply) => {
    const { symbol } = request.query as { symbol?: string };
    if (!symbol || typeof symbol !== "string" || !/^[A-Z0-9&.-]{1,20}$/i.test(symbol.trim())) {
      return reply.status(400).send({ error: "Valid ?symbol query parameter is required" });
    }
    const cleanSymbol = symbol.trim().toUpperCase();

    try {
      // Fetch all data sources once
      const yahoo = {} as any; // yahooQuote not imported here — used inline by individual routes
      const synData = (await getPersistedStockResearch(cleanSymbol).catch(() => null) || {}) as any;

      // Build all 9 engine metric inputs with correct field names
      const inputs: AllEngineInputs = {
        symbol: cleanSymbol,
        financial: {
          roe: n(synData.roe), roa: n(synData.roa), roic: n(synData.roic),
          netMargin: n(synData.netMargin), operatingMargin: n(synData.operatingMargin),
          revenueGrowth: n(synData.revenueGrowth), epsGrowth: n(synData.epsGrowth),
          ebitdaGrowth: n(synData.ebitdaGrowth), profitGrowth: n(synData.profitGrowth),
          debtToEquity: n(synData.debtToEquity), debtToAssets: n(synData.debtToAssets),
          interestCoverage: n(synData.interestCoverage), currentRatio: n(synData.currentRatio),
          marketCap: n(synData.marketCap), revenue: n(synData.revenue),
          assetTurnover: n(synData.assetTurnover), equityTurnover: n(synData.equityTurnover),
          lastUpdated: new Date(), fiscalYear: 2025,
        },
        technical: {
          currentPrice: n(synData.price) ?? 0,
          rsi: n(synData.rsi), macd: n(synData.macd), macdSignal: n(synData.macdSignal),
          macdHistogram: n(synData.macdHistogram),
          ma20: n(synData.ma20), ma50: n(synData.ma50), ma200: n(synData.ma200),
          priceChange1W: n(synData.priceChange1W), priceChange1M: n(synData.priceChange1M),
          priceChange3M: n(synData.priceChange3M), priceChange6M: n(synData.priceChange6M),
          priceChange1Y: n(synData.priceChange1Y),
          volatility30: n(synData.volatility30), beta: n(synData.beta), atr: n(synData.atr),
          volume: n(synData.volume), avgVolume: n(synData.avgVolume),
          volumeRatio: n(synData.volumeRatio),
          lastUpdated: new Date(),
          period: "1D",
        },
        valuation: {
          peRatio: n(synData.peRatio ?? synData.pe),
          pbRatio: n(synData.pbRatio ?? synData.pb),
          evEbitda: n(synData.evEbitda),
          fcfYield: n(synData.fcfYield), dividendYield: n(synData.dividendYield),
          lastUpdated: new Date(),
        },
        earnings: {
          history: Array.isArray(synData.earningsHistory) ? synData.earningsHistory : [],
          currentGuidance: {
            epsGrowth: n(synData.guidanceEpsGrowth) ?? 0,
            revenueGrowth: n(synData.guidanceRevenueGrowth) ?? 0,
          },
          forwardPE: n(synData.forwardPE), peg: n(synData.peg),
          oneTimeItems: n(synData.oneTimeItems), capexToRevenue: n(synData.capexToRevenue),
          fcfMargin: n(synData.fcfMargin),
          fiscalYear: 2025, lastUpdated: new Date(),
        },
        risk: {
          volatility: n(synData.volatility), beta: n(synData.beta),
          maxDrawdown: n(synData.maxDrawdown),
          weeklyRange: n(synData.weeklyRange),
          debtToEquity: n(synData.debtToEquity ?? synData.debtToEquity),
          currentRatio: n(synData.currentRatio),
          interestCoverage: n(synData.interestCoverage),
          cashReserves: n(synData.cashReserves),
          customerConcentration: n(synData.customerConcentration),
          revenuePredictability: n(synData.revenuePredictability),
          competitiveMoat: n(synData.competitiveMoat),
          executionRisk: n(synData.executionRisk),
          profitabilityAtMinus20Revenue: synData.profitabilityAtMinus20Revenue ?? true,
          regulatoryRisk: n(synData.regulatoryRisk) ?? 0.2,
          litigationRisk: n(synData.litigationRisk) ?? 0.2,
          obsolescenceRisk: n(synData.obsolescenceRisk) ?? 0.2,
          disruptionRisk: n(synData.disruptionRisk) ?? 0.3,
          lastUpdated: new Date(),
        },
        sector: {
          stockPE: n(synData.pe), stockPB: n(synData.pb), stockEVEbitda: n(synData.evEbitda),
          stockROE: n(synData.roe), stockNetMargin: n(synData.netMargin),
          stockRevGrowth: n(synData.revenueGrowth), stockEPSGrowth: n(synData.epsGrowth),
          peerPE: n(synData.peerPE), peerPB: n(synData.peerPB), peerEVEbitda: n(synData.peerEVEbitda),
          peerROE: n(synData.peerROE), peerNetMargin: n(synData.peerNetMargin),
          peerRevGrowth: n(synData.peerRevGrowth), peerEPSGrowth: n(synData.peerEPSGrowth),
          sectorReturn1M: n(synData.sectorReturn1M), sectorReturn3M: n(synData.sectorReturn3M),
          relativeStrength: n(synData.relativeStrength),
          analystUpgrades: n(synData.analystUpgrades), analystDowngrades: n(synData.analystDowngrades),
          marketCapRank: n(synData.marketCapRank), sectorPeerCount: n(synData.sectorPeerCount),
          brandStrength: n(synData.brandStrength), customerStickiness: n(synData.customerStickiness),
          symbol: cleanSymbol, sectorName: synData.sectorName ?? synData.sector,
          lastUpdated: new Date(),
        },
        news: {
          articles: Array.isArray(synData.newsArticles) ? synData.newsArticles : [],
          symbol: cleanSymbol, lastUpdated: new Date(),
        },
        events: {
          events: Array.isArray(synData.events) ? synData.events : [],
          nextEarningsDate: synData.nextEarningsDate,
          nextDividendDate: synData.nextDividendDate,
          eventCount90Days: n(synData.eventCount90Days),
          bullishEventCount: n(synData.bullishEventCount),
          bearishEventCount: n(synData.bearishEventCount),
          lastUpdated: new Date(), fiscalYear: 2025, currency: 'INR',
        },
        rag: {
          patterns: Array.isArray(synData.patterns) ? synData.patterns : [],
          knowledgeItems: Array.isArray(synData.knowledgeItems) ? synData.knowledgeItems : [],
          macroSignals: Array.isArray(synData.macroSignals) ? synData.macroSignals : [],
          sectorPhase: synData.sectorPhase,
          institutionalCoverage: n(synData.institutionalCoverage),
          learningCount: n(synData.learningCount),
          symbol: cleanSymbol, lastUpdated: new Date(),
        },
      };

      const result = await orchestrator.analyzeStock(inputs);

      reply.header("Cache-Control", "public, s-maxage=300");
      return {
        symbol: cleanSymbol,
        overallScore: result.overallScore,
        investmentState: result.investmentState,
        confidence: result.confidence,
        engines: result.engines,
        thesis: result.thesis,
        weights: result.weights,
        timestamp: result.timestamp.toISOString(),
      };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol: cleanSymbol });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONAL RESEARCH OS — API Routes
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Research Profile ──────────────────────────────────────────────────────

  server.get("/api/research-profile", async (_req, reply) => {
    const profile = getProfile();
    return profile;
  });

  server.put("/api/research-profile", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    try {
      const body = req.body as Partial<UserResearchProfile>;
      if (!body) return reply.status(400).send({ error: "profile data required" });
      const existing = getProfile();
      const updated: UserResearchProfile = { ...existing, ...body, updatedAt: new Date().toISOString() };
      saveProfile(updated);
      return getProfile();
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  // ── Alerts ────────────────────────────────────────────────────────────────

  server.get("/api/alerts", async (req, reply) => {
    const { symbol, limit } = req.query as any;
    let alerts = symbol
      ? getAlertsBySymbol(String(symbol))
      : getAlerts();
    if (limit) alerts = alerts.slice(0, Number(limit));
    return { alerts, count: alerts.length };
  });

  server.post("/api/alerts", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    try {
      const body = req.body as { alerts: AlertChangeView[] };
      if (!body?.alerts?.length) return reply.status(400).send({ error: "alerts array required" });
      const stored = ingestAlerts(body.alerts);
      return { stored: stored.length, total: stored.length };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.put("/api/alerts/:id", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    const { id } = req.params as any;
    const { acknowledged, action } = req.body as any;
    if (action === "remove") {
      removeAlert(id);
      return { id, removed: true };
    }
    if (acknowledged !== undefined) {
      acknowledgeAlert(id);
      return { id, acknowledged: true };
    }
    return reply.status(400).send({ error: "acknowledged or action required" });
  });

  // ── Digest ────────────────────────────────────────────────────────────────

  server.get("/api/digest", async (_req, reply) => {
    const digest = DigestGenerator.generate();
    return digest;
  });

  server.get("/api/digest/weekly", async (_req, reply) => {
    const review = DigestGenerator.generateWeeklyReview();
    return review;
  });

  // ── Scanner Presets ───────────────────────────────────────────────────────

  server.get("/api/scanner-presets", async (_req, reply) => {
    return { presets: getPresets() };
  });

  server.post("/api/scanner-presets", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    try {
      const { name, description, filters } = req.body as any;
      if (!name || !filters) return reply.status(400).send({ error: "name and filters required" });
      const preset = savePreset(name, description ?? "", filters);
      return preset;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.put("/api/scanner-presets/:id", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    const { id } = req.params as any;
    const updates = req.body as Partial<SavedScannerPreset>;
    const result = updatePreset(id, updates);
    if (!result) return reply.status(404).send({ error: "preset not found" });
    return result;
  });

  server.delete("/api/scanner-presets/:id", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    const { id } = req.params as any;
    const deleted = deletePreset(id);
    if (!deleted) return reply.status(404).send({ error: "preset not found" });
    return { id, deleted: true };
  });

  // ── Thesis History ────────────────────────────────────────────────────────

  server.get("/api/thesis-history/:symbol", async (req, reply) => {
    const { symbol } = req.params as any;
    const history = getThesisHistory(String(symbol).toUpperCase());
    return { symbol: String(symbol).toUpperCase(), snapshots: history };
  });

  server.post("/api/thesis-history", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    try {
      const { thesis } = req.body as any;
      if (!thesis?.symbol) return reply.status(400).send({ error: "thesis with symbol required" });
      captureThesisSnapshot(thesis);
      return { symbol: thesis.symbol, captured: true };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  // ── Action Memory ─────────────────────────────────────────────────────────

  server.post("/api/actions", { preHandler: [requireAuth, rateLimitFor("api_calls_per_hour")] }, async (req, reply) => {
    try {
      const { action, symbol, metadata } = req.body as any;
      if (!action) return reply.status(400).send({ error: "action type required" });
      const record = recordAction(action, symbol ?? null, metadata);
      return record;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || String(err) });
    }
  });

  server.get("/api/actions/recent", async (req, reply) => {
    const { limit } = req.query as any;
    return { actions: getRecentActions(limit ? Number(limit) : 20) };
  });

  // ── Research Suggestions ──────────────────────────────────────────────────

  server.get("/api/research-suggestions", async (req, reply) => {
    const { tickers } = req.query as any;
    const watchlistTickers: string[] = tickers
      ? String(tickers).split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean)
      : [];
    const thesisMap = getLatestThesisMap();
    const statusMap = new Map<string, string>();
    for (const [symbol, thesis] of thesisMap) {
      statusMap.set(symbol, thesis.currentStatus);
    }
    const suggestions = getResearchSuggestions(watchlistTickers, statusMap);
    return { suggestions };
  });

  // ── Watchlist Intelligence ────────────────────────────────────────────────

  server.get("/api/watchlist-intelligence", async (req, reply) => {
    try {
      const { tickers, changesOnly } = req.query as any;
      const tickerList: string[] = tickers
        ? String(tickers).split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean)
        : [];
      if (!tickerList.length) return reply.status(400).send({ error: "tickers required (comma-separated)" });

      const previousThesis = getLatestThesisMap();
      const intelligence = await WatchlistIntelligenceEngine.buildIntelligence(
        tickerList,
        previousThesis,
        { changesOnly: changesOnly === "true" || changesOnly === "1" }
      );

      // Store thesis snapshots for each item
      for (const item of intelligence.items) {
        captureThesisSnapshot(item);
      }

      // Ingest generated alerts
      if (intelligence.alerts.length > 0) {
        ingestAlerts(intelligence.alerts);
      }

      return intelligence;
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
    }
  });

  // ── Notification Snapshot ─────────────────────────────────────────────────

  server.get("/api/notification-snapshot", async (_req, reply) => {
    return getNotificationSnapshot();
  });

  server.post("/api/notifications/acknowledge-all", async (_req, reply) => {
    acknowledgeAll();
    return { acknowledged: true };
  });
}
