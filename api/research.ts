// api/research.ts — Self-contained Vercel serverless function
// No src/ imports — calls external APIs directly (Yahoo Finance, IndianAPI)
// Routes via ?action= scanner | compare | watchlist | broker
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ── Compact Stock Universe (~85 major NSE/BSE stocks) ────────────────────────
const UNIVERSE: { sym: string; name: string; sector: string }[] = [
  { sym: "TCS", name: "Tata Consultancy Services", sector: "IT" },
  { sym: "INFY", name: "Infosys", sector: "IT" },
  { sym: "WIPRO", name: "Wipro", sector: "IT" },
  { sym: "HCLTECH", name: "HCL Technologies", sector: "IT" },
  { sym: "TECHM", name: "Tech Mahindra", sector: "IT" },
  { sym: "LTIM", name: "LTIMindtree", sector: "IT" },
  { sym: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { sym: "ONGC", name: "Oil & Natural Gas Corp", sector: "Energy" },
  { sym: "NTPC", name: "NTPC", sector: "Energy" },
  { sym: "POWERGRID", name: "Power Grid Corp", sector: "Energy" },
  { sym: "COALINDIA", name: "Coal India", sector: "Energy" },
  { sym: "HDFCBANK", name: "HDFC Bank", sector: "Financials" },
  { sym: "ICICIBANK", name: "ICICI Bank", sector: "Financials" },
  { sym: "SBIN", name: "State Bank of India", sector: "Financials" },
  { sym: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financials" },
  { sym: "AXISBANK", name: "Axis Bank", sector: "Financials" },
  { sym: "BAJFINANCE", name: "Bajaj Finance", sector: "Financials" },
  { sym: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financials" },
  { sym: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
  { sym: "ITC", name: "ITC", sector: "FMCG" },
  { sym: "NESTLEIND", name: "Nestle India", sector: "FMCG" },
  { sym: "BRITANNIA", name: "Britannia Industries", sector: "FMCG" },
  { sym: "TATACONSUM", name: "Tata Consumer Products", sector: "FMCG" },
  { sym: "DMART", name: "Avenue Supermarts", sector: "Retail" },
  { sym: "TITAN", name: "Titan Company", sector: "Consumer" },
  { sym: "ASIANPAINT", name: "Asian Paints", sector: "Consumer" },
  { sym: "MARUTI", name: "Maruti Suzuki India", sector: "Auto" },
  { sym: "TATAMOTORS", name: "Tata Motors", sector: "Auto" },
  { sym: "M&M", name: "Mahindra & Mahindra", sector: "Auto" },
  { sym: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Auto" },
  { sym: "EICHERMOT", name: "Eicher Motors", sector: "Auto" },
  { sym: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto" },
  { sym: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma" },
  { sym: "DRREDDY", name: "Dr Reddys Laboratories", sector: "Pharma" },
  { sym: "CIPLA", name: "Cipla", sector: "Pharma" },
  { sym: "DIVISLAB", name: "Divis Laboratories", sector: "Pharma" },
  { sym: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare" },
  { sym: "LT", name: "Larsen & Toubro", sector: "Construction" },
  { sym: "ADANIENT", name: "Adani Enterprises", sector: "Construction" },
  { sym: "ADANIPORTS", name: "Adani Ports & SEZ", sector: "Construction" },
  { sym: "ULTRACEMCO", name: "UltraTech Cement", sector: "Construction" },
  { sym: "GRASIM", name: "Grasim Industries", sector: "Construction" },
  { sym: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
  { sym: "JIOFIN", name: "Jio Financial Services", sector: "Financials" },
  { sym: "HINDZINC", name: "Hindustan Zinc", sector: "Metals" },
  { sym: "HINDALCO", name: "Hindalco Industries", sector: "Metals" },
  { sym: "TATASTEEL", name: "Tata Steel", sector: "Metals" },
  { sym: "JSWSTEEL", name: "JSW Steel", sector: "Metals" },
  { sym: "VEDL", name: "Vedanta", sector: "Metals" },
  { sym: "BEL", name: "Bharat Electronics", sector: "Defence" },
  { sym: "HAL", name: "Hindustan Aeronautics", sector: "Defence" },
  { sym: "IRCTC", name: "Indian Railway Catering", sector: "Railways" },
  { sym: "ZOMATO", name: "Zomato", sector: "Internet" },
  { sym: "PAYTM", name: "One97 Communications", sector: "Fintech" },
  { sym: "POLICYBZR", name: "PB Fintech", sector: "Fintech" },
  { sym: "NYKAA", name: "FSN E-Commerce (Nykaa)", sector: "Internet" },
  { sym: "TRENT", name: "Trent", sector: "Retail" },
  { sym: "PIDILITIND", name: "Pidilite Industries", sector: "Chemicals" },
  { sym: "SRF", name: "SRF", sector: "Chemicals" },
  { sym: "SIEMENS", name: "Siemens India", sector: "Capital Goods" },
  { sym: "ABB", name: "ABB India", sector: "Capital Goods" },
  { sym: "HAVELLS", name: "Havells India", sector: "Consumer" },
  { sym: "VOLTAS", name: "Voltas", sector: "Consumer" },
  { sym: "BERGEPAINT", name: "Berger Paints", sector: "Consumer" },
  { sym: "DABUR", name: "Dabur India", sector: "FMCG" },
  { sym: "MARICO", name: "Marico", sector: "FMCG" },
  { sym: "GODREJCP", name: "Godrej Consumer Products", sector: "FMCG" },
  { sym: "COLPAL", name: "Colgate-Palmolive India", sector: "FMCG" },
  { sym: "BIOCON", name: "Biocon", sector: "Pharma" },
  { sym: "LUPIN", name: "Lupin", sector: "Pharma" },
  { sym: "AUROPHARMA", name: "Aurobindo Pharma", sector: "Pharma" },
  { sym: "TORNTPHARM", name: "Torrent Pharmaceuticals", sector: "Pharma" },
  { sym: "INDIGO", name: "InterGlobe Aviation", sector: "Aviation" },
  { sym: "BPCL", name: "Bharat Petroleum", sector: "Energy" },
  { sym: "IOC", name: "Indian Oil Corporation", sector: "Energy" },
  { sym: "GAIL", name: "GAIL India", sector: "Energy" },
  { sym: "AMBUJACEM", name: "Ambuja Cements", sector: "Construction" },
  { sym: "SHREECEM", name: "Shree Cement", sector: "Construction" },
  { sym: "DLF", name: "DLF", sector: "Realty" },
  { sym: "GODREJPROP", name: "Godrej Properties", sector: "Realty" },
  { sym: "PFC", name: "Power Finance Corp", sector: "Financials" },
  { sym: "RECLTD", name: "REC", sector: "Financials" },
  { sym: "CHOLAFIN", name: "Cholamandalam Investment", sector: "Financials" },
  { sym: "MUTHOOTFIN", name: "Muthoot Finance", sector: "Financials" },
];

// ── Constants ────────────────────────────────────────────────────────────────
const CACHE = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 120_000;
const watchlists = new Map<string, Set<string>>();

// ── Helpers ──────────────────────────────────────────────────────────────────
function getUserId(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  return typeof fwd === "string" ? fwd.split(",")[0].trim() : "anonymous";
}
function getUserWatchlist(uid: string): Set<string> {
  if (!watchlists.has(uid)) watchlists.set(uid, new Set());
  return watchlists.get(uid)!;
}
function generateState(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function n(v: unknown): number | null {
  if (v == null || v === "") return null;
  const p = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : null;
}

// ── Yahoo Finance (real-time quote) ──────────────────────────────────────────
async function yahooQuote(symbol: string): Promise<{
  price: number; change: number; changePercent: number; volume: number; marketCap: number;
  pe: number | null; pb: number | null; roe: number | null; eps: number | null;
  dividendYield: number | null; name: string; sector: string;
} | null> {
  try {
    const ticker = `${symbol}.NS`;
    const [chartR, quoteR] = await Promise.all([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1m`, {
        headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" }, signal: AbortSignal.timeout(5_000),
      }),
      fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`, {
        headers: { "User-Agent": "Mozilla/5.0 StockStory/2.0" }, signal: AbortSignal.timeout(5_000),
      }),
    ]);
    const chartD = chartR.ok ? await chartR.json() : null;
    const quoteD = quoteR.ok ? await quoteR.json() : null;
    const meta = chartD?.chart?.result?.[0]?.meta ?? {};
    const closes = (chartD?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []).filter((v: unknown) => v !== null);
    const latest = closes[closes.length - 1] ?? meta.regularMarketPrice ?? 0;
    const prev = meta.chartPreviousClose ?? latest;
    const q = quoteD?.quoteResponse?.result?.[0] ?? {};
    return {
      price: Number(latest.toFixed(2)),
      change: Number((latest - prev).toFixed(2)),
      changePercent: prev > 0 ? Number((((latest - prev) / prev) * 100).toFixed(2)) : 0,
      volume: meta.regularMarketVolume ?? q.regularMarketVolume ?? 0,
      marketCap: meta.marketCap ?? q.marketCap ?? 0,
      pe: n(q.trailingPE) ?? null,
      pb: n(q.priceToBook) ?? null,
      roe: n(q.returnOnEquity) ?? null,
      eps: n(q.epsTrailingTwelveMonths) ?? null,
      dividendYield: n(q.dividendYield) ?? null,
      name: q.shortName || q.longName || symbol,
      sector: q.sector || "",
    };
  } catch { return null; }
}

// ── IndianAPI fundamentals ───────────────────────────────────────────────────
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

// ── Synthesize fundamentals from Yahoo + IndianAPI ───────────────────────────
async function getFundamentals(sym: string, entry: { name: string; sector: string }) {
  const [yahoo, fund] = await Promise.all([yahooQuote(sym), indianApiFunds(sym)]);
  const quoteData = yahoo || { price: 0, change: 0, changePercent: 0, volume: 0, marketCap: 0, pe: null, pb: null, roe: null, eps: null, dividendYield: null, name: entry.name, sector: entry.sector };

  return {
    symbol: sym,
    companyName: quoteData.name || entry.name,
    sector: entry.sector || quoteData.sector || "Uncategorized",
    price: quoteData.price,
    change: quoteData.change,
    changePercent: quoteData.changePercent,
    marketCap: quoteData.marketCap,
    pe: n(fund.pe_ratio) ?? quoteData.pe ?? null,
    pb: n(fund.pb_ratio) ?? quoteData.pb ?? null,
    roe: n(fund.roe ?? fund.return_on_equity) ?? quoteData.roe ?? null,
    debtToEquity: n(fund.debt_to_equity) ?? null,
    eps: n(fund.eps) ?? quoteData.eps ?? null,
    dividendYield: n(fund.dividend_yield) ?? quoteData.dividendYield ?? null,
    revenueGrowth: n(fund.revenue_growth_3y ?? fund.revenue_growth) ?? null,
    profitGrowth: n(fund.profit_growth_3y ?? fund.profit_growth) ?? null,
    interestCoverage: n(fund.interest_coverage) ?? null,
    source: { price: yahoo ? "yahoo" : "none", fundamentals: Object.keys(fund).length > 0 ? "indianapi" : yahoo ? "yahoo" : "none" },
  };
}

// ── Scoring (inline, self-contained) ─────────────────────────────────────────
function computeScores(f: Awaited<ReturnType<typeof getFundamentals>>) {
  const quality = scoreOutOf100([
    { v: f.roe, w: 0.40, ideal: 20 },
    { v: f.debtToEquity ? 1 / Math.max(f.debtToEquity, 0.01) : null, w: 0.30, ideal: 2 },
    { v: f.eps, w: 0.20, ideal: 50 },
    { v: f.interestCoverage, w: 0.10, ideal: 5 },
  ]);
  const valuation = scoreOutOf100([
    { v: f.pe ? 1 / Math.max(f.pe, 1) : null, w: 0.50, ideal: 0.05 },
    { v: f.pb ? 1 / Math.max(f.pb, 0.1) : null, w: 0.30, ideal: 0.5 },
    { v: f.dividendYield, w: 0.20, ideal: 3 },
  ]);
  const growth = scoreOutOf100([
    { v: f.revenueGrowth, w: 0.40, ideal: 20 },
    { v: f.profitGrowth, w: 0.40, ideal: 20 },
    { v: f.eps, w: 0.20, ideal: 30 },
  ]);
  const risk = scoreOutOf100([
    { v: f.debtToEquity ? Math.max(0, 1 - f.debtToEquity / 3) * 100 : null, w: 0.40, ideal: 100 },
    { v: f.interestCoverage, w: 0.30, ideal: 10 },
    { v: f.roe, w: 0.30, ideal: 15 },
  ]);
  const stability = scoreOutOf100([
    { v: f.revenueGrowth !== null ? 100 - Math.abs(f.revenueGrowth) : null, w: 0.40, ideal: 80 },
    { v: f.dividendYield, w: 0.30, ideal: 2 },
    { v: quality, w: 0.30, ideal: 70, raw: true },
  ]);
  const momentum = scoreOutOf100([
    { v: f.changePercent !== null ? clamp(f.changePercent + 5, 0, 50) * 2 : null, w: 0.50, ideal: 60 },
    { v: growth, w: 0.30, ideal: 60, raw: true },
    { v: f.profitGrowth, w: 0.20, ideal: 15 },
  ]);
  return { quality, valuation, growth, risk, stability, momentum };
}

function scoreOutOf100(factors: { v: number | null; w: number; ideal: number; raw?: boolean }[]): number | null {
  let totalW = 0, totalS = 0;
  for (const f of factors) {
    if (f.v === null || f.ideal === 0) continue;
    const s = f.raw ? f.v : clamp((f.v / f.ideal) * 100, 0, 100);
    totalS += s * f.w;
    totalW += f.w;
  }
  return totalW > 0 ? clamp(Math.round(totalS / totalW), 1, 99) : null;
}

// ── Preset definitions ───────────────────────────────────────────────────────
interface PresetDef {
  id: string; w: Record<string, number>; explanation: string; riskCaveat: string;
}
const PRESETS: Record<string, PresetDef> = {
  quality: { id: "Quality compounders", w: { quality: 0.40, stability: 0.20, growth: 0.15, valuation: 0.10, momentum: 0.10, risk: 0.05 }, explanation: "Companies with strong and consistent quality metrics", riskCaveat: "Quality premium may already be priced in" },
  value: { id: "Undervalued quality", w: { quality: 0.30, valuation: 0.30, growth: 0.10, risk: 0.15, momentum: 0.10, stability: 0.05 }, explanation: "Quality businesses trading at attractive valuations", riskCaveat: "Value traps possible — verify thesis before investing" },
  momentum: { id: "Improving momentum", w: { momentum: 0.35, growth: 0.25, quality: 0.15, valuation: 0.10, risk: 0.10, stability: 0.05 }, explanation: "Companies with improving price momentum and growth trajectory", riskCaveat: "Momentum can reverse quickly — monitor thesis regularly" },
  stable: { id: "Dividend stability", w: { stability: 0.30, quality: 0.25, risk: 0.20, valuation: 0.15, growth: 0.05, momentum: 0.05 }, explanation: "Companies with consistent dividend-paying ability", riskCaveat: "Past dividend stability does not guarantee future payments" },
  "low-debt": { id: "Low debt leaders", w: { risk: 0.35, quality: 0.25, stability: 0.15, growth: 0.10, valuation: 0.10, momentum: 0.05 }, explanation: "Companies with strong balance sheets and low leverage", riskCaveat: "Low debt alone does not guarantee returns" },
  growth: { id: "Earnings acceleration", w: { growth: 0.40, momentum: 0.20, quality: 0.15, valuation: 0.10, risk: 0.10, stability: 0.05 }, explanation: "Companies showing accelerating earnings growth", riskCaveat: "Growth may not be sustainable — verify earnings quality" },
  "risk-rising": { id: "Risk rising", w: { risk: 0.40, quality: 0.20, stability: 0.15, valuation: 0.10, growth: 0.10, momentum: 0.05 }, explanation: "Companies showing elevated risk indicators", riskCaveat: "Higher risk companies need closer thesis monitoring" },
  turnaround: { id: "Turnaround watch", w: { risk: 0.30, valuation: 0.25, momentum: 0.15, quality: 0.10, growth: 0.10, stability: 0.10 }, explanation: "Companies that may be undergoing a turnaround", riskCaveat: "Turnarounds are uncertain — track before investing" },
  contrarian: { id: "Good businesses out of favour", w: { quality: 0.35, valuation: 0.25, risk: 0.15, stability: 0.10, growth: 0.10, momentum: 0.05 }, explanation: "Quality businesses facing temporary headwinds", riskCaveat: "Ensure headwinds are truly temporary before investing" },
  expensive: { id: "High quality, expensive", w: { quality: 0.40, valuation: 0.15, growth: 0.15, stability: 0.10, risk: 0.10, momentum: 0.10 }, explanation: "Premium quality companies trading at premium valuations", riskCaveat: "Valuation premium leaves limited margin of safety" },
};

function weightedScore(scores: Record<string, number | null>, weights: Record<string, number>): number | null {
  let totalW = 0, totalS = 0;
  for (const [k, w] of Object.entries(weights)) {
    const s = scores[k];
    if (s === null || s === undefined) continue;
    totalS += s * w;
    totalW += w;
  }
  return totalW > 0 ? clamp(Math.round(totalS / totalW), 1, 99) : null;
}

function convictionLabel(score: number | null): string {
  if (score === null) return "Research signals pending";
  if (score >= 75) return "Very Healthy";
  if (score >= 55) return "Healthy";
  if (score >= 35) return "Needs review";
  return "Risk rising";
}

function topContributors(scores: Record<string, number | null>, weights: Record<string, number>): string[] {
  return Object.entries(weights)
    .filter(([k]) => scores[k] !== null)
    .sort(([, aW], [, bW]) => bW - aW)
    .slice(0, 3)
    .map(([k]) => `${k}: ${scores[k]}`);
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(
    Array.isArray(req.query.action) ? req.query.action[0] : req.query.action || "scanner"
  ).toLowerCase();

  // ── SCANNER ──────────────────────────────────────────────────────────────
  if (action === "scanner") {
    const presetKey = String(
      Array.isArray(req.query.preset) ? req.query.preset[0] : req.query.preset || "quality"
    ).toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 50);
    const preset = PRESETS[presetKey] || PRESETS.quality;

    const cacheKey = `scanner:${presetKey}:${limit}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, s-maxage=120");
      return res.status(200).json(cached.data);
    }

    try {
      const batch = UNIVERSE.slice(0, limit + 15);
      const allFundamentals = await Promise.all(
        batch.map(e => getFundamentals(e.sym, e).catch(() => null))
      );

      const results: Array<{
        symbol: string; companyName: string; sector: string; rank: number;
        conviction: string; score: number | null; keyReason: string;
        riskMarker: string | null; oneLineThesis: string;
      }> = [];

      for (const f of allFundamentals) {
        if (!f || f.price <= 0) continue;
        const scores = computeScores(f);
        const ws = weightedScore(scores, preset.w);
        if (ws === null) continue;
        const topC = topContributors(scores, preset.w);
        if (topC.length === 0) continue;

        results.push({
          symbol: f.symbol, companyName: f.companyName, sector: f.sector, rank: 0,
          conviction: convictionLabel(ws), score: ws,
          keyReason: topC[0],
          riskMarker: preset.riskCaveat,
          oneLineThesis: `${preset.explanation}: ${topC.slice(0, 2).join(", ")}.`,
        });
      }

      results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      const final = results.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));

      const payload = {
        action: "scanner", preset: presetKey, presetLabel: preset.id,
        explanation: preset.explanation, riskCaveat: preset.riskCaveat,
        total: final.length, results: final,
      };

      CACHE.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL });
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", "public, s-maxage=120");
      return res.status(200).json(payload);
    } catch (err) {
      return res.status(502).json({ error: err instanceof Error ? err.message : String(err), action: "scanner" });
    }
  }

  // ── COMPARE ──────────────────────────────────────────────────────────────
  if (action === "compare") {
    const rawSymbols = Array.isArray(req.query.symbols)
      ? req.query.symbols[0] : req.query.symbols;
    if (!rawSymbols) return res.status(400).json({ error: "symbols required", usage: "/api/research?action=compare&symbols=TCS,INFY" });

    const symbols = String(rawSymbols).split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    if (symbols.length < 2) return res.status(400).json({ error: "Need at least 2 symbols" });
    if (symbols.length > 5) return res.status(400).json({ error: "Maximum 5 symbols" });

    const cacheKey = `compare:${symbols.slice().sort().join(",")}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached.data);
    }

    const entries = symbols.map(s => UNIVERSE.find(u => u.sym === s) || { sym: s, name: s, sector: "" });
    const allFund = await Promise.all(symbols.map((s, i) => getFundamentals(entries[i].sym, entries[i]).catch(() => null)));

    const companies = allFund.map((f, i) => {
      if (!f) return { symbol: symbols[i], companyName: entries[i].name, scores: {} as Record<string, number | null>, strengths: [], risks: [] };
      const scores = computeScores(f);
      const strengths = Object.entries(scores).filter(([, v]) => v !== null && v >= 60).map(([k]) => k);
      const risks = Object.entries(scores).filter(([, v]) => v !== null && v < 40).map(([k]) => k);
      return { symbol: f.symbol, companyName: f.companyName, scores, strengths, risks };
    });

    const factorKeys = ["quality", "valuation", "growth", "risk", "stability", "momentum"];
    const factorComparison = factorKeys.map(key => {
      const vals = companies.map(c => c.scores[key]).filter(v => v !== null) as number[];
      return { factor: key, best: vals.length > 0 ? symbols[companies.findIndex(c => c.scores[key] === Math.max(...vals))] : null, worst: vals.length > 0 ? symbols[companies.findIndex(c => c.scores[key] === Math.min(...vals))] : null };
    });

    const payload = {
      action: "compare", companies, factorComparison, comparedSymbols: symbols,
      recommendation: companies.length >= 2 ? `${companies[0].companyName} leads on fundamental quality` : null,
      _dataSource: "yahoo_indianapi",
    };

    CACHE.set(cacheKey, { data: payload, expiresAt: Date.now() + CACHE_TTL });
    res.setHeader("Cache-Control", "public, s-maxage=120");
    return res.status(200).json(payload);
  }

  // ── WATCHLIST ────────────────────────────────────────────────────────────
  if (action === "watchlist") {
    const uid = getUserId(req);
    const wl = getUserWatchlist(uid);

    if (req.method === "GET") {
      const symbols = Array.from(wl);
      const items = await Promise.all(symbols.map(async (sym) => {
        const entry = UNIVERSE.find(u => u.sym === sym) || { sym, name: sym, sector: "" };
        const f = await getFundamentals(entry.sym, entry).catch(() => null);
        const scores = f ? computeScores(f) : null;
        return {
          symbol: sym, name: f?.companyName || entry.name,
          price: f?.price ?? null, change: f?.change ?? null, changePercent: f?.changePercent ?? null,
          score: scores ? weightedScore(scores, PRESETS.quality.w) : null,
          conviction: scores ? convictionLabel(weightedScore(scores, PRESETS.quality.w)) : null,
        };
      }));
      res.setHeader("Cache-Control", "private, max-age=60");
      return res.status(200).json({ action: "watchlist", userId: uid, items, count: items.length });
    }

    if (req.method === "POST") {
      const body = req.body as { symbol?: string; symbols?: string[] };
      const toAdd = body?.symbols || (body?.symbol ? [body.symbol] : []);
      if (toAdd.length === 0) return res.status(400).json({ error: "symbol or symbols[] required" });
      const added: string[] = [];
      for (const s of toAdd) {
        const clean = s.toUpperCase().trim();
        if (clean && !wl.has(clean)) { wl.add(clean); added.push(clean); }
      }
      return res.status(200).json({ action: "watchlist", added, watchlistSize: wl.size });
    }

    if (req.method === "DELETE") {
      const symbol = String(
        Array.isArray(req.query.symbol) ? req.query.symbol[0] : req.query.symbol || ""
      ).toUpperCase().trim();
      if (!symbol) return res.status(400).json({ error: "symbol required" });
      return res.status(200).json({ action: "watchlist", removed: wl.delete(symbol), watchlistSize: wl.size });
    }

    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── BROKER ───────────────────────────────────────────────────────────────
  if (action === "broker") {
    if (req.method === "POST") {
      const { broker, action: brokerAction, redirectUri, code } = req.body || {} as Record<string, string>;
      const brokerName = (broker || "upstox").toLowerCase();

      if (brokerAction === "auth_url" || !brokerAction) {
        if (!redirectUri) return res.status(400).json({ error: "redirectUri required" });
        if (brokerName === "upstox") {
          const clientId = process.env.UPSTOX_CLIENT_ID || "";
          if (!clientId) return res.status(503).json({ error: "Upstox not configured", broker: brokerName });
          const state = generateState();
          const authUrl = `https://api.upstox.com/v2/login/authorization/dialog` +
            `?client_id=${encodeURIComponent(clientId)}` +
            `&redirect_uri=${encodeURIComponent(redirectUri)}` +
            `&response_type=code&state=${encodeURIComponent(state)}`;
          return res.status(200).json({ action: "broker", broker: brokerName, authUrl, state });
        }
        return res.status(400).json({ error: `Unknown broker: ${brokerName}` });
      }

      if (brokerAction === "exchange") {
        if (!code) return res.status(400).json({ error: "code required" });
        if (brokerName === "upstox") {
          const clientId = process.env.UPSTOX_CLIENT_ID || "";
          const clientSecret = process.env.UPSTOX_CLIENT_SECRET || "";
          if (!clientId || !clientSecret) return res.status(503).json({ error: "Upstox credentials not configured" });
          try {
            const tokenRes = await fetch("https://api.upstox.com/v2/login/authorization/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
              body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri || "", grant_type: "authorization_code" }).toString(),
              signal: AbortSignal.timeout(10_000),
            });
            const data = await tokenRes.json();
            if (!tokenRes.ok) return res.status(502).json({ error: data?.errors?.[0]?.message || "Token exchange failed" });
            return res.status(200).json({ action: "broker", broker: brokerName, accessToken: data.access_token, tokenType: data.token_type || "Bearer", expiresIn: data.expires_in });
          } catch (err) {
            return res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
      return res.status(400).json({ error: `Unknown action: ${brokerAction}` });
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(400).json({ error: `Unknown action: ${action}`, validActions: ["scanner", "compare", "watchlist", "broker"] });
}
