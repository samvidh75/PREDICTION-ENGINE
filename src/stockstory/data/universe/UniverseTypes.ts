/**
 * Indian Equity Universe Types
 *
 * Defines the canonical stock universe structure for Indian equities.
 * Every stock in the system must trace back to this universe.
 */

export type ListingStatus = 'active' | 'suspended' | 'delisted' | 'merged' | 'unknown';

export interface IndianEquitySymbol {
  symbol: string;
  isin: string | null;
  nseSymbol: string | null;
  bseCode: string | null;
  companyName: string;
  sector: string | null;
  industry: string | null;
  exchange: 'NSE' | 'BSE' | 'both';
  listingStatus: ListingStatus;
  listingDate: string | null;
  delistingDate: string | null;
  faceValue: number | null;
  marketCap: number | null;
  marketCapCategory: 'large' | 'mid' | 'small' | 'micro' | 'unknown';
  lastVerified: string | null;
  sourceIds: string[];
}

export interface UniverseStats {
  totalSymbols: number;
  activeSymbols: number;
  delistedSymbols: number;
  suspendedSymbols: number;
  byExchange: { NSE: number; BSE: number; both: number };
  byMarketCap: { large: number; mid: number; small: number; micro: number; unknown: number };
  bySector: Record<string, number>;
  withISIN: number;
  withCompanyName: number;
  lastRefreshed: string | null;
}
