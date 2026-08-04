/**
 * apiRouter.ts — Fastify API routes for StockEX
 *
 * Serves the same /api/* endpoints that Vercel serverless functions used to.
 * Uses real Yahoo Finance data with deterministic fallbacks.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { StockUniverseAdapter } from "../services/data/providers/StockUniverseAdapter.js";
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
import { MarketDataGateway } from "../services/data/MarketDataGateway.js";

// ── Cache helper ───────────────────────────────────────────────────────
function setCache(reply: FastifyReply, maxAge: number = 300): void {
  reply.header("Cache-Control", `public, max-age=${maxAge}`);
  reply.header("ETag", `"${Date.now()}"`);
}
import type { EarningsMetrics, EventMetrics, FinancialMetrics, NewsMetrics, RAGMetrics, RiskMetrics, SectorMetrics, TechnicalMetrics, ValuationMetrics } from "../services/intelligence/types.js";
import { dcfValuationService } from "../services/valuation/ValuationService.js";
import { corporateActionsService } from "../services/corporate-actions/CorporateActionsService.js";
import intelligenceQualityGate from "./intelligenceQualityGate.js";
import type { UserResearchProfile, AlertChangeView, SavedScannerPreset, DailyResearchDigest, WatchlistThesisView } from "../research/contracts/productContracts.js";
import { saveProfile, getProfile, createDefaultProfile } from "../services/personalization/researchProfileStore.js";
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
import { DeterministicResearchProvider } from "../services/ai/DeterministicResearchProvider.js";
import { dbAdapter } from "../db/DatabaseAdapter.js";
import { AsymmetricDataGateway } from "../db/AsymmetricDataGateway.js";
import { loadRealPseOwnership } from "../services/scrapers/PSEOwnershipData.js";
import {
  registerCommercialRoutes,
  registerIntelligenceContextRoutes,
  registerIntelligenceCoreRoutes,
  registerIntelligenceMarketRoutes,
  registerPersonalResearchRoutes,
  registerPublicEngagementRoutes,
} from "../backend/web/routes/index.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function n(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const p = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : undefined;
}

import { requireAuth } from "../services/auth/authMiddleware.js";

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
  AC: { founded: "1834", employees: "14,000+", segments: ["Real Estate", "Banking", "Telecom", "Infrastructure"] },
  ALI: { founded: "1988", employees: "12,000+", segments: ["Real Estate", "Hotels", "Retail", "Construction"] },
  BDO: { founded: "1968", employees: "40,000+", segments: ["Retail Banking", "Corporate", "Insurance", "Wealth"] },
  BPI: { founded: "1851", employees: "20,000+", segments: ["Retail Banking", "Corporate", "Treasury"] },
  GLO: { founded: "1935", employees: "8,000+", segments: ["Telecom", "Digital", "Broadband"] },
  JFC: { founded: "1975", employees: "80,000+", segments: ["QSR", "Food Manufacturing", "Franchising"] },
  JGS: { founded: "1967", employees: "20,000+", segments: ["Airline", "Banking", "Food", "Retail"] },
  MBT: { founded: "1962", employees: "15,000+", segments: ["Retail Banking", "Corporate", "Treasury"] },
  MER: { founded: "1903", employees: "6,000+", segments: ["Power Distribution", "Utility"] },
  SMC: { founded: "1890", employees: "45,000+", segments: ["Food", "Beverage", "Power", "Infrastructure"] },
  SM: { founded: "1958", employees: "15,000+", segments: ["Real Estate", "Banking", "Retail"] },
  SMPH: { founded: "1994", employees: "10,000+", segments: ["Mall Operations", "Real Estate", "Hotels"] },
  TEL: { founded: "1928", employees: "15,000+", segments: ["Telecom", "Broadband", "Digital Services"] },
};

// ── Symbol Normalization ──────────────────────────────────────────────────

/**
 * Normalize a stock symbol: strip a PSE: prefix if present, return the
 * clean symbol and Yahoo Finance exchange suffix.
 *
 * Previously this defaulted to the Yahoo suffixes for PSE (".PS" suffix),
 * including for plain tickers like "BDO" — so every quote/history
 * lookup that went through this path silently queried Yahoo Finance for
 * the wrong country's exchange (e.g. "BDO.NS" instead of "BDO.PS"). The
 * PSE's own suffix on Yahoo Finance is always ".PS" (see YahooProvider.ts,
 * which already gets this right) — there's no PSE-side ISIN-numeric or
 * secondary-suffix convention to branch on.
 */
function parseSymbol(raw: string): { cleanSymbol: string; symbol: string; exchangeSuffix: string } {
  const upper = raw.toUpperCase().trim();
  const cleanSymbol = upper.startsWith("PSE:") ? upper.slice(4) : upper;
  return { cleanSymbol, symbol: cleanSymbol, exchangeSuffix: "PS" };
}

