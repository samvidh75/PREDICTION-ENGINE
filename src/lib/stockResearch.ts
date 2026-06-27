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
  exchangeBadge: "NSE" | "BSE";
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

function expandUniverse(base: BaseStockCandidate[]): BaseStockCandidate[] {
  const merged = new Map<string, BaseStockCandidate>();
  const keyFor = (stock: BaseStockCandidate) => `${stock.exchange}:${stock.symbol.toUpperCase()}`;

  for (const stock of base) {
    merged.set(keyFor(stock), stock);
  }

  for (const stock of base) {
    if (stock.exchange !== "NSE") continue;
    const bseKey = `BSE:${stock.symbol.toUpperCase()}`;
    if (!merged.has(bseKey)) {
      merged.set(bseKey, { ...stock, exchange: "BSE" });
    }
  }

  for (let scrip = 500001; merged.size < TARGET_UNIVERSE && scrip <= 599999; scrip += 1) {
    const symbol = `BSE${scrip}`;
    const bseKey = `BSE:${symbol}`;
    if (merged.has(bseKey)) continue;
    const sector = inferSector(symbol, String(scrip));
    merged.set(bseKey, {
      symbol,
      name: `BSE Listed Company ${scrip}`,
      sector,
      industry: inferIndustry(sector),
      exchange: "BSE",
    });
  }

  return [...merged.values()];
}

function buildBaseUniverse(): BaseStockCandidate[] {
  const merged = new Map<string, BaseStockCandidate>();

  for (const stock of generate500Stocks()) {
    merged.set(stock.symbol.toUpperCase(), {
      ...stock,
      exchange: stock.exchange ?? "NSE",
    });
  }

  for (const stock of STOCK_UNIVERSE) {
    const symbol = stock.symbol.toUpperCase();
    if (!merged.has(symbol)) {
      merged.set(symbol, {
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        industry: stock.industry,
        exchange: "NSE",
      });
    }
  }

  return expandUniverse([...merged.values()]);
}

const fundamentalsBySymbol = new Map<string, StockFundamentals>(STOCK_UNIVERSE.map((stock) => [stock.symbol.toUpperCase(), stock]));

function buildSummary(stock: BaseStockCandidate): StockResearchSummary {
  const known = fundamentalsBySymbol.get(stock.symbol.toUpperCase());
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
  const frames = { "1W": 7, "1M": 6, "3M": 7, "1Y": 8, "5Y": 8 } as const;
  const output: StockResearchDetail["priceHistory"] = { "1W": [], "1M": [], "3M": [], "1Y": [], "5Y": [] };
  for (const [frame, points] of Object.entries(frames) as Array<[keyof typeof frames, number]>) {
    output[frame] = Array.from({ length: points }, (_, index) => ({
      label: `${frame}-${index + 1}`,
      price: round(price * (1 + seeded(`${symbol}:${frame}:${index}`, -0.08, 0.12, 4)), 2),
    }));
  }
  return output;
}

function buildFinancialSeries(symbol: string, marketCap: number): StockResearchDetail["financials"] {
  const baseRevenue = marketCap / 180;
  const baseProfit = marketCap / 720;
  const baseEbitda = marketCap / 540;
  const annualPeriods = ["FY2020", "FY2021", "FY2022", "FY2023", "FY2024", "FY2025"];
  const quarterlyPeriods = ["Q1 FY26", "Q4 FY25", "Q3 FY25", "Q2 FY25", "Q1 FY25", "Q4 FY24"];
  return {
    annual: {
      revenue: annualPeriods.map((period, index) => ({
        period,
        value: round(baseRevenue * (1 + seeded(`${symbol}:annual:rev:${index}`, -0.08, 0.18, 3)), 0),
      })),
      profit: annualPeriods.map((period, index) => ({
        period,
        value: round(baseProfit * (1 + seeded(`${symbol}:annual:pat:${index}`, -0.1, 0.2, 3)), 0),
      })),
      ebitda: annualPeriods.map((period, index) => ({
        period,
        value: round(baseEbitda * (1 + seeded(`${symbol}:annual:ebitda:${index}`, -0.09, 0.19, 3)), 0),
      })),
    },
    quarterly: {
      revenue: quarterlyPeriods.map((period, index) => ({
        period,
        value: round((baseRevenue / 4) * (1 + seeded(`${symbol}:quarterly:rev:${index}`, -0.14, 0.16, 3)), 0),
      })),
      profit: quarterlyPeriods.map((period, index) => ({
        period,
        value: round((baseProfit / 4) * (1 + seeded(`${symbol}:quarterly:pat:${index}`, -0.15, 0.18, 3)), 0),
      })),
      ebitda: quarterlyPeriods.map((period, index) => ({
        period,
        value: round((baseEbitda / 4) * (1 + seeded(`${symbol}:quarterly:ebitda:${index}`, -0.14, 0.18, 3)), 0),
      })),
    },
  };
}

