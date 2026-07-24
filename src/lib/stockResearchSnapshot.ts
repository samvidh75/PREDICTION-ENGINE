import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getStockResearch,
  getUniverseCount,
  listAllStockResearch,
  searchStocks,
  type StockResearchDetail,
  type StockResearchSummary,
} from "./stockResearch.js";

interface PersistedUniverseEntry {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  marketCap: number;
  scores: StockResearchSummary["scores"];
}

interface PersistedUniverseFile {
  totalUniverse: number;
  entries: PersistedUniverseEntry[];
}

let cachedUniverse: PersistedUniverseFile | null | undefined;

async function loadPersistedUniverse(): Promise<PersistedUniverseFile | null> {
  if (cachedUniverse !== undefined) {
    return cachedUniverse;
  }

  const candidates = [
    path.join(process.cwd(), "data", "stock-universe.json"),
    path.join(process.cwd(), "public", "stock-universe.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as PersistedUniverseFile;
      if (Array.isArray(parsed.entries) && parsed.entries.length > 0) {
        cachedUniverse = parsed;
        return cachedUniverse;
      }
    } catch {
      // try next path
    }
  }

  cachedUniverse = null;
  return cachedUniverse;
}

function rankPersistedEntry(entry: PersistedUniverseEntry, normalized: string): number {
  let rank = 0;
  const symbol = entry.symbol.toLowerCase();
  const name = entry.name.toLowerCase();
  if (symbol === normalized) rank += 1000;
  else if (symbol.startsWith(normalized)) rank += 800;
  else if (symbol.includes(normalized)) rank += 500;
  if (name.startsWith(normalized)) rank += 350;
  else if (name.includes(normalized)) rank += 240;
  if (entry.sector.toLowerCase().includes(normalized)) rank += 120;
  if (entry.exchange === "PSE") rank += 50;
  return rank;
}

function enrichPersistedEntry(entry: PersistedUniverseEntry): StockResearchSummary {
  const live = getStockResearch(entry.symbol);
  if (live) {
    return {
      symbol: live.symbol,
      name: live.name,
      exchange: live.exchange,
      sector: live.sector,
      industry: live.industry,
      price: live.price,
      change: live.change,
      changePercent: live.changePercent,
      marketCap: live.marketCap,
      pe: live.pe,
      industryPe: live.industryPe,
      pb: live.pb,
      roe: live.roe,
      debtToEquity: live.debtToEquity,
      dividendYield: live.dividendYield,
      revenueGrowth: live.revenueGrowth,
      profitGrowth: live.profitGrowth,
      eps: live.eps,
      rsi: live.rsi,
      macdSignal: live.macdSignal,
      above50Dma: live.above50Dma,
      interestCoverage: live.interestCoverage,
      volatility: live.volatility,
      scores: entry.scores ?? live.scores,
    };
  }

  return {
    symbol: entry.symbol,
    name: entry.name,
    exchange: entry.exchange,
    sector: entry.sector,
    industry: entry.industry,
    price: 0,
    change: 0,
    changePercent: 0,
    marketCap: entry.marketCap,
    pe: null,
    industryPe: null,
    pb: null,
    roe: null,
    debtToEquity: null,
    dividendYield: null,
    revenueGrowth: null,
    profitGrowth: null,
    eps: null,
    rsi: null,
    macdSignal: null,
    above50Dma: null,
    interestCoverage: null,
    volatility: null,
    scores: entry.scores,
  };
}

export async function getPersistedUniverseCount(): Promise<number> {
  const persisted = await loadPersistedUniverse();
  return persisted?.totalUniverse ?? getUniverseCount();
}

export async function searchPersistedStocks(query: string, limit = 20) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const persisted = await loadPersistedUniverse();
  if (!persisted) {
    return searchStocks(query, limit);
  }

  const seen = new Set<string>();
  return persisted.entries
    .map((entry) => ({ entry, rank: rankPersistedEntry(entry, normalized) }))
    .filter(({ rank, entry }) => {
      if (rank <= 0) return false;
      const key = entry.symbol.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => right.rank - left.rank || left.entry.symbol.localeCompare(right.entry.symbol))
    .slice(0, limit)
    .map(({ entry }) => enrichPersistedEntry(entry));
}

export async function getPersistedStockResearch(symbol: string): Promise<StockResearchDetail | null> {
  // First try the in-memory merged universe (covers ~1010 major stocks)
  const fromMemory = getStockResearch(symbol);
  if (fromMemory) return fromMemory;

  // Fall back to the full persisted universe (8503+ stocks, including all PSX codes)
  const persisted = await loadPersistedUniverse();
  if (!persisted) return null;

  const upper = symbol.toUpperCase().trim();
  const entry = persisted.entries.find((e) => e.symbol.toUpperCase() === upper);
  if (!entry) return null;

  // Build a minimal StockResearchDetail from the persisted entry. Price is
  // left at 0 rather than a seeded/fabricated number — callers needing a
  // real price should hit api/stock/[symbol].ts (real phisix PSE data)
  // instead of this metadata-only fallback path.
  const founded = "";
  const employees = "";
  return {
    symbol: entry.symbol,
    name: entry.name,
    companyName: entry.name,
    exchange: entry.exchange as "PSE",
    exchangeBadge: entry.exchange as "PSE",
    sector: entry.sector,
    industry: entry.industry || entry.sector,
    price: 0,
    change: 0,
    changePercent: 0,
    marketCap: entry.marketCap,
    pe: null,
    industryPe: null,
    pb: null,
    roe: null,
    debtToEquity: null,
    dividendYield: null,
    revenueGrowth: null,
    profitGrowth: null,
    eps: null,
    rsi: null,
    macdSignal: null,
    above50Dma: false,
    interestCoverage: null,
    volatility: null,
    scores: entry.scores,
    founded,
    ceo: "Management team",
    hq: "Philippines",
    employees,
    website: "",
    isin: "",
    description: `${entry.name} is tracked in the ${entry.sector} sector on the ${entry.exchange}.`,
    businessSegments: [entry.sector],
    priceHistory: {},
    financials: {
      annual: { revenue: [], profit: [], ebitda: [] },
      quarterly: { revenue: [], profit: [], ebitda: [] },
    },
    shareholding: [],
    news: [],
    thesis: {
      stance: "Needs review" as const,
      thesis: "Stock is being researched — detailed scores pending.",
      bullCase: "Awaiting detailed analysis.",
      bearCase: "Awaiting detailed analysis.",
      whatToWatch: "Review fundamentals and recent developments.",
    },
    confidenceMeter: 50,
    timeline: [],
    whatChanged: ["Stock data is being refreshed — check back for updates."],
    sectorRelative: [],
  };
}


export async function listPersistedStockSummaries() {
  const persisted = await loadPersistedUniverse();
  if (!persisted) {
    return listAllStockResearch();
  }
  return persisted.entries.map(enrichPersistedEntry);
}
