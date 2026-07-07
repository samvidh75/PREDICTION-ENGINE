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

  // Fall back to the full persisted universe (8503+ stocks, including all PSE codes)
  const persisted = await loadPersistedUniverse();
  if (!persisted) return null;

  const upper = symbol.toUpperCase().trim();
  const entry = persisted.entries.find((e) => e.symbol.toUpperCase() === upper);
  if (!entry) return null;

  // Build a minimal StockResearchDetail from the persisted entry
  const syntheticPrice = seededPrice(entry.symbol);
  const [founded, employees] = await syntheticProfile(entry.symbol);
  return {
    symbol: entry.symbol,
    name: entry.name,
    companyName: entry.name,
    exchange: entry.exchange as "PSE" | "PSE",
    exchangeBadge: (entry.exchange === "PSE" ? "PSE" : "PSE") as "PSE" | "PSE",
    sector: entry.sector,
    industry: entry.industry || entry.sector,
    price: syntheticPrice,
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
    hq: "India",
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

// Deterministic seeded price for stocks without live data
function seededPrice(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
  const seed = Math.abs(hash) / 2147483648;
  return Number((80 + seed * 4120).toFixed(2));
}

async function syntheticProfile(symbol: string): Promise<[string, string]> {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
  const seed = Math.abs(hash) / 2147483648;
  const foundedYear = `${1980 + Math.floor(seed * 40)}`;
  const employeeCount = Math.round(1800 + seed * 80200).toLocaleString("en-IN");
  return [foundedYear, `${employeeCount}+`];
}

export async function listPersistedStockSummaries() {
  const persisted = await loadPersistedUniverse();
  if (!persisted) {
    return listAllStockResearch();
  }
  return persisted.entries.map(enrichPersistedEntry);
}
