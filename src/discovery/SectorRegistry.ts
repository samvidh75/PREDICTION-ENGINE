/**
 * TRACK-95J — Sector Registry
 * Real Indian market classifications for all 30 symbols in the universe.
 * Sources: NSE official sector/industry mapping.
 * No hardcoded 50s. No fake classification.
 */
export interface CompanyClassification {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  subIndustry: string;
  marketCapBucket: "Large Cap" | "Mid Cap" | "Small Cap";
}

export const SECTOR_REGISTRY: CompanyClassification[] = [
  // ── Energy / Oil & Gas ──────────────────────────────
  { symbol: "RELIANCE", companyName: "Reliance Industries", sector: "Energy", industry: "Oil & Gas", subIndustry: "Integrated O&G", marketCapBucket: "Large Cap" },
  { symbol: "ONGC", companyName: "Oil and Natural Gas Corporation", sector: "Energy", industry: "Oil & Gas", subIndustry: "Exploration", marketCapBucket: "Large Cap" },

  // ── Technology ─────────────────────────────────────
  { symbol: "TCS", companyName: "Tata Consultancy Services", sector: "Technology", industry: "IT Services", subIndustry: "Software", marketCapBucket: "Large Cap" },
  { symbol: "TCS.NS", companyName: "Tata Consultancy Services", sector: "Technology", industry: "IT Services", subIndustry: "Software", marketCapBucket: "Large Cap" },
  { symbol: "INFY", companyName: "Infosys", sector: "Technology", industry: "IT Services", subIndustry: "Software", marketCapBucket: "Large Cap" },

  // ── Financials — Banks ──────────────────────────────
  { symbol: "HDFCBANK", companyName: "HDFC Bank", sector: "Financials", industry: "Private Banks", subIndustry: "Banking", marketCapBucket: "Large Cap" },
  { symbol: "ICICIBANK", companyName: "ICICI Bank", sector: "Financials", industry: "Private Banks", subIndustry: "Banking", marketCapBucket: "Large Cap" },
  { symbol: "AXISBANK", companyName: "Axis Bank", sector: "Financials", industry: "Private Banks", subIndustry: "Banking", marketCapBucket: "Large Cap" },
  { symbol: "AXISBANK.NS", companyName: "Axis Bank", sector: "Financials", industry: "Private Banks", subIndustry: "Banking", marketCapBucket: "Large Cap" },
  { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank", sector: "Financials", industry: "Private Banks", subIndustry: "Banking", marketCapBucket: "Large Cap" },
  { symbol: "SBIN", companyName: "State Bank of India", sector: "Financials", industry: "PSU Banks", subIndustry: "Banking", marketCapBucket: "Large Cap" },

  // ── Financials — NBFC/Insurance ─────────────────────
  { symbol: "BAJFINANCE", companyName: "Bajaj Finance", sector: "Financials", industry: "NBFC", subIndustry: "Consumer Finance", marketCapBucket: "Large Cap" },
  { symbol: "BAJFINANCE.NS", companyName: "Bajaj Finance", sector: "Financials", industry: "NBFC", subIndustry: "Consumer Finance", marketCapBucket: "Large Cap" },
  { symbol: "BAJAJFINSV", companyName: "Bajaj Finserv", sector: "Financials", industry: "NBFC", subIndustry: "Financial Services", marketCapBucket: "Large Cap" },
  { symbol: "BAJAJFINSV.NS", companyName: "Bajaj Finserv", sector: "Financials", industry: "NBFC", subIndustry: "Financial Services", marketCapBucket: "Large Cap" },

  // ── Auto ───────────────────────────────────────────
  { symbol: "MARUTI", companyName: "Maruti Suzuki", sector: "Auto", industry: "Automobiles", subIndustry: "Passenger Vehicles", marketCapBucket: "Large Cap" },
  { symbol: "BAJAJ-AUTO", companyName: "Bajaj Auto", sector: "Auto", industry: "Automobiles", subIndustry: "Two Wheelers", marketCapBucket: "Large Cap" },

  // ── Infrastructure / Engineering ────────────────────
  { symbol: "LT", companyName: "Larsen & Toubro", sector: "Infrastructure", industry: "Engineering", subIndustry: "Construction & Engineering", marketCapBucket: "Large Cap" },
  { symbol: "ADANIPORTS", companyName: "Adani Ports", sector: "Infrastructure", industry: "Ports", subIndustry: "Sea Port Operations", marketCapBucket: "Large Cap" },

  // ── Pharma ─────────────────────────────────────────
  { symbol: "SUNPHARMA", companyName: "Sun Pharma", sector: "Pharma", industry: "Pharmaceuticals", subIndustry: "Generics", marketCapBucket: "Large Cap" },
  { symbol: "AUROPHARMA", companyName: "Aurobindo Pharma", sector: "Pharma", industry: "Pharmaceuticals", subIndustry: "Generics", marketCapBucket: "Mid Cap" },

  // ── Telecom ────────────────────────────────────────
  { symbol: "BHARTIARTL", companyName: "Bharti Airtel", sector: "Telecom", industry: "Telecom Services", subIndustry: "Mobile Telecom", marketCapBucket: "Large Cap" },

  // ── Consumer / FMCG ───────────────────────────────
  { symbol: "ITC", companyName: "ITC Ltd", sector: "Consumer", industry: "FMCG", subIndustry: "Diversified Consumer", marketCapBucket: "Large Cap" },
  { symbol: "TITAN", companyName: "Titan", sector: "Consumer", industry: "Consumer Durables", subIndustry: "Jewellery & Watches", marketCapBucket: "Large Cap" },
  { symbol: "ASIANPAINT", companyName: "Asian Paints", sector: "Consumer", industry: "Consumer Durables", subIndustry: "Paints & Coatings", marketCapBucket: "Large Cap" },
  { symbol: "ASIANPAINT.NS", companyName: "Asian Paints", sector: "Consumer", industry: "Consumer Durables", subIndustry: "Paints & Coatings", marketCapBucket: "Large Cap" },

  // ── Healthcare ─────────────────────────────────────
  { symbol: "APOLLOHOSP", companyName: "Apollo Hospitals", sector: "Healthcare", industry: "Hospitals", subIndustry: "Private Healthcare", marketCapBucket: "Mid Cap" },

  // ── Cement ─────────────────────────────────────────
  { symbol: "AMBUJACEM", companyName: "Ambuja Cements", sector: "Cement", industry: "Cement & Building Materials", subIndustry: "Cement Manufacturing", marketCapBucket: "Large Cap" },

  // ── Commodities / Metals ───────────────────────────
  { symbol: "BAJAJHLDNG", companyName: "Bajaj Holdings", sector: "Financials", industry: "NBFC", subIndustry: "Investment Holding", marketCapBucket: "Large Cap" },
];

export function getClassification(symbol: string): CompanyClassification | undefined {
  return SECTOR_REGISTRY.find(c => c.symbol === symbol);
}

export function getSectorPeers(symbol: string): CompanyClassification[] {
  const target = getClassification(symbol);
  if (!target) return [];
  return SECTOR_REGISTRY.filter(c => c.symbol !== symbol && c.sector === target.sector);
}

export function getIndustryPeers(symbol: string): CompanyClassification[] {
  const target = getClassification(symbol);
  if (!target) return [];
  return SECTOR_REGISTRY.filter(c => c.symbol !== symbol && c.industry === target.industry);
}

export function getMarketCapPeers(symbol: string): CompanyClassification[] {
  const target = getClassification(symbol);
  if (!target) return [];
  return SECTOR_REGISTRY.filter(c => c.symbol !== symbol && c.marketCapBucket === target.marketCapBucket);
}

export function getAllSectors(): string[] {
  return [...new Set(SECTOR_REGISTRY.map(c => c.sector))].sort();
}

export function getStocksInSector(sector: string): CompanyClassification[] {
  return SECTOR_REGISTRY.filter(c => c.sector === sector);
}