// ── Yahoo Finance ──────────────────────────────────────────────────────────

async function yahooQuote(symbol: string, exchangeSuffix = "PS") {
  try {
    const ticker = `${symbol}.${exchangeSuffix}`;
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`,
      { headers: { "User-Agent": "Mozilla/5.0 Lensory/2.0" }, signal: AbortSignal.timeout(5_000) }
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

async function yahooPriceHistory(symbol: string, exchangeSuffix = "PS"): Promise<Record<string, { label: string; price: number }[]>> {
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
        { headers: { "User-Agent": "Mozilla/5.0 Lensory/2.0" }, signal: AbortSignal.timeout(6_000) }
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
          if (key === "1W") label = dt.toLocaleDateString("en-PH", { weekday: "short", hour: "2-digit", minute: "2-digit" });
          else if (key === "5Y") label = dt.toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
          else label = dt.toLocaleDateString("en-PH", { day: "numeric", month: "short" });
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
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&lang=en-PH&region=PH&quotesCount=0&newsCount=6`,
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

/**
 * Disabled: this previously called api.psx.com.pk — the Pakistan Stock
 * Exchange's real API — under a "PSEAPI_KEY" name that was meant for the
 * Philippine Stock Exchange. It was wired in as a *priority* fundamentals
 * source (see callers), so any PSE ticker symbol that happened to collide
 * with a PSX-listed one would have had wrong-country data merged into its
 * financials. Kept as a same-shape no-op so the dependency injection in
 * intelligence{Core,Market,Context}Routes.ts doesn't need to change.
 */
async function pseApiFunds(_symbol: string): Promise<Record<string, unknown>> {
  return {};
}

function decodeHtmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parsePercentValue(value: string): number | null {
  const cleaned = value.replace(/[% ,]/g, "").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePhpMillions(value: string): number | null {
  const cleaned = value.replace(/₱/g, "").replace(/[,%\s]/g, "").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseHtmlTable(tableHtml: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(decodeHtmlText(cellMatch[1]));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function extractScreenerTableByHeading(html: string, heading: string): string[][] {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`${escaped}[\\s\\S]{0,2500}?<table[^>]*class="data-table[^"]*"[^>]*>([\\s\\S]*?)<\\/table>`, "i"));
  return match ? parseHtmlTable(match[1]) : [];
}

function extractScreenerTableByContainer(html: string, containerId: string): string[][] {
  const escaped = containerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<div id="${escaped}"[^>]*>[\\s\\S]*?<table[^>]*class="data-table[^"]*"[^>]*>([\\s\\S]*?)<\\/table>`, "i"));
  return match ? parseHtmlTable(match[1]) : [];
}

function findRow(rows: string[][], matcher: (label: string) => boolean): string[] | null {
  for (const row of rows.slice(1)) {
    const label = row[0] ?? "";
    if (matcher(label)) return row;
  }
  return null;
}

/**
 * KNOWN GAP (fixed from a real bug): this used to fetch
 * https://www.pse.com.ph/company/{symbol}/consolidated/ — a URL pattern
 * carried over from this codebase's original Screener.in (India) version
 * and never actually verified against the real pse.com.ph site structure.
 * Live-tested: it returns a 404 "Page not found" for every symbol. The
 * table-extraction logic downstream (extractScreenerTableByHeading,
 * findRow for "Promoters"/"FIIs"/"DIIs" — Indian shareholding categories
 * with no PSE equivalent) was also never adapted for a real PSE page
 * shape. Rather than keep paying an 8s timeout on every stock page load
 * for a call that can never succeed, this now returns null immediately.
 * A real PSE financials/shareholding source (e.g. parsing 17-Q/17-A
 * filings via PSEEdgeScraper.ts) would need to replace this outright, not
 * patch this URL.
 */
async function fetchScreenerPage(_symbol: string, _consolidated = true): Promise<string | null> {
  return null;
}

/**
 * KNOWN GAP (fixed from a real bug): this called scripts/yfinance_financials.py,
 * which fetches Yahoo Finance under a `{symbol}.PS` suffix. Verified live
 * (both raw Yahoo API calls and the yfinance library, across BDO/JFC/SM/TEL/
 * AC/ALI): Yahoo Finance has no real coverage of PSE-listed equities under
 * any suffix (.PS, .PSE, or bare) — `.PS` returns a dead placeholder shell
 * (exchangeName "YHD", no price, no timestamps), `.PSE` returns a clean
 * "symbol may be delisted" 404. This is not a suffix-naming bug; there is
 * no free data behind it. Rather than pay a 30s subprocess-spawn timeout on
 * every stock page load for a call that can never succeed, this now
 * returns null immediately. See EodhdCandleProvider.ts / eodhdClient.ts —
 * EODHD's free tier also blocks /fundamentals/ ("Only EOD data allowed for
 * free users"), so there is currently no verified free source for real
 * revenue/profit/ebitda series; deriveFinancials()'s synthetic estimate is
 * the honest fallback, and the frontend must label it as such (see
 * dataSources.financials below and StockPage.tsx's disclaimer).
 */
async function loadYFinanceFinancialSeries(_symbol: string): Promise<{
  annual: { revenue: Array<{ period: string; value: number }>; profit: Array<{ period: string; value: number }>; ebitda: Array<{ period: string; value: number }> };
  quarterly: { revenue: Array<{ period: string; value: number }>; profit: Array<{ period: string; value: number }>; ebitda: Array<{ period: string; value: number }> };
  dataSource: string;
} | null> {
  return null;
}

async function loadRealFinancialSeries(symbol: string) {
  const html = await fetchScreenerPage(symbol, true);
  if (html) {
    const annualTable = extractScreenerTableByHeading(html, "Profit & Loss");
    const quarterlyTable = extractScreenerTableByHeading(html, "Quarterly Results");

    const buildSeries = (rows: string[][]) => {
      if (rows.length < 2) return null;
      const periods = rows[0].slice(1);
      const sales = findRow(rows, (label) => /^sales$/i.test(label));
      const profit = findRow(rows, (label) => /^net profit$/i.test(label));
      const ebitda = findRow(rows, (label) => /^operating profit$/i.test(label) || /^ebitda$/i.test(label));
      if (!sales && !profit && !ebitda) return null;

      const mapMetric = (row: string[] | null) =>
        periods
          .map((period, index) => {
            const value = row ? parsePhpMillions(row[index + 1] ?? "") : null;
            return value === null ? null : { period, value };
          })
          .filter((item): item is { period: string; value: number } => item !== null);

      return {
        revenue: mapMetric(sales),
        profit: mapMetric(profit),
        ebitda: mapMetric(ebitda),
      };
    };

    const annual = buildSeries(annualTable);
    const quarterly = buildSeries(quarterlyTable);
    if (annual && (annual.revenue.length > 0 || annual.profit.length > 0 || annual.ebitda.length > 0)) {
      return {
        annual,
        quarterly: quarterly ?? { revenue: [], profit: [], ebitda: [] },
        dataSource: "pseApi",
      };
    }
  }

  return loadYFinanceFinancialSeries(symbol);
}

async function loadRealShareholdingSeries(symbol: string) {
  const html = await fetchScreenerPage(symbol, true);
  if (!html) return null;

  const rows = extractScreenerTableByContainer(html, "quarterly-shp");
  if (rows.length < 2) return null;

  const periods = rows[0].slice(1);
  const promoters = findRow(rows, (label) => /^promoters$/i.test(label));
  const fiis = findRow(rows, (label) => /^fiis$/i.test(label));
  const diis = findRow(rows, (label) => /^diis$/i.test(label));
  const publicRow = findRow(rows, (label) => /^public$/i.test(label));
  if (!promoters && !fiis && !diis && !publicRow) return null;

  const series = periods.map((period, index) => ({
    period,
    promoter: parsePercentValue(promoters?.[index + 1] ?? "") ?? 0,
    fii: parsePercentValue(fiis?.[index + 1] ?? "") ?? 0,
    dii: parsePercentValue(diis?.[index + 1] ?? "") ?? 0,
    retail: parsePercentValue(publicRow?.[index + 1] ?? "") ?? 0,
  })).filter((row) => row.promoter > 0 || row.fii > 0 || row.dii > 0 || row.retail > 0);

  if (series.length === 0) return null;

  return series
    .map((row, index, arr) => {
      const prev = arr[index - 1];
      return {
        ...row,
        deltas: {
          promoter: prev ? Number((row.promoter - prev.promoter).toFixed(2)) : 0,
          fii: prev ? Number((row.fii - prev.fii).toFixed(2)) : 0,
          dii: prev ? Number((row.dii - prev.dii).toFixed(2)) : 0,
          retail: prev ? Number((row.retail - prev.retail).toFixed(2)) : 0,
        },
      };
    })
    .reverse();
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
  return { annual, quarterly, dataSource: 'synthetic' as const };
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
      dataSource: 'synthetic' as const,
    };
  }
  if (avg >= 50) {
    return {
      stance: "Watch" as const,
      thesis: `Mixed signals — ${q >= 55 ? "quality metrics solid" : "quality needs improvement"} while ${g >= 55 ? "growth promising" : "growth subdued"}. Selective exposure.`,
      bullCase: `${g >= 50 ? "Growth catalysts could re-rate the stock." : "Operational improvements could unlock value."} ${v >= 55 ? "Current valuation offers reasonable entry." : ""}`,
      bearCase: `Inconsistent metrics suggest elevated uncertainty. ${r < 50 ? "Risk management and capital allocation need scrutiny." : ""}`,
      whatToWatch: "Track quarterly results for operational leverage. Changes in institutional holding could signal conviction shifts.",
      dataSource: 'synthetic' as const,
    };
  }
  return {
    stance: "Needs review" as const,
    thesis: `Below-average scores across key dimensions warrant caution. Risk-reward appears unfavorable at current levels.`,
    bullCase: "Turnaround potential if management executes on cost optimization. Sector tailwinds could provide near-term relief.",
    bearCase: `Fundamental weaknesses in quality (${q}/100) and elevated risk (${r}/100) create downside risk.`,
    whatToWatch: "Wait for two consecutive quarters of improving metrics before reconsidering. Monitor debt levels.",
    dataSource: 'synthetic' as const,
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

import { registerAnalystRoutes } from "../stockstory/analyst/api/analystRoutes.js";

export default async function registerApiRoutes(server: FastifyInstance) {
  await registerAnalystRoutes(server);
  await registerIntelligenceMarketRoutes(server, {
    parseSymbol,
    yahooQuote,
    pseApiFunds,
  });
  await registerIntelligenceContextRoutes(server, {
    yahooQuote,
    pseApiFunds,
    getPersistedStockResearch,
  });
  await registerIntelligenceCoreRoutes(server, {
    parseSymbol,
    yahooQuote,
    yahooPriceHistory,
    pseApiFunds,
    getPersistedStockResearch,
    computeVolatility,
    buildTechnicalMetrics,
  });
  await registerPersonalResearchRoutes(server, {
    requireAuth,
    rateLimitFor,
    getProfile,
    saveProfile,
    getAlerts,
    getAlertsBySymbol,
    ingestAlerts,
    acknowledgeAlert,
    removeAlert,
    generateDigest: () => DigestGenerator.generate(),
    generateWeeklyReview: () => DigestGenerator.generateWeeklyReview(),
    getPresets,
    savePreset,
    updatePreset,
    deletePreset,
    getThesisHistory,
    captureThesisSnapshot,
    recordAction,
    getRecentActions,
    getResearchSuggestions,
    getLatestThesisMap,
    buildWatchlistIntelligence: (tickers, previousThesis, options) =>
      WatchlistIntelligenceEngine.buildIntelligence(tickers, previousThesis, options),
    getNotificationSnapshot,
    acknowledgeAll,
  });
  await registerPublicEngagementRoutes(server, {
    dbQuery: (sql, params) => dbAdapter.query(sql, params as any[] | undefined),
  });
  await registerCommercialRoutes(server);
  // ── Network Response Caching Layer ──────────────────────────────
  // Global hook to attach downstream performance caching headers
  server.addHook('onSend', async (request, reply, payload) => {
    const urlPath = request.raw.url || '';

    // Gate 1: Public market data cache rules
    if (urlPath.includes('/api/v1/market-stream/')) {
      reply.header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=10');
    }
    // Gate 2: Public options derivatives analytics cache rules
    else if (urlPath.includes('/api/v1/fo/scanner/')) {
      reply.header('Cache-Control', 'public, max-age=60, s-maxage=120');
    }
    // Gate 3: Enforce strict private data safety containment on sensitive user data
    else if (urlPath.includes('/api/v1/broker/') || urlPath.includes('/api/v1/portfolio/')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }

    return payload;
  });
  // ── End Caching Layer ────────────────────────────────────────────

  // Register intelligence quality gate (sanitizes all /api/intelligence/* responses)
  await server.register(intelligenceQualityGate);
  // Shared stock detail handler — supports both ?symbol=AC and /api/stock/AC
  async function stockHandler(req: FastifyRequest, reply: FastifyReply) {
    const symbol = String(
      (req.query as any)?.symbol ?? (req.params as any)?.symbol ?? ""
    ).toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    // Normalize exchange-prefixed symbols (PSE502865 → clean=502865, suffix)
    const { cleanSymbol, exchangeSuffix } = parseSymbol(symbol);

    const cached = stockCache.get(symbol);
    if (cached && Date.now() < cached.expiresAt) {
      reply.header("X-Cache", "HIT");
      reply.header("Cache-Control", "public, s-maxage=300");
      return cached.data;
    }

    const [gatewayQuote, fundResult, priceHistory, news, cachedFinancials] = await Promise.all([
      MarketDataGateway.getQuote(cleanSymbol).catch(() => null),
      pseApiFunds(cleanSymbol).catch(() => null),
      MarketDataGateway.getHistory(cleanSymbol).catch(() => null),
      MarketDataGateway.getNews(cleanSymbol).catch(() => null),
      MarketDataGateway.getFinancials(cleanSymbol).catch(() => null),
    ]);

    const gatewayMeta = await MarketDataGateway.getCompany(cleanSymbol).catch(() => null);

    const quote = gatewayQuote;
    const meta = gatewayMeta;
    const fundResultSafe = fundResult;
    const priceHistorySafe = priceHistory;
    const newsSafe = news;

    if (!quote?.price) {
      return reply.status(503).send({
        error: "Data temporarily unavailable",
        message: "Market data providers are not responding. Please try again in a moment.",
        retryAfter: 30,
      });
    }

    // Merge financials from cache/provider with higher priority for real data
    const fundData = (fundResultSafe && Object.keys(fundResultSafe).length > 0 ? fundResultSafe : fundResult) || {};
    if (cachedFinancials && !fundData.pe_ratio) {
      fundData.pe_ratio = cachedFinancials.peRatio;
      fundData.pb_ratio = cachedFinancials.pbRatio;
      fundData.roe = cachedFinancials.roe;
      fundData.return_on_equity = cachedFinancials.roe;
      fundData.debt_to_equity = cachedFinancials.debtToEquity;
      fundData.eps = cachedFinancials.eps;
      fundData.dividend_yield = cachedFinancials.dividendYield;
    }
    const price = quote.price;
    const change = quote.change || 0;
    const changePercent = quote.changePercent || 0;
    const marketCapCr = Math.round(((meta?.marketCap ?? (cachedFinancials?.marketCap ?? 0)) / 1e7) * 100) / 100;
    const sector: string = (fundData.sector as string) || "Diversified";
    const pe = n(fundData.pe_ratio) ?? null;
    const pb = n(fundData.pb_ratio) ?? null;
    const roe = n(fundData.roe ?? fundData.return_on_equity) ?? null;
    const de = n(fundData.debt_to_equity) ?? null;
    const eps = n(fundData.eps) ?? null;
    const divYld = n(fundData.dividend_yield) ?? null;
    const revGrowth = n(fundData.revenue_growth_3y ?? fundData.revenue_growth) ?? null;
    const profGrowth = n(fundData.profit_growth_3y ?? fundData.profit_growth) ?? null;
    const activeNews = newsSafe && newsSafe.length > 0 ? newsSafe : null;
    const activePriceHistory = priceHistorySafe;
    const health = 50;
    const industryPe = SECTOR_PE_MEDIAN[sector] || 20;
    const known = KNOWN[cleanSymbol];
    const realFinancialsData = await loadRealFinancialSeries(cleanSymbol);
    const financialsData = realFinancialsData ?? deriveFinancials(marketCapCr, pe, sector, revGrowth, profGrowth);
    const realShareholdingData = await loadRealShareholdingSeries(cleanSymbol);
    const realOwnership = loadRealPseOwnership(cleanSymbol);
    // Real (see pseOwnershipProvider.ts) when available — a PSE Public
    // Ownership Report only reports insider % vs public %, not a
    // fabricated foreign/domestic institutional split (deriveShareholding
    // below was a hash-based model of exactly that fake FII/DII shape,
    // left over from an India-market version of this codebase; no longer
    // called — kept only in case a future symbol match needs it removed
    // for real, see the comment on its definition). Empty array (frontend
    // hides the Shareholdings card) rather than a modeled substitute when
    // no real record exists.
    const shareholdingData = realShareholdingData
      ?? (realOwnership && realOwnership.publicOwnershipPercent !== null
        ? [{
            period: realOwnership.reportDate ?? 'Latest',
            insiderPercent: realOwnership.insiderOwnershipPercent ?? Number((100 - realOwnership.publicOwnershipPercent).toFixed(2)),
            publicPercent: realOwnership.publicOwnershipPercent,
            outstandingShares: realOwnership.outstandingShares,
          }]
        : []);
    const thesisData = generateThesis({ health }, pe, roe);

    const annualRev = financialsData.annual.revenue || [];
    const annualProf = financialsData.annual.profit || [];
    const revenue = annualRev.length > 0 ? annualRev[annualRev.length - 1].value : 5000;
    const netMargin = (SECTOR_NET_MARGIN[sector] || 0.10);
    const latestProfit = annualProf.length > 0 ? annualProf[annualProf.length - 1].value : revenue * netMargin;
    const netDebt = de ? marketCapCr * (de / (1 + de)) : marketCapCr * 0.2;
    const cashEq = marketCapCr * 0.05;
    const sharesOut = price > 0 ? (marketCapCr * 10000000) / price : 100000000;
    const dcf = dcfValuationService.estimateFromFinancials(
      revenue * 10000000, netMargin, (revGrowth ?? 12) / 100,
      marketCapCr * 10000000, netDebt * 10000000, cashEq * 10000000, sharesOut, price
    );

    const payload = {
      symbol,
      companyName: gatewayMeta?.companyName || gatewayMeta?.name || symbol,
      exchange: "PSE" as "PSE" | "PSE",
      sector,
      industry: sector,
      price: { current: price, changeAbs: change, changePercent, marketCap: marketCapCr },
      fundamentals: { pe, industryPe, pb, dividendYield: divYld, eps },
      roe, debtToEquity: de, revenueGrowth: revGrowth, profitGrowth: profGrowth,
      rsi: n(fundData.rsi) ?? 50,
      scores: {
        quality: 50, valuation: 50,
        growth: 50, momentum: 50,
        risk: 50, health,
        riskAdjusted: 50,
      },
      confidenceMeter: health,
      timeline: Array.from({ length: 6 }, (_, i) => ({
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Today"][i],
        health: Math.min(100, Math.max(20, health + Math.round(Math.sin(i * 1.5) * 8))),
      })),
      whatChanged: [
        "Quality metrics need monitoring",
        `${revGrowth ? `Revenue growth at ${revGrowth}% — ${revGrowth >= 15 ? "above" : "near"} sector average` : "Revenue growth data pending"}`,
        `${pe ? `PE of ${pe} vs industry ${industryPe} — ${pe < industryPe ? "discount to peers" : "premium to peers"}` : "Valuation data pending"}`,
      ],
      sectorRelative: [
        { label: "PE Ratio", company: pe ? pe.toFixed(1) : "—", sectorMedian: industryPe.toFixed(1) },
        { label: "ROE %", company: roe ? roe.toFixed(1) : "—", sectorMedian: "15.0" },
        { label: "Rev Growth %", company: revGrowth ? revGrowth.toFixed(1) : "—", sectorMedian: "12.0" },
      ],
      description: `${symbol} operates in the ${sector} sector.`,
      companyProfile: {
        founded: known?.founded || "",
        ceo: "",
        hq: "Philippines",
        employees: known?.employees || "",
        website: "",
        isin: "",
        businessSegments: known?.segments || ["Diversified"],
      },
      financials: financialsData,
      shareholding: shareholdingData,
      news: activeNews && activeNews.length > 0 ? activeNews : [
        { headline: "Quarterly results show steady performance", source: "Lensory Research", time: new Date(Date.now() - 86400000).toISOString() },
        { headline: "Sector outlook remains positive for coming quarters", source: "Financial Express", time: new Date(Date.now() - 172800000).toISOString() },
      ],
      dcf: {
        fairValuePerShare: dcf.fairValuePerShare,
        currentPrice: dcf.currentPrice,
        upside: dcf.upside,
        assessment: dcf.assessment,
        impliedReturn: dcf.impliedReturn,
        enterpriseValue: dcf.enterpriseValue,
        equityValue: dcf.equityValue,
        terminalValue: dcf.terminalValue,
        years: dcf.years,
      },
      thesis: thesisData,
      dataSources: {
        // Was `realFinancialsData?.dataSource ?? (fundData?.pe_ratio ? 'real' : 'synthetic')`
        // -- that conflated "do we have a real P/E ratio" with "is this
        // revenue/profit/ebitda time series real," mislabeling synthetic
        // chart data as 'real' whenever a P/E happened to be available from
        // elsewhere. realFinancialsData is the only thing that actually
        // reflects whether financialsData came from a verified source.
        financials: realFinancialsData?.dataSource ?? 'synthetic',
        shareholding: realShareholdingData ? 'real' : (realOwnership ? 'real' : 'synthetic'),
        thesis: fundData?.pe_ratio ? 'real' : 'yahoo',
      },
      priceHistory,
    };

    stockCache.set(symbol, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    reply.header("Cache-Control", "public, s-maxage=300");
    return payload;
  }

  // POST /api/chat — AI chat assistant
  // Uses deterministic fallback when no external LLM is configured
  server.post("/api/chat", async (req, reply) => {
    const { message, symbol, context } = (req.body || {}) as {
      message?: string;
      symbol?: string;
      context?: string;
    };
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return reply.status(400).send({ error: "message is required" });
    }
    try {
      const provider = new DeterministicResearchProvider();
      const response = await provider.chat(
        (symbol ?? "").trim().toUpperCase(),
        message.trim(),
        context ?? ""
      );
      return { response };
    } catch (err: any) {
      req.log.error({ err }, "Chat handler failed");
      return reply.status(500).send({ error: err.message || "Internal error" });
    }
  });

  // POST /api/ai/chat-faq — Floating AI button endpoint (canned FAQ fallback)
  // Renamed from /api/ai/chat: that path collides with aiRoutes.ts's real
  // model-inference chat endpoint (registered later in startServer.ts) —
  // two genuinely different features (keyword-matched static FAQ answers
  // here vs. the fine-tuned model there) sharing one URL. Fastify throws
  // FST_ERR_DUPLICATED_ROUTE on the real duplicate registration.
  server.post("/api/ai/chat-faq", async (req, reply) => {
    const { message } = (req.body || {}) as { message?: string };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return reply.status(400).send({ error: "message is required" });
    }

    const query = message.toLowerCase();
    const responses: Record<string, string> = {
      pe: `P/E Ratio = Price per share ÷ Earnings per share. Shows how much investors pay per peso of earnings.
• Low P/E doesn't always mean undervalued - check ROE, debt, and growth
• PSE mid-caps average 15-20x P/E
• Compare against sector peers and historical average`,

      roe: `ROE = Net Profit ÷ Shareholder Equity. Measures profit generated per peso of equity.
• Target >15% for quality compounders
• Banks: 12-15%, IT: 20-25%, Manufacturing: 8-12%
• Consistent ROE >15% indicates quality
• Compare against sector average`,

      debt: `Debt/Equity ratio = Total Debt ÷ Total Equity. Shows financial leverage.
• Healthy: <0.5 for industrials, <0.3 for IT/services
• High leverage increases risk during downturns
• Always check debt trend vs revenue growth
• Watch for debt-fueled growth that's unsustainable`,

      dividend: `Dividend strategy guide:
• Dividend Yield = Annual Dividend ÷ Stock Price
• Payout Ratio = Dividend ÷ Earnings (target <60%)
• Look for consistency - 5+ years of rising dividends
• High yields (>5%) may signal trouble
• Verify dividend sustainability from cash flow`,

      growth: `Growth analysis for quality stocks:
• Revenue CAGR >15% indicates strong growth
• Verify quality: competitive moat, margin expansion, capital efficiency
• Watch for one-time revenues that don't repeat
• Check 3-5 year consistency, not just recent quarters
• Growth must be profitable and capital-efficient`,

      valuation: `Valuation framework:
• Use multiple metrics: P/E, P/B, EV/EBITDA
• Compare against: sector peers, historical average, market
• Single metrics are misleading
• Combine with fundamentals and growth prospects
• Apply margin of safety >20% for downside protection`,
    };

    // Find matching response
    let response: string | undefined;
    for (const [key, value] of Object.entries(responses)) {
      if (query.includes(key)) {
        response = value;
        break;
      }
    }

    return reply.send({
      response: response || "Ask about: P/E ratio, ROE, Debt/Equity, Dividend strategy, Growth metrics, or Valuation methods. I can help analyze PSE stocks!",
      confidence: response ? 0.95 : 0.8,
      source: "server",
    });
  });

  // GET /api/stock?symbol=AC  or  /api/stock/AC
  server.get("/api/stock", stockHandler);
  server.get("/api/stock/:symbol", stockHandler);

  // GET /api/company-master?symbol=AC
  server.get("/api/company-master", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    const adapter = StockUniverseAdapter.getInstance();
    const result = await adapter.getCompanyMaster(symbol);

    if (!result.ok) {
      return reply.status(503).send({ error: "Company master unavailable", detail: result.errorCode });
    }

    const entry = result.data;

    if (!entry) {
      return reply.status(404).send({ error: "Symbol not found in universe", symbol });
    }

    return {
      ok: true,
      symbol: entry.symbol,
      companyName: entry.companyName,
      sector: entry.sector,
      industry: entry.industry,
      exchange: entry.exchange || null,
      marketCapCategory: entry.marketCapCategory || null,
      isin: entry.isin || null,
      source: "stock-universe-bundle",
    };
  });

  // GET /api/search?q=bdo&limit=10
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
          const exchSuffix = r.exchange === "PSE" ? "BO" : "NS";
          try {
            const ticker = `${r.symbol}.${exchSuffix}`;
            const yr = await fetch(
              `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`,
              { headers: { "User-Agent": "Mozilla/5.0 Lensory/2.0" }, signal: AbortSignal.timeout(3_000) }
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
            symbol: r.symbol, name: r.name || r.symbol, exchange: r.exchange || "PSE",
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

  // ── New Feature API Routes ──────────────────────────────────────────

  // GET /api/corporate-actions?symbol=AC&days=30
  server.get("/api/corporate-actions", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    const days = Number((req.query as any)?.days ?? 30);
    const data = symbol
      ? corporateActionsService.getActionsBySymbol(symbol)
      : corporateActionsService.getUpcomingActions(days);
    return { ok: true, count: data.length, data };
  });

  // GET /api/insider-trades?symbol=AC&days=30
  server.get("/api/insider-trades", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    const days = Number((req.query as any)?.days ?? 30);
    const data = symbol
      ? corporateActionsService.getInsiderTradesBySymbol(symbol)
      : corporateActionsService.getRecentInsiderTrades(days);
    return { ok: true, count: data.length, data };
  });

  // GET /api/bulk-deals?symbol=AC&days=30
  server.get("/api/bulk-deals", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    const days = Number((req.query as any)?.days ?? 30);
    const data = symbol
      ? corporateActionsService.getBulkDealsBySymbol(symbol)
      : corporateActionsService.getRecentBulkDeals(days);
    return { ok: true, count: data.length, data };
  });

  // GET /api/valuation/dcf?symbol=AC&price=850
  server.get("/api/valuation/dcf", async (req, reply) => {
    const symbol = String((req.query as any)?.symbol ?? "").toUpperCase().trim();
    const price = Number((req.query as any)?.price ?? 0);
    if (!symbol) return reply.status(400).send({ error: "symbol required" });

    try {
      const synData = (await getPersistedStockResearch(symbol).catch(() => null) || {}) as any;
      const revenue = n(synData.revenue) ?? 5000;
      const netMargin = n(synData.netMargin) ?? 0.10;
      const revenueGrowth = n(synData.revenueGrowth) ?? 12;
      const marketCap = n(synData.marketCap) ?? (price * 100000000);
      const de = n(synData.debtToEquity) ?? 0.5;
      const netDebt = marketCap * (de / (1 + de));
      const cashEq = marketCap * 0.05;
      const sharesOut = price > 0 ? marketCap / price : 100000000;

      const result = dcfValuationService.estimateFromFinancials(
        revenue * 10000000, netMargin, revenueGrowth / 100,
        marketCap * 10000000, netDebt * 10000000, cashEq * 10000000, sharesOut, price > 0 ? price : 100
      );
      return { ok: true, symbol, dcf: result };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), symbol });
    }
  });

  // ── Asymmetric Data Gateway — cached market data ──────────────────────────

  // GET /api/v1/market-stream/:ticker — relaxed limit (30/min)
  server.get("/api/v1/market-stream/:ticker", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const { ticker } = request.params as { ticker: string };
    if (!ticker || typeof ticker !== "string") {
      return reply.status(400).send({ error: "ticker param required" });
    }
    try {
      const packet = await AsymmetricDataGateway.getSynchronizedMarketPacket(ticker);
      reply.header("Cache-Control", "public, s-maxage=30");
      return packet;
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err), ticker });
    }
  });

  // POST /api/v1/sync-cache — client-contributed cache upload (Phase 42)
  server.post("/api/v1/sync-cache", async (request, reply) => {
    const body = (request.body || {}) as Record<string, any>;
    if (!body?.ticker) {
      return reply.status(400).send({ error: "ticker required in body" });
    }
    try {
      const result = await AsymmetricDataGateway.handleClientCacheContribution(
        body.ticker,
        body as any,
      );
      return { success: true, status: result.status };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
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
          lastUpdated: new Date(), fiscalYear: 2025, currency: 'PHP',
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

  // ── PSE Market Data ─────────────────────────────────────────────────────
  server.get("/api/pse/stocks", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { pseDataPipeline } = await import("../services/providers/PseDataPipeline.js");
      const data = await pseDataPipeline.getAllSectors();
      setCache(reply, 30);
      return { success: true, data, timestamp: new Date().toISOString() };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
    }
  });

  server.get("/api/pse/summary", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { pseDataPipeline } = await import("../services/providers/PseDataPipeline.js");
      const summary = await pseDataPipeline.getMarketSummary();
      setCache(reply, 30);
      return { success: true, data: summary, timestamp: new Date().toISOString() };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
    }
  });

  server.get("/api/pse/gainers", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { pseDataPipeline } = await import("../services/providers/PseDataPipeline.js");
      const gainers = await pseDataPipeline.getTopGainers(15);
      setCache(reply, 30);
      return { success: true, data: gainers, timestamp: new Date().toISOString() };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
    }
  });

  server.get("/api/pse/losers", async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { pseDataPipeline } = await import("../services/providers/PseDataPipeline.js");
      const losers = await pseDataPipeline.getTopLosers(15);
      setCache(reply, 30);
      return { success: true, data: losers, timestamp: new Date().toISOString() };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
    }
  });

  server.get("/api/pse/history/:symbol", async (req: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
    try {
      const { pseDataPipeline } = await import("../services/providers/PseDataPipeline.js");
      const symbol = req.params.symbol.toUpperCase();
      const history = await pseDataPipeline.getHistoricalData(symbol);
      setCache(reply, 300);
      return { success: true, symbol, data: history, timestamp: new Date().toISOString() };
    } catch (err: any) {
      return reply.status(502).send({ error: err.message || String(err) });
    }
  });

}
