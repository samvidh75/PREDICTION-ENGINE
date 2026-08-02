export interface SectorInfo {
  slug: string;
  name: string;
  description: string;
  companyCount: number;
  icon?: string;
}

export interface SectorContent {
  slug: string;
  name: string;
  summary: string;
  overview: string;
  keyMetrics: string[];
  risks: string[];
  opportunities: string[];
}

/**
 * The Philippine Stock Exchange's own six-sector classification — the same
 * grouping used for the PSEi-30 in api/_lib/data/universe.ts's PSE_SECTORS
 * (and the Dashboard's live sector heatmap, api/market-pulse.ts). Company
 * counts below reflect the verified PSEi-30 membership only (30 companies
 * total across these six groups); the full ~294-stock PSE universe isn't
 * yet classified by sector in this codebase, so those counts are honestly
 * scoped to "of the PSEi-30" rather than claiming full-universe coverage.
 */
export const SECTORS: SectorInfo[] = [
  { slug: "financials", name: "Financials", description: "Universal and commercial banks listed on the PSE.", companyCount: 4 },
  { slug: "industrial", name: "Industrial", description: "Power, food & beverage, and diversified industrial conglomerates.", companyCount: 8 },
  { slug: "holding-firms", name: "Holding Firms", description: "Diversified conglomerates holding stakes across multiple industries.", companyCount: 6 },
  { slug: "property", name: "Property", description: "Real estate developers and REITs.", companyCount: 4 },
  { slug: "services", name: "Services", description: "Telecommunications, ports, fast food, and retail services.", companyCount: 7 },
  { slug: "mining-oil", name: "Mining & Oil", description: "Coal, metals, and energy extraction companies.", companyCount: 1 },
];
