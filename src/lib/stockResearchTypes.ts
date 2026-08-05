import type { FactorScoreSet } from "./scoring.js";

/**
 * Shared research-result shapes, extracted from the now-deleted
 * src/lib/stockResearch.ts (which fabricated fundamentals via a hash of the
 * ticker symbol — see stockResearchSnapshot.ts for the real data path that
 * replaced it). Only the type definitions survived; the generator did not.
 */

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
  exchangeBadge: "PSE";
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
    // Real PSE Public Ownership Report shape — insider (directors/officers/
    // substantial shareholders, summed) vs public %, plus outstanding shares.
    // A PSE POR-1 filing does NOT report a foreign/domestic institutional
    // split, so the old FII/DII shape this interface once carried has been
    // removed rather than kept as a fabricated placeholder.
    insiderPercent: number;
    publicPercent: number;
    outstandingShares: number | null;
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
