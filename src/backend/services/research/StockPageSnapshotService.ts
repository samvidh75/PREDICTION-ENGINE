import { query } from "../../../db/index";
import type { StockPageSnapshot, SnapshotFreshnessState } from "../../../shared/research/StockPageSnapshotTypes";
import { getCachedSnapshot, setCachedSnapshot } from "./StockPageSnapshotCache";
import { getSnapshotFromDb, upsertSnapshot } from "./StockPageSnapshotRepository";
import { isIndianTradingSessionDate, latestIndianTradingSession } from "../../../shared/market/IndianTradingCalendar";

function parseFinite(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchQuote(symbol: string): Promise<StockPageSnapshot["quote"]> {
  try {
    // Use canonical quote from MarketDataGateway + reconciliation for consistency with quote API
    const { MarketDataGateway } = await import("../../../services/data/MarketDataGateway");
    const { reconcileQuoteWithHistory } = await import("../../services/market/MarketQuoteReconciler");

    const [providerQuote, historyRes] = await Promise.all([
      MarketDataGateway.getQuote(symbol).catch(() => null),
      query(
        `SELECT trade_date, close, volume FROM daily_prices WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 AND close > 0 ORDER BY trade_date DESC LIMIT 10`,
        [symbol],
      ),
    ]);

    const reconciled = reconcileQuoteWithHistory(symbol, providerQuote, historyRes.rows || []);
    if (reconciled) {
      return { price: reconciled.price, change: reconciled.change, changePercent: reconciled.changePercent, updatedAt: reconciled.updatedAt ?? null };
    }

    // Fallback: daily_prices only
    const rows = ((historyRes.rows || []) as Record<string, unknown>[]).filter((row) => isIndianTradingSessionDate(String(row["trade_date"] ?? "")));
    if (rows.length === 0) return { price: null, change: null, changePercent: null, updatedAt: null };
    const latest = rows[0];
    const prev = rows[1];
    const price = parseFinite(latest["close"]);
    const prevClose = prev ? parseFinite(prev["close"]) : null;
    const change = price !== null && prevClose !== null ? Math.round((price - prevClose) * 100) / 100 : null;
    const changePercent = price !== null && prevClose !== null && prevClose !== 0 ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : null;
    return { price, change, changePercent, updatedAt: String(latest["trade_date"] ?? null) };
  } catch { return { price: null, change: null, changePercent: null, updatedAt: null }; }
}

async function fetchPriceHistory(symbol: string): Promise<StockPageSnapshot["priceHistory"]> {
  const res = await query(
    `SELECT trade_date, close, high, low, volume FROM daily_prices WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 AND close > 0 ORDER BY trade_date DESC LIMIT 252`,
    [symbol],
  );
  return ((res.rows || []) as Record<string, unknown>[]).map((r) => ({
    date: String(r["trade_date"] ?? ""),
    close: parseFinite(r["close"]) ?? 0,
    high: parseFinite(r["high"]),
    low: parseFinite(r["low"]),
    volume: parseFinite(r["volume"]),
  })).filter((point) => point.close > 0 && isIndianTradingSessionDate(point.date)).sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchHealthometer(symbol: string): Promise<StockPageSnapshot["healthometer"]> {
  const res = await query(
    `SELECT overall_score, healthometer_json FROM stockstory_predictions WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 ORDER BY prediction_date DESC LIMIT 1`,
    [symbol],
  );
  const row = res.rows?.[0] as Record<string, unknown> | undefined;
  if (!row) {
    return { overallScore: null, label: null, dimensions: [] };
  }
  const score = parseFinite(row["overall_score"]);
  const json = row["healthometer_json"];
  let dimensions: StockPageSnapshot["healthometer"]["dimensions"] = [];
  if (json) {
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      dimensions = (parsed.dimensions || []).map((d: Record<string, unknown>) => ({
        id: String(d["id"] ?? ""),
        label: String(d["label"] ?? ""),
        score: parseFinite(d["score"]),
        status: String(d["status"] ?? "insufficient"),
      }));
    } catch {
      // ignore dimension parse errors
    }
  }
  return {
    overallScore: score,
    label: score !== null ? (score >= 70 ? "Very Healthy" : score >= 55 ? "Healthy" : score >= 40 ? "Fair" : "Caution") : null,
    dimensions,
  };
}

async function fetchInvestContext(symbol: string): Promise<StockPageSnapshot["investContext"]> {
  const res = await query(
    `SELECT conviction, score, thesis, key_risks, key_strengths, what_to_watch
     FROM research_invest_context WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 ORDER BY created_at DESC LIMIT 1`,
    [symbol],
  );
  const row = res.rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    conviction: String(row["conviction"] ?? ""),
    score: parseFinite(row["score"]),
    thesis: String(row["thesis"] ?? "") || null,
    keyRisks: parseStringArray(row["key_risks"]),
    keyStrengths: parseStringArray(row["key_strengths"]),
    whatToWatch: parseStringArray(row["what_to_watch"]),
  };
}

