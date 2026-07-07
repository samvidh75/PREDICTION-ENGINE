/**
 * PSE Sector Registry
 * Philippine Stock Exchange market classifications for all 18 stocks.
 * Sources: PSE official sector/industry mapping.
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
  // ── Financial Services — Banks ─────────────────────
  { symbol: "BDO", companyName: "BDO Unibank", sector: "Financial Services", industry: "Banking", subIndustry: "Universal Banking", marketCapBucket: "Large Cap" },
  { symbol: "BPI", companyName: "Bank of the Philippine Islands", sector: "Financial Services", industry: "Banking", subIndustry: "Universal Banking", marketCapBucket: "Large Cap" },
  { symbol: "UBP", companyName: "Union Bankcom", sector: "Financial Services", industry: "Banking", subIndustry: "Universal Banking", marketCapBucket: "Large Cap" },
  { symbol: "PNB", companyName: "Philippine National Bank", sector: "Financial Services", industry: "Banking", subIndustry: "Public Banking", marketCapBucket: "Large Cap" },
  { symbol: "UCPB", companyName: "United Coconut Planters Bank", sector: "Financial Services", industry: "Banking", subIndustry: "Thrift Bank", marketCapBucket: "Mid Cap" },
  { symbol: "SECB", companyName: "Security Bank", sector: "Financial Services", industry: "Banking", subIndustry: "Universal Banking", marketCapBucket: "Mid Cap" },

  // ── Consumer — Food & Beverage ──────────────────────
  { symbol: "JFC", companyName: "Jollibee Foods Corporation", sector: "Consumer", industry: "Food & Beverage", subIndustry: "Quick Service Restaurants", marketCapBucket: "Large Cap" },

  // ── Utilities ──────────────────────────────────────
  { symbol: "MER", companyName: "Manila Electric Company", sector: "Utilities", industry: "Electric & Gas", subIndustry: "Power Distribution", marketCapBucket: "Large Cap" },

  // ── Retail & Real Estate ───────────────────────────
  { symbol: "SM", companyName: "SM Investments Holdings", sector: "Retail & Real Estate", industry: "Diversified Trading", subIndustry: "Retail & Shopping", marketCapBucket: "Large Cap" },
  { symbol: "ALI", companyName: "Ayala Land", sector: "Retail & Real Estate", industry: "Real Estate", subIndustry: "Property Development", marketCapBucket: "Large Cap" },
  { symbol: "SMPH", companyName: "SM Prime Holdings", sector: "Retail & Real Estate", industry: "Real Estate", subIndustry: "Shopping Centers", marketCapBucket: "Large Cap" },

  // ── Conglomerate ───────────────────────────────────
  { symbol: "AEV", companyName: "Aboitiz Equity Ventures", sector: "Conglomerate", industry: "Diversified", subIndustry: "Holding Company", marketCapBucket: "Large Cap" },
  { symbol: "AC", companyName: "Ayala Corporation", sector: "Conglomerate", industry: "Diversified", subIndustry: "Conglomerate", marketCapBucket: "Large Cap" },

  // ── Telecommunications ─────────────────────────────
  { symbol: "TEL", companyName: "Philippine Long Distance Telephone", sector: "Telecommunications", industry: "Telecom", subIndustry: "Fixed-Line & Wireless", marketCapBucket: "Large Cap" },
  { symbol: "GLOBE", companyName: "Globe Telecom", sector: "Telecommunications", industry: "Telecom", subIndustry: "Mobile & Fixed-Line", marketCapBucket: "Large Cap" },

  // ── Transportation ─────────────────────────────────
  { symbol: "PAL", companyName: "Philippine Airlines", sector: "Transportation", industry: "Airlines", subIndustry: "Passenger & Cargo", marketCapBucket: "Mid Cap" },

  // ── Energy & Mining ────────────────────────────────
  { symbol: "SMC", companyName: "Semirara Mining and Power", sector: "Energy", industry: "Coal & Minerals", subIndustry: "Coal Mining & Power", marketCapBucket: "Mid Cap" },
  { symbol: "RLC", companyName: "Raytheon Leidos", sector: "Manufacturing", industry: "Heavy Equipment", subIndustry: "Industrial Equipment", marketCapBucket: "Mid Cap" },
];
