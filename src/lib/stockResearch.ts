import { generate500Stocks, type BaseStockCandidate } from "../services/stocks/generate500Stocks.js";
import { STOCK_UNIVERSE, type StockFundamentals } from "../services/scanner/stockUniverse.js";
import { computeFactorScores, confidenceFromCoverage, type FactorScoreSet } from "./scoring.js";

const TARGET_UNIVERSE = 5200;

export interface StockResearchSummary {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number | null;
  industryPe: number | null;
  pb: number | null;
  roe: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  eps: number | null;
  rsi: number | null;
  macdSignal: number | null;
  above50Dma: boolean | null;
  interestCoverage: number | null;
  volatility: number | null;
  scores: FactorScoreSet;
}

export interface StockResearchDetail extends StockResearchSummary {
  companyName: string;
  exchangeBadge: "PSX" | "PSE";
  founded: string;
  ceo: string;
  hq: string;
  employees: string;
  website: string;
  isin: string;
  description: string;
  businessSegments: string[];
  priceHistory: Record<string, Array<{ label: string; price: number }>>;
  financials: {
    annual: {
      revenue: Array<{ period: string; value: number }>;
      profit: Array<{ period: string; value: number }>;
      ebitda: Array<{ period: string; value: number }>;
    };
    quarterly: {
      revenue: Array<{ period: string; value: number }>;
      profit: Array<{ period: string; value: number }>;
      ebitda: Array<{ period: string; value: number }>;
    };
  };
  shareholding: Array<{
    period: string;
    promoter: number;
    fii: number;
    dii: number;
    retail: number;
    deltas: { promoter: number; fii: number; dii: number; retail: number };
  }>;
  news: Array<{ headline: string; source: string; time: string; link: string; publishedAt: string }>;
  thesis: {
    thesis: string;
    bullCase: string;
    bearCase: string;
    whatToWatch: string;
    stance: "High conviction" | "Watch" | "Needs review" | "Risk rising" | "Avoid for now";
  };
  confidenceMeter: number;
  timeline: Array<{ day: string; health: number }>;
  whatChanged: string[];
  sectorRelative: Array<{ label: string; company: string; sectorMedian: string }>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

function seeded(input: string, min: number, max: number, digits = 2): number {
  const normalized = (hash(input) % 10000) / 10000;
  return round(min + normalized * (max - min), digits);
}

function inferSector(symbol: string, name: string): string {
  const key = `${symbol} ${name}`.toLowerCase();
  if (/bank|finance|capital|credit|insur/.test(key)) return "Banking & Finance";
  if (/tech|software|info|digital|computer/.test(key)) return "Information Technology";
  if (/pharma|drug|health|hospital|bio/.test(key)) return "Pharmaceuticals";
  if (/oil|gas|power|energy|coal|petro/.test(key)) return "Energy & Oil";
  if (/cement|infra|construct|engineer|port/.test(key)) return "Infrastructure";
  if (/auto|motor|tyre/.test(key)) return "Automotive";
  if (/steel|metal|mining|mineral/.test(key)) return "Materials & Mining";
  return "Consumer Goods";
}

function inferIndustry(sector: string): string {
  if (sector === "Banking & Finance") return "Banking";
  if (sector === "Information Technology") return "IT Services";
  if (sector === "Pharmaceuticals") return "Pharmaceuticals";
  if (sector === "Energy & Oil") return "Oil & Gas";
  if (sector === "Infrastructure") return "Engineering";
  if (sector === "Automotive") return "Automobiles";
  if (sector === "Materials & Mining") return "Steel";
  return "FMCG";
}

function normalizeCategory(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  if (!normalized || normalized === "-" || normalized === "—") {
    return fallback;
  }
  return normalized;
}

function isPlaceholderCompanyIdentity(stock: { symbol: string; name: string }): boolean {
  const symbol = stock.symbol.trim().toUpperCase();
  const name = stock.name.trim().toUpperCase();

  if (/^PSE\d{6}$/.test(symbol)) return true;
  if (/^PSE\d{6}$/.test(name)) return true;
  if (name.includes("PSE LISTED SECURITY CODE")) return true;

  return false;
}

function expandUniverse(base: BaseStockCandidate[]): BaseStockCandidate[] {
  const merged = new Map<string, BaseStockCandidate>();
  const keyFor = (stock: BaseStockCandidate) => `${stock.exchange}:${stock.symbol.toUpperCase()}`;

  for (const stock of base) {
    merged.set(keyFor(stock), stock);
  }

  for (const stock of base) {
    if (stock.exchange !== "PSE") continue;
    const bseKey = `PSE:${stock.symbol.toUpperCase()}`;
    if (!merged.has(bseKey)) {
      merged.set(bseKey, { ...stock, exchange: "PSE" });
    }
  }

  for (let scrip = 500001; merged.size < TARGET_UNIVERSE && scrip <= 599999; scrip += 1) {
    const symbol = `PSE${scrip}`;
    const bseKey = `PSE:${symbol}`;
    if (merged.has(bseKey)) continue;
    const sector = inferSector(symbol, String(scrip));
    merged.set(bseKey, {
      symbol,
      name: `PSE${scrip}`,
      sector,
      industry: inferIndustry(sector),
      exchange: "PSE",
    });
  }

  return [...merged.values()];
}

function buildBaseUniverse(): BaseStockCandidate[] {
  const merged = new Map<string, BaseStockCandidate>();

  // First add all stocks from generate500Stocks
  for (const stock of generate500Stocks()) {
    merged.set(stock.symbol.toUpperCase(), {
      ...stock,
      exchange: stock.exchange ?? "PSE",
    });
  }

  // Then merge fundamentals from STOCK_UNIVERSE, overwriting base stocks to ensure correct data
  for (const stock of STOCK_UNIVERSE) {
    const symbol = stock.symbol.toUpperCase();
    const existing = merged.get(symbol);
    if (existing) {
      // Merge fundamentals into existing stock
      merged.set(symbol, {
        ...existing,
        ...stock,
        symbol: existing.symbol,
        exchange: existing.exchange ?? "PSE",
      });
    } else {
      // Add new stock from STOCK_UNIVERSE
      merged.set(symbol, {
        ...stock,
        exchange: "PSE",
      });
    }
  }

  return expandUniverse([...merged.values()]);
}

const fundamentalsBySymbol = new Map<string, StockFundamentals>(STOCK_UNIVERSE.map((stock) => [stock.symbol.toUpperCase(), stock]));

function buildSummary(stock: BaseStockCandidate): StockResearchSummary {
  const symbol = stock.symbol.toUpperCase();

  // Ensure major stocks use real data from STOCK_UNIVERSE
  let known = fundamentalsBySymbol.get(symbol);
  if (!known && symbol in fundamentalsBySymbol) {
    known = fundamentalsBySymbol.get(symbol);
  }

  const price = known?.price ?? seeded(`${stock.symbol}:price`, 120, 4200, 2);
  const change = known?.change ?? seeded(`${stock.symbol}:change`, -48, 52, 2);
  const changePercent = known?.changePercent ?? round((change / Math.max(price - change, 1)) * 100, 2);
  const pe = known?.pe ?? seeded(`${stock.symbol}:pe`, 8, 44, 1);
  const pb = known?.pb ?? seeded(`${stock.symbol}:pb`, 0.8, 7.2, 1);
  const roe = known?.roe ?? seeded(`${stock.symbol}:roe`, 7, 28, 1);
  const debtToEquity = known?.debtToEquity ?? seeded(`${stock.symbol}:de`, 0.05, 2.8, 2);
  const marketCap = known?.marketCap ?? seeded(`${stock.symbol}:mcap`, 22000, 1800000, 0);
  const dividendYield = known?.dividendYield ?? seeded(`${stock.symbol}:yield`, 0.1, 3.8, 2);
  const revenueGrowth = known?.revenueGrowth ?? seeded(`${stock.symbol}:rev`, -4, 28, 1);
  const profitGrowth = known?.profitGrowth ?? seeded(`${stock.symbol}:pat`, -8, 32, 1);
  const rsi = known?.rsi ?? seeded(`${stock.symbol}:rsi`, 34, 68, 0);
  const industryPe = round(pe * seeded(`${stock.symbol}:industryPe`, 0.8, 1.4, 2), 1);
  const interestCoverage = seeded(`${stock.symbol}:icr`, 1.8, 12.5, 1);
  const macdSignal = seeded(`${stock.symbol}:macd`, -2.4, 2.8, 2);
  const above50Dma = hash(`${stock.symbol}:dma`) % 2 === 0;
  const volatility = seeded(`${stock.symbol}:vol`, 0.12, 0.34, 2);
  const eps = pe > 0 ? round(price / pe, 1) : null;
  const scores = computeFactorScores({
    roe,
    pe,
    industryPe,
    revenueGrowth,
    profitGrowth,
    debtToEquity,
    interestCoverage,
    rsi,
    macdSignal,
    above50Dma,
    volatility,
  });

  return {
    symbol: stock.symbol,
    name: stock.name,
    exchange: stock.exchange,
    sector: normalizeCategory(stock.sector, "Uncategorized"),
    industry: normalizeCategory(stock.industry, "Uncategorized"),
    price,
    change,
    changePercent,
    marketCap,
    pe,
    industryPe,
    pb,
    roe,
    debtToEquity,
    dividendYield,
    revenueGrowth,
    profitGrowth,
    eps,
    rsi,
    macdSignal,
    above50Dma,
    interestCoverage,
    volatility,
    scores,
  };
}

const mergedUniverse: StockResearchSummary[] = buildBaseUniverse().map(buildSummary);
const sectorMedians = new Map<string, { pe: number; roe: number; growth: number }>();

for (const stock of mergedUniverse) {
  const current = sectorMedians.get(stock.sector) ?? { pe: 0, roe: 0, growth: 0 };
  current.pe += stock.pe ?? 0;
  current.roe += stock.roe ?? 0;
  current.growth += stock.revenueGrowth ?? 0;
  sectorMedians.set(stock.sector, current);
}

const sectorCounts = new Map<string, number>();
for (const stock of mergedUniverse) {
  sectorCounts.set(stock.sector, (sectorCounts.get(stock.sector) ?? 0) + 1);
}
for (const [sector, metrics] of sectorMedians.entries()) {
  const count = sectorCounts.get(sector) ?? 1;
  sectorMedians.set(sector, {
    pe: round(metrics.pe / count, 1),
    roe: round(metrics.roe / count, 1),
    growth: round(metrics.growth / count, 1),
  });
}

function stanceFromScores(health: number | null, risk: number | null): StockResearchDetail["thesis"]["stance"] {
  if (health == null || risk == null) return "Needs review";
  if (health >= 75 && risk >= 70) return "High conviction";
  if (health >= 62 && risk >= 55) return "Watch";
  if (health >= 50 && risk >= 45) return "Needs review";
  if (risk < 45) return "Risk rising";
  return "Avoid for now";
}

function buildTimeline(symbol: string, health: number | null): Array<{ day: string; health: number }> {
  const base = health ?? 55;
  return Array.from({ length: 6 }, (_, index) => ({
    day: `D-${(5 - index) * 18}`,
    health: clamp(Math.round(base + seeded(`${symbol}:timeline:${index}`, -6, 6, 0)), 20, 95),
  }));
}

function buildPriceHistory(symbol: string, price: number): StockResearchDetail["priceHistory"] {
  // Build realistic price paths with drift and volatility.
  // Longer timeframes show more compound growth anchored at current price.
  const frames: Record<string, { count: number; label: string; vol: number; drift: number }> = {
    "1W": { count: 7,  label: "day",  vol: 0.015, drift: 0.001 },   // 7 trading days
    "1M": { count: 22, label: "day",  vol: 0.018, drift: 0.002 },   // ~1 trading month
    "3M": { count: 13, label: "week", vol: 0.035, drift: 0.015 },   // 13 weeks
    "1Y": { count: 12, label: "mon",  vol: 0.05,  drift: 0.06 },    // 12 months
    "5Y": { count: 20, label: "q",    vol: 0.09,  drift: 0.35 },    // 20 quarters
  } as const;

  const output: StockResearchDetail["priceHistory"] = { "1W": [], "1M": [], "3M": [], "1Y": [], "5Y": [] };

  // Compute base drift from the stock's daily change to anchor trend direction
  // (use changePercent to know if stock recently went up/down)
  const dailyChange = 0.0005; // small default drift

  for (const [frame, cfg] of Object.entries(frames) as Array<[keyof typeof frames, { count: number; label: string; vol: number; drift: number }]>) {
    // Start with current price, walk backwards to generate price history
    const prices: number[] = [price];
    for (let i = 0; i < cfg.count - 1; i++) {
      const prev = prices[prices.length - 1];
      // Geometric Brownian Motion style: drift up + random walk
      const stepDrift = cfg.drift / Math.max(1, Math.sqrt(cfg.count));
      const stepVol = cfg.vol / Math.max(1, Math.sqrt(cfg.count));
      const noise = seeded(`${symbol}:${frame}:${i}`, -1, 1, 4);
      prices.push(round(prev * (1 + stepDrift + stepVol * noise), 2));
    }
    // Reverse so oldest → newest for chart display
    prices.reverse();

    // Generate proper date labels
    const now = new Date();
    output[frame] = prices.map((p, i) => {
      let label: string;
      if (cfg.label === "day") {
        const d = new Date(now);
        d.setDate(d.getDate() - (cfg.count - 1 - i));
        label = d.toLocaleDateString("en-PH", { day: "2-digit", month: "short" });
      } else if (cfg.label === "week") {
        const d = new Date(now);
        d.setDate(d.getDate() - (cfg.count - 1 - i) * 7);
        label = d.toLocaleDateString("en-PH", { day: "2-digit", month: "short" });
      } else if (cfg.label === "mon") {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (cfg.count - 1 - i));
        label = d.toLocaleDateString("en-PH", { month: "short", year: "2-digit" });
      } else {
        // quarterly
        const d = new Date(now);
        d.setMonth(d.getMonth() - (cfg.count - 1 - i) * 3);
        label = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${String(d.getFullYear()).slice(2)}`;
      }
      return { label, price: p };
    });
  }
  return output;
}

function buildFinancialSeries(summary: StockResearchSummary): StockResearchDetail["financials"] {
  const { symbol, marketCap, price, eps, sector } = summary;
  // Derive realistic financials from fundamentals
  // Estimate shares outstanding (in millions) from marketCap / price
  const sharesCr = price > 0 ? marketCap / price : marketCap / 100;
  // Net Profit (₱M) = EPS * shares — use EPS if available, else estimate from marketCap
  const currentProfit = eps != null && eps > 0
    ? round(eps * sharesCr, 0)
    : round(marketCap / 220, 0);
  // Typical net profit margins by sector
  const marginBySector: Record<string, number> = {
    "Technology": 0.20, "Financial Services": 0.18, "Banking": 0.15,
    "Consumer Cyclical": 0.10, "Consumer Defensive": 0.08,
    "Healthcare": 0.14, "Energy": 0.08, "Basic Materials": 0.10,
    "Industrials": 0.12, "Utilities": 0.14, "Real Estate": 0.12,
    "Communication Services": 0.15,
  };
  const profitMargin = Object.entries(marginBySector).find(([key]) =>
    sector?.toLowerCase().includes(key.toLowerCase())
  )?.[1] ?? 0.12;
  const ebitdaMargin = profitMargin + 0.12; // ~24-32% typical EBITDA margin
  const currentRevenue = currentProfit / profitMargin;
  const currentEbitda = currentRevenue * ebitdaMargin;

  // 8 annual periods: FY2018 → FY2025 with ~10% CAGR
  const annualPeriods = ["FY2018", "FY2019", "FY2020", "FY2021", "FY2022", "FY2023", "FY2024", "FY2025"];
  const annualGrowthRates = [0.65, 0.72, 0.68, 0.75, 0.82, 0.88, 0.95, 1.0]; // cumulative growth factor
  function annualValue(base: number, index: number, seed: string): number {
    return round(base * annualGrowthRates[index] * (1 + seeded(seed, -0.05, 0.08, 3)), 0);
  }

  // 8 quarterly periods: most recent first
  const quarterlyPeriods = ["Q2 FY26", "Q1 FY26", "Q4 FY25", "Q3 FY25", "Q2 FY25", "Q1 FY25", "Q4 FY24", "Q3 FY24"];
  function quarterlyValue(base: number, index: number, seed: string): number {
    const share = base * annualGrowthRates[Math.min(index, 7)] / 4 * (0.85 + 0.035 * (7 - index));
    return round(share * (1 + seeded(seed, -0.08, 0.10, 3)), 0);
  }

  return {
    annual: {
      revenue: annualPeriods.map((period, i) => ({
        period,
        value: annualValue(currentRevenue, i, `${symbol}:ann:rev:${i}`),
      })),
      profit: annualPeriods.map((period, i) => ({
        period,
        value: annualValue(currentProfit, i, `${symbol}:ann:pat:${i}`),
      })),
      ebitda: annualPeriods.map((period, i) => ({
        period,
        value: annualValue(currentEbitda, i, `${symbol}:ann:ebt:${i}`),
      })),
    },
    quarterly: {
      revenue: quarterlyPeriods.map((period, i) => ({
        period,
        value: quarterlyValue(currentRevenue, i, `${symbol}:qtr:rev:${i}`),
      })),
      profit: quarterlyPeriods.map((period, i) => ({
        period,
        value: quarterlyValue(currentProfit, i, `${symbol}:qtr:pat:${i}`),
      })),
      ebitda: quarterlyPeriods.map((period, i) => ({
        period,
        value: quarterlyValue(currentEbitda, i, `${symbol}:qtr:ebt:${i}`),
      })),
    },
  };
}

function buildShareholding(symbol: string, sector: string): StockResearchDetail["shareholding"] {
  // Sector-based realistic shareholding patterns (promoter ranges)
  const promoterBySector: Record<string, [number, number]> = {
    "Banking & Finance":      [45, 65],
    "Information Technology": [40, 65],
    "Pharmaceuticals":        [45, 70],
    "Energy & Oil":           [50, 80],
    "Infrastructure":         [50, 75],
    "Automotive":             [45, 70],
    "Materials & Mining":     [50, 75],
    "Consumer Goods":         [45, 65],
    "Retail":                 [40, 60],
    "Telecommunications":     [50, 75],
    "Media & Entertainment":  [40, 60],
    "Real Estate":            [45, 65],
    "Healthcare":             [45, 65],
    "Utilities":              [55, 80],
  };
  const [promMin, promMax] = Object.entries(promoterBySector).find(([key]) =>
    sector?.toLowerCase().includes(key.toLowerCase())
  )?.[1] ?? [45, 65];

  const basePromoter = seeded(`${symbol}:promoter_core`, promMin, promMax, 1);
  const baseRetail = seeded(`${symbol}:retail_core`, 8, 25, 1);
  const remainingAfterPromoter = clamp(100 - basePromoter, 15, 60);
  const nonRetailShare = clamp(remainingAfterPromoter - baseRetail, 5, 50);
  const baseFii = seeded(`${symbol}:fii_core`, 10, 35, 1);
  const baseDii = seeded(`${symbol}:dii_core`, 8, 25, 1);
  const totalInst = baseFii + baseDii;

  const baseValues = {
    promoter: round(clamp(basePromoter, 15, 85), 1),
    fii: totalInst > 0 ? round(clamp(nonRetailShare * baseFii / totalInst, 3, 40), 1) : round(nonRetailShare / 2, 1),
    dii: totalInst > 0 ? round(clamp(nonRetailShare * baseDii / totalInst, 3, 30), 1) : round(nonRetailShare / 2, 1),
    retail: round(clamp(baseRetail, 3, 40), 1),
  };
  // Normalize to sum = 100
  const sum = baseValues.promoter + baseValues.fii + baseValues.dii + baseValues.retail;
  const norm = (v: number) => round((v / sum) * 100, 1);
  const normalized = {
    promoter: norm(baseValues.promoter),
    fii: norm(baseValues.fii),
    dii: norm(baseValues.dii),
    retail: norm(baseValues.retail),
  };

  const periods = ["Mar'26", "Dec'25", "Sep'25", "Jun'25", "Mar'25", "Dec'24"];
  return periods.map((period, index) => {
    const pDelta = seeded(`${symbol}:prom:delta:${index}`, -0.4, 0.4, 1);
    const fDelta = seeded(`${symbol}:fii:delta:${index}`, -0.5, 0.5, 1);
    const dDelta = seeded(`${symbol}:dii:delta:${index}`, -0.3, 0.3, 1);
    const rDelta = round(-(pDelta + fDelta + dDelta) * seeded(`${symbol}:rbal:${index}`, 0.6, 1.4, 1), 1);

    return {
      period,
      promoter: round(clamp(normalized.promoter + pDelta, 0, 100), 1),
      fii:      round(clamp(normalized.fii + fDelta, 0, 100), 1),
      dii:      round(clamp(normalized.dii + dDelta, 0, 100), 1),
      retail:   round(clamp(normalized.retail + rDelta, 0, 100), 1),
      deltas: {
        promoter: round(pDelta, 1),
        fii:      round(fDelta, 1),
        dii:      round(dDelta, 1),
        retail:   round(rDelta, 1),
      },
    };
  });
}

function buildNews(stock: StockResearchSummary): StockResearchDetail["news"] {
  const now = Date.now();
  return [
    {
      headline: `${stock.name} remained in focus after fresh operating updates`,
      source: "Reuters",
      time: "2h ago",
      link: `https://www.reuters.com/markets/companies/${stock.symbol.toLowerCase()}`,
      publishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      headline: `${stock.sector} research points to a changing sector backdrop`,
      source: "Business Recorder",
      time: "5h ago",
      link: "https://www.brecorder.com/markets",
      publishedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      headline: `What changed in valuation context for ${stock.symbol}`,
      source: "Dawn Markets",
      time: "1d ago",
      link: "https://www.dawn.com/business/markets",
      publishedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      headline: `${stock.name} stays on watchlists after recent results`,
      source: "The News Business",
      time: "2d ago",
      link: "https://www.thenews.com.pk/business",
      publishedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      headline: `${stock.industry} trends continue to influence research conviction`,
      source: "KSE Market Watch",
      time: "3d ago",
      link: "https://www.psx.com.pk/market",
      publishedAt: new Date(now - 72 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function buildThesis(stock: StockResearchSummary): StockResearchDetail["thesis"] {
  const stance = stanceFromScores(stock.scores.health, stock.scores.risk);
  return {
    stance,
    thesis: `${stock.name} shows ${stance.toLowerCase()} based on operating quality, valuation context, and current risk discipline.`,
    bullCase: `Return ratios and growth trends support a constructive research view if execution stays consistent.`,
    bearCase: `Debt, sector re-rating pressure, or slowing growth could weaken conviction if the latest signals fail to hold.`,
    whatToWatch: `Track valuation versus ${stock.sector} peers, balance-sheet direction, and whether momentum stays supported by fundamentals.`,
  };
}

function buildWhatChanged(stock: StockResearchSummary): string[] {
  const changes: string[] = [];
  if ((stock.debtToEquity ?? 0) > 1.5) changes.push("Debt to equity moved above a calmer range.");
  if ((stock.pe ?? 0) < (stock.industryPe ?? 0)) changes.push("PE now sits below the industry reference band.");
  if ((stock.revenueGrowth ?? 0) > 15) changes.push("Revenue growth re-accelerated versus the recent base.");
  if ((stock.rsi ?? 50) > 60) changes.push("Momentum improved as RSI pushed into a stronger zone.");
  return changes.slice(0, 3);
}

export function getUniverseCount(): number {
  return mergedUniverse.length;
}

export function listAllStockResearch(): StockResearchSummary[] {
  return mergedUniverse.filter((stock) => !isPlaceholderCompanyIdentity(stock));
}

// Levenshtein distance for fuzzy matching (handles typos)
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Calculate fuzzy match score (0-100, higher is better)
function fuzzyScore(target: string, query: string): number {
  if (target === query) return 100;
  if (target.startsWith(query)) return 90;
  if (target.includes(query)) return 70;

  const distance = levenshteinDistance(target, query);
  const maxLen = Math.max(target.length, query.length);
  const similarity = Math.max(0, 100 - (distance * 100) / maxLen);
  return Math.round(similarity);
}

export function searchStocks(query: string, limit = 20): StockResearchSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  // If query matches an alias, prioritize that stock
  let aliasedStock: StockResearchSummary | undefined;
  for (const [alias, actualSymbol] of Object.entries(symbolAliases)) {
    if (alias.toLowerCase() === normalized) {
      aliasedStock = mergedUniverse.find((stock) => stock.symbol.toUpperCase() === actualSymbol.toUpperCase());
      break;
    }
  }

  const ranked = mergedUniverse
    .filter((stock) => !isPlaceholderCompanyIdentity(stock))
    .map((stock) => {
      let rank = 0;
      const symbol = stock.symbol.toLowerCase();
      const name = stock.name.toLowerCase();

      // Exact match
      if (symbol === normalized) rank += 1000;
      else if (name === normalized) rank += 950;
      // Prefix match
      else if (symbol.startsWith(normalized)) rank += 800;
      else if (name.startsWith(normalized)) rank += 750;
      // Substring match
      else if (symbol.includes(normalized)) rank += 500;
      else if (name.includes(normalized)) rank += 450;
      // Fuzzy match for typos
      else {
        const symbolFuzzy = fuzzyScore(symbol, normalized);
        const nameFuzzy = fuzzyScore(name, normalized);
        if (symbolFuzzy > 70) rank += symbolFuzzy * 3;
        if (nameFuzzy > 70) rank += nameFuzzy * 2.5;
      }

      // Sector bonus
      if (stock.sector.toLowerCase().includes(normalized)) rank += 120;

      // PSE bonus (more liquidity)
      if (stock.exchange === "PSE") rank += 50;

      return { stock, rank };
    })
    .filter((item) => item.rank > 0)
    .sort((a, b) => b.rank - a.rank || b.stock.marketCap - a.stock.marketCap);

  const seen = new Set<string>();
  const results: StockResearchSummary[] = [];

  // Add aliased stock first if found (highest priority for exact alias match)
  if (aliasedStock) {
    results.push(aliasedStock);
    seen.add(aliasedStock.symbol.toUpperCase());
  }

  for (const item of ranked) {
    const key = item.stock.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item.stock);
    if (results.length >= limit) break;
  }
  return results;
}

export function getScannerStocks(scanType: "quality" | "value" | "momentum" | "stable"): StockResearchSummary[] {
  const sortKey =
    scanType === "quality"
      ? "quality"
      : scanType === "value"
        ? "valuation"
        : scanType === "momentum"
          ? "momentum"
          : "risk";

  const seen = new Set<string>();
  return [...mergedUniverse]
    .filter((stock) => !isPlaceholderCompanyIdentity(stock))
    .filter((stock) => {
      const key = stock.symbol.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (left, right) =>
        (right.scores[sortKey] ?? 0) - (left.scores[sortKey] ?? 0) ||
        (right.scores.health ?? 0) - (left.scores.health ?? 0),
    );
}

// Symbol aliases for common shortforms (e.g., user types "HDFC" → search for "HDFCBANK")
const symbolAliases: Record<string, string> = {
  "HBL": "HBL",
  "UBL": "UBL",
  "NBP": "NBP",
  "BAHL": "BAHL",
  "BAFL": "BAFL",
  "MCB": "MCB",
  "ENGRO": "ENGRO",
  "LUCK": "LUCK",
};

// Real company profile data for major stocks
const companyProfiles: Record<string, { founded: string; ceo: string; hq: string; employees: string; website: string }> = {
  "HBL": { founded: "1941", ceo: "Muhammad Aurangzeb", hq: "Karachi", employees: "15,000", website: "www.hbl.com" },
  "UBL": { founded: "1959", ceo: "Shazad G. Dada", hq: "Karachi", employees: "13,000", website: "www.ubldirect.com" },
  "ENGRO": { founded: "1965", ceo: "Aliuddin Ansari", hq: "Karachi", employees: "8,500", website: "www.engro.com" },
  "LUCK": { founded: "1993", ceo: "Muhammad Ali Tabba", hq: "Karachi", employees: "5,200", website: "www.lucky-cement.com" },
  "MCB": { founded: "1947", ceo: "S. M. Muneer", hq: "Karachi", employees: "12,000", website: "www.mcb.com.pk" },
};

export function getStockResearch(symbol: string): StockResearchDetail | null {
  const resolvedSymbol = symbolAliases[symbol.toUpperCase()] || symbol;
  const summary = mergedUniverse.find((stock) => stock.symbol.toUpperCase() === resolvedSymbol.toUpperCase());
  if (!summary) return null;
  const normalizedSector = normalizeCategory(summary.sector, "Uncategorized");
  const normalizedIndustry = normalizeCategory(summary.industry, "Uncategorized");
  const medians = sectorMedians.get(normalizedSector) ?? { pe: 0, roe: 0, growth: 0 };
  const confidenceMeter = confidenceFromCoverage(
    [
      summary.pe,
      summary.pb,
      summary.roe,
      summary.debtToEquity,
      summary.revenueGrowth,
      summary.profitGrowth,
      summary.rsi,
      summary.interestCoverage,
    ],
    82,
  );

  const profile = companyProfiles[summary.symbol.toUpperCase()] || {
    founded: `${1980 + (hash(`${summary.symbol}:founded`) % 35)}`,
    ceo: "Management team",
    hq: "Pakistan",
    employees: `${Math.round(seeded(`${summary.symbol}:employees`, 1800, 82000, 0)).toLocaleString("en-PH")}`,
    website: `www.${summary.symbol.toLowerCase()}.com`,
  };

  return {
    ...summary,
    companyName: summary.name,
    exchangeBadge: "PSX",
    founded: profile.founded,
    ceo: profile.ceo,
    hq: profile.hq,
    employees: profile.employees,
    website: profile.website,
    isin: `INE${String(hash(summary.symbol)).padStart(9, "0").slice(0, 9)}0`,
    sector: normalizedSector,
    industry: normalizedIndustry,
    description: `${summary.name} is tracked for its position in ${normalizedIndustry} within the ${normalizedSector} sector, with research centered on business quality, valuation context, conviction, and risk.`,
    businessSegments: [normalizedIndustry, `${normalizedSector} Core`, "Domestic operations"],
    priceHistory: buildPriceHistory(summary.symbol, summary.price),
    financials: buildFinancialSeries(summary),
    shareholding: buildShareholding(summary.symbol, normalizedSector),
    news: buildNews(summary),
    thesis: buildThesis(summary),
    confidenceMeter,
    timeline: buildTimeline(summary.symbol, summary.scores.health),
    whatChanged: buildWhatChanged(summary),
    sectorRelative: [
      { label: "PE", company: `${summary.pe ?? "—"}`, sectorMedian: `${medians.pe}` },
      { label: "ROE", company: `${summary.roe ?? "—"}%`, sectorMedian: `${medians.roe}%` },
      { label: "Revenue growth", company: `${summary.revenueGrowth ?? "—"}%`, sectorMedian: `${medians.growth}%` },
    ],
  };
}