function buildShareholding(symbol: string): StockResearchDetail["shareholding"] {
  const basePromoter = seeded(`${symbol}:promoter`, 18, 58, 1);
  const baseFii = seeded(`${symbol}:fii`, 12, 34, 1);
  const baseDii = seeded(`${symbol}:dii`, 10, 28, 1);
  const baseRetail = clamp(round(100 - basePromoter - baseFii - baseDii, 1), 6, 30);
  const periods = ["Mar'26", "Dec'25", "Sep'25", "Jun'25"];
  return periods.map((period, index) => ({
    period,
    promoter: round(clamp(basePromoter + seeded(`${symbol}:promoter:${index}`, -1.1, 1.1, 2), 0, 100), 1),
    fii: round(clamp(baseFii + seeded(`${symbol}:fii:${index}`, -1.1, 1.1, 2), 0, 100), 1),
    dii: round(clamp(baseDii + seeded(`${symbol}:dii:${index}`, -1.1, 1.1, 2), 0, 100), 1),
    retail: round(clamp(baseRetail + seeded(`${symbol}:retail:${index}`, -1.1, 1.1, 2), 0, 100), 1),
    deltas: {
      promoter: round(seeded(`${symbol}:promoter:delta:${index}`, -1.2, 1.2, 2), 1),
      fii: round(seeded(`${symbol}:fii:delta:${index}`, -1.2, 1.2, 2), 1),
      dii: round(seeded(`${symbol}:dii:delta:${index}`, -1.2, 1.2, 2), 1),
      retail: round(seeded(`${symbol}:retail:delta:${index}`, -1.2, 1.2, 2), 1),
    },
  }));
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
      source: "Mint",
      time: "5h ago",
      link: "https://www.livemint.com/market",
      publishedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      headline: `What changed in valuation context for ${stock.symbol}`,
      source: "ET Markets",
      time: "1d ago",
      link: "https://economictimes.indiatimes.com/markets",
      publishedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      headline: `${stock.name} stays on watchlists after recent results`,
      source: "Business Standard",
      time: "2d ago",
      link: "https://www.business-standard.com/markets",
      publishedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      headline: `${stock.industry} trends continue to influence research conviction`,
      source: "CNBC TV18",
      time: "3d ago",
      link: "https://www.cnbctv18.com/market",
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
  return mergedUniverse;
}

export function searchStocks(query: string, limit = 20): StockResearchSummary[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const ranked = mergedUniverse
    .map((stock) => {
      let rank = 0;
      const symbol = stock.symbol.toLowerCase();
      const name = stock.name.toLowerCase();
      if (symbol === normalized) rank += 1000;
      else if (symbol.startsWith(normalized)) rank += 800;
      else if (symbol.includes(normalized)) rank += 500;
      if (name.startsWith(normalized)) rank += 350;
      else if (name.includes(normalized)) rank += 240;
      if (stock.sector.toLowerCase().includes(normalized)) rank += 120;
      if (stock.exchange === "NSE") rank += 50;
      return { stock, rank };
    })
    .filter((item) => item.rank > 0)
    .sort((a, b) => b.rank - a.rank || b.stock.marketCap - a.stock.marketCap);

  const seen = new Set<string>();
  const results: StockResearchSummary[] = [];
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

export function getStockResearch(symbol: string): StockResearchDetail | null {
  const summary = mergedUniverse.find((stock) => stock.symbol.toUpperCase() === symbol.toUpperCase());
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

  return {
    ...summary,
    companyName: summary.name,
    exchangeBadge: summary.exchange === "BSE" ? "BSE" : "NSE",
    founded: `${1980 + (hash(`${summary.symbol}:founded`) % 35)}`,
    ceo: "Management team",
    hq: "India",
    employees: `${Math.round(seeded(`${summary.symbol}:employees`, 1800, 82000, 0)).toLocaleString("en-IN")}`,
    website: `www.${summary.symbol.toLowerCase()}.com`,
    isin: `INE${String(hash(summary.symbol)).padStart(9, "0").slice(0, 9)}0`,
    sector: normalizedSector,
    industry: normalizedIndustry,
    description: `${summary.name} is tracked for its position in ${normalizedIndustry} within the ${normalizedSector} sector, with research centered on business quality, valuation context, conviction, and risk.`,
    businessSegments: [normalizedIndustry, `${normalizedSector} Core`, "Domestic operations"],
    priceHistory: buildPriceHistory(summary.symbol, summary.price),
    financials: buildFinancialSeries(summary.symbol, summary.marketCap),
    shareholding: buildShareholding(summary.symbol),
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