function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p.map(String) : []; } catch { return []; }
  }
  return [];
}

export async function buildSnapshot(symbol: string): Promise<StockPageSnapshot> {
  const clean = symbol.toUpperCase().trim();
  const [quoteResult, priceHistoryResult, healthometerResult, investContextResult] = await Promise.allSettled([
    fetchQuote(clean),
    fetchPriceHistory(clean),
    fetchHealthometer(clean),
    fetchInvestContext(clean),
  ]);

  const quote = quoteResult.status === "fulfilled" ? quoteResult.value : { price: null, change: null, changePercent: null, updatedAt: null };
  const priceHistory = priceHistoryResult.status === "fulfilled" ? priceHistoryResult.value : [];
  const healthometer = healthometerResult.status === "fulfilled" ? healthometerResult.value : { overallScore: null, label: null, dimensions: [] };
  const investContext = investContextResult.status === "fulfilled" ? investContextResult.value : null;

  const hasQuote = quote.price !== null;
  const hasHistory = priceHistory.length > 0;
  const hasHealthometer = healthometer.overallScore !== null;

  const dimCount = healthometer.dimensions.filter((d) => d.score !== null).length;
  const analysisMeters: StockPageSnapshot["analysisMeters"] = [];

  if (dimCount > 0) {
    const momentumDim = healthometer.dimensions.find((d) => d.id === "momentum");
    if (momentumDim) {
      analysisMeters.push({
        key: "momentum", label: "Momentum", value: momentumDim.score,
        interpretation: momentumDim.score !== null ? (momentumDim.score >= 65 ? "Positive momentum" : momentumDim.score >= 45 ? "Mixed signals" : "Weakening") : null,
        status: momentumDim.score !== null ? (momentumDim.score >= 65 ? "strong" : momentumDim.score >= 45 ? "neutral" : "caution") : "not_enough_information",
      });
    }
    const riskDim = healthometer.dimensions.find((d) => d.id === "risk");
    if (riskDim && riskDim.score !== null) {
      analysisMeters.push({
        key: "risk", label: "Risk score", value: riskDim.score,
        interpretation: riskDim.score >= 65 ? "Lower risk profile" : riskDim.score >= 45 ? "Moderate risk" : "Elevated risk",
        status: riskDim.score >= 65 ? "strong" : riskDim.score >= 45 ? "neutral" : "caution",
      });
    }
    const qualityDim = healthometer.dimensions.find((d) => d.id === "quality");
    if (qualityDim && qualityDim.score !== null) {
      analysisMeters.push({
        key: "quality", label: "Quality", value: qualityDim.score,
        interpretation: qualityDim.score >= 65 ? "Strong business quality" : qualityDim.score >= 45 ? "Adequate quality" : "Below average",
        status: qualityDim.score >= 65 ? "strong" : qualityDim.score >= 45 ? "neutral" : "caution",
      });
    }
  }

  const quoteDate = quote.updatedAt?.slice(0, 10) ?? null;
  const latestExpected = latestIndianTradingSession();
  const quoteIsCurrent = Boolean(quoteDate && quoteDate >= latestExpected);
  let freshnessState: SnapshotFreshnessState = "partial";
  if (hasQuote && hasHistory && hasHealthometer && quoteIsCurrent) freshnessState = "fresh";
  else if (hasQuote || hasHistory || hasHealthometer) freshnessState = "stale";

  const snapshot: StockPageSnapshot = {
    symbol: clean,
    companyName: clean,
    sector: null,
    updatedAt: new Date().toISOString(),
    freshnessState,
    quote,
    priceHistory,
    healthometer,
    analysisMeters,
    financialSeries: [],
    news: [],
    trendlyne: { available: false, widgetUrl: null, widgetMode: "disabled" },
    investContext,
  };

  return snapshot;
}

export async function getSnapshot(symbol: string): Promise<{ snapshot: StockPageSnapshot | null; state: "available" | "partial" | "missing" }> {
  const clean = symbol.toUpperCase().trim();
  const cached = getCachedSnapshot(clean);
  if (cached) return { snapshot: cached, state: cached.freshnessState === "partial" ? "partial" : "available" };
  const dbSnap = await getSnapshotFromDb(clean);
  if (dbSnap) {
    setCachedSnapshot(clean, dbSnap);
    return { snapshot: dbSnap, state: dbSnap.freshnessState === "partial" ? "partial" : "available" };
  }
  return { snapshot: null, state: "missing" };
}
