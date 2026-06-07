export type StockCandidate = {
  ticker: string;
  companyName: string;
  // Optional: used for UI tagging (sector/category)
  // (If unknown, UI can derive via getCompanySectorMapping)
  categoryHint?: string;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

type Alias = {
  // company-name patterns (normalized)
  keys: string[];
  ticker: string;
  companyName: string;
};

const ALIASES: Alias[] = [
  { keys: ["reliance", "reliance industries"], ticker: "RELIANCE", companyName: "Reliance Industries" },
  { keys: ["tata motors", "tata motor"], ticker: "TTM", companyName: "Tata Motors" },
  { keys: ["tcs", "tata consultancy services", "tata consultancy"], ticker: "TCS", companyName: "Tata Consultancy Services" },
  { keys: ["infosys", "infy"], ticker: "INFY", companyName: "Infosys" },
  { keys: ["hdfc bank", "hdfcbank"], ticker: "HDFCBANK", companyName: "HDFC Bank" },

  // User examples (best-effort — repo doesn’t contain full exchange masters)
  { keys: ["granules india", "granules"], ticker: "GRANULES", companyName: "Granules India" },
  { keys: ["suzlon", "suzlon energy"], ticker: "SUZLON", companyName: "Suzlon" },
  { keys: ["chennai petro", "chennai petroleum", "chennai petro corp"], ticker: "CHENNAPETRO", companyName: "Chennai Petro" },
];

function scoreMatch(queryNorm: string, keyNorm: string): number {
  if (!queryNorm || !keyNorm) return 0;
  if (queryNorm === keyNorm) return 10;
  if (queryNorm.startsWith(keyNorm) || keyNorm.startsWith(queryNorm)) return 7;
  if (queryNorm.includes(keyNorm)) return 5;
  // token overlap (conservative)
  const qTokens = new Set(queryNorm.split(" ").filter(Boolean));
  const kTokens = new Set(keyNorm.split(" ").filter(Boolean));
  let overlap = 0;
  for (const t of qTokens) if (kTokens.has(t)) overlap += 1;
  return overlap > 0 ? 2 + Math.min(3, overlap) : 0;
}

import { StockSearchEngine } from "../stocks/StockSearchIndex";

/**
 * Resolves known company-name queries into best-effort ticker candidates.
 */
export function resolveStockCandidatesFromCompanyQuery(query: string): StockCandidate[] {
  const results = StockSearchEngine.search(query, 5);
  return results.map(r => ({
    ticker: r.ticker,
    companyName: r.companyName
  }));
}
