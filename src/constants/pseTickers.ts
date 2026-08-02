/**
 * PSE Listed Stock Master List.
 *
 * This file consolidates the PSE stock universe into a single source of truth
 * for the frontend. It includes the full ticker list, PSEi-30 constituents,
 * sector indices, REITs, and ETF listings.
 *
 * @module pseTickers
 */

/** PSE sector index identifiers */
export const PSE_SECTOR_INDICES = [
  { id: "PSEI", name: "PSEi Composite", symbol: "PSEI" },
  { id: "FIN", name: "Financials", symbol: "FIN" },
  { id: "IND", name: "Industrial", symbol: "IND" },
  { id: "HOLD", name: "Holding Firms", symbol: "HOLD" },
  { id: "PROP", name: "Property", symbol: "PROP" },
  { id: "SERV", name: "Services", symbol: "SERV" },
  { id: "MINING", name: "Mining & Oil", symbol: "MINING" },
] as const;

/** PSEi-30 constituent stocks (the 30 most liquid blue chips) */
export const PSEI_30: readonly string[] = [
  "AC", "ACEN", "AEV", "AGI", "ALI", "AP", "BDO", "BPI", "CEB",
  "CNPF", "DMC", "FGEN", "GLO", "GTCAP", "ICT", "JFC", "JGS",
  "LEE", "LTG", "MBT", "MEG", "MER", "MONDE", "PGOLD", "RLC",
  "RRHI", "SCC", "SM", "SMPH", "TEL", "UBP", "URC", "VLL",
  "WLCON",
];
/** PSE-listed REITs (Real Estate Investment Trusts) */
export const PSE_REITS: Array<{ symbol: string; name: string }> = [
  { symbol: "AREIT", name: "AREIT, Inc." },
  { symbol: "CREIT", name: "Citicore Energy REIT Corp." },
  { symbol: "DDMPR", name: "DDMP REIT, Inc." },
  { symbol: "FILRT", name: "Filinvest REIT Corp." },
  { symbol: "MREIT", name: "MREIT, Inc." },
  { symbol: "PREIT", name: "Precious Homes REIT, Inc." },
  { symbol: "RCR", name: "Rockwell Land REIT Corp." },
  { symbol: "VREIT", name: "Vista REIT, Inc." },
];

/** PSE sectoral classification (six-sector taxonomy) */
export type PSESector =
  | "Financials"
  | "Industrial"
  | "Holding Firms"
  | "Property"
  | "Services"
  | "Mining & Oil"
  | "Consumer"
  | "Technology"
  | "Utilities"
  | "SME"
  | "ETF";

/** Stock metadata for quick lookup */
export interface PSEStockInfo {
  symbol: string;
  name: string;
  sector: PSESector;
  isPSEi30?: boolean;
  isREIT?: boolean;
  isETF?: boolean;
}
/**
 * Pre-built lookup map for the most commonly referenced PSE stocks.
 * For the full 285+ universe, use scripts/pse-universe.json.
 */
export const PSE_COMMON_STOCKS: Record<string, PSEStockInfo> = {
  // Blue chips
  AC: { symbol: "AC", name: "Ayala Corp.", sector: "Holding Firms", isPSEi30: true },
  ALI: { symbol: "ALI", name: "Ayala Land, Inc.", sector: "Property", isPSEi30: true },
  BDO: { symbol: "BDO", name: "BDO Unibank, Inc.", sector: "Financials", isPSEi30: true },
  BPI: { symbol: "BPI", name: "Bank of the Philippine Islands", sector: "Financials", isPSEi30: true },
  GLO: { symbol: "GLO", name: "Globe Telecom, Inc.", sector: "Services", isPSEi30: true },
  ICT: { symbol: "ICT", name: "International Container Terminal Services, Inc.", sector: "Services", isPSEi30: true },
  JFC: { symbol: "JFC", name: "Jollibee Foods Corp.", sector: "Consumer", isPSEi30: true },
  JGS: { symbol: "JGS", name: "JG Summit Holdings, Inc.", sector: "Holding Firms", isPSEi30: true },
  MER: { symbol: "MER", name: "Manila Electric Co.", sector: "Utilities", isPSEi30: true },
  MONDE: { symbol: "MONDE", name: "Monde Nissin Corp.", sector: "Consumer", isPSEi30: true },
  PGOLD: { symbol: "PGOLD", name: "Puregold Price Club, Inc.", sector: "Consumer", isPSEi30: true },
  SM: { symbol: "SM", name: "SM Investments Corp.", sector: "Holding Firms", isPSEi30: true },
  SMPH: { symbol: "SMPH", name: "SM Prime Holdings, Inc.", sector: "Property", isPSEi30: true },
  TEL: { symbol: "TEL", name: "PLDT, Inc.", sector: "Services", isPSEi30: true },
  URC: { symbol: "URC", name: "Universal Robina Corp.", sector: "Consumer", isPSEi30: true },
  MBT: { symbol: "MBT", name: "Metropolitan Bank & Trust Co.", sector: "Financials", isPSEi30: true },
  SCC: { symbol: "SCC", name: "Semirara Mining and Power Corp.", sector: "Mining & Oil", isPSEi30: true },
  ACEN: { symbol: "ACEN", name: "AC Energy Corp.", sector: "Utilities", isPSEi30: true },
  AEV: { symbol: "AEV", name: "Aboitiz Power Corp.", sector: "Utilities", isPSEi30: true },
  AGI: { symbol: "AGI", name: "Alliance Global Group, Inc.", sector: "Holding Firms", isPSEi30: true },
  AP: { symbol: "AP", name: "Aboitiz Power Corp.", sector: "Utilities", isPSEi30: true },
  CEB: { symbol: "CEB", name: "Cebu Air, Inc.", sector: "Services", isPSEi30: true },
  DMC: { symbol: "DMC", name: "DMCI Holdings, Inc.", sector: "Holding Firms", isPSEi30: true },
  FGEN: { symbol: "FGEN", name: "First Gen Corp.", sector: "Utilities", isPSEi30: true },
  GTCAP: { symbol: "GTCAP", name: "GT Capital Holdings, Inc.", sector: "Holding Firms", isPSEi30: true },
  LTG: { symbol: "LTG", name: "LT Group, Inc.", sector: "Holding Firms", isPSEi30: true },
  MEG: { symbol: "MEG", name: "Megaworld Corp.", sector: "Property", isPSEi30: true },
  RLC: { symbol: "RLC", name: "Robinsons Land Corp.", sector: "Property", isPSEi30: true },
  RRHI: { symbol: "RRHI", name: "Robinsons Retail Holdings, Inc.", sector: "Consumer", isPSEi30: true },
  UBP: { symbol: "UBP", name: "Union Bank of the Philippines", sector: "Financials", isPSEi30: true },
  VLL: { symbol: "VLL", name: "Vista Land & Lifescapes, Inc.", sector: "Property", isPSEi30: true },
  WLCON: { symbol: "WLCON", name: "Wilcon Depot, Inc.", sector: "Consumer", isPSEi30: true },

  // REITs
  AREIT: { symbol: "AREIT", name: "AREIT, Inc.", sector: "Property", isREIT: true },
  CREIT: { symbol: "CREIT", name: "Citicore Energy REIT Corp.", sector: "Property", isREIT: true },
  MREIT: { symbol: "MREIT", name: "MREIT, Inc.", sector: "Property", isREIT: true },
  RCR: { symbol: "RCR", name: "Rockwell Land REIT Corp.", sector: "Property", isREIT: true },
  DDMPR: { symbol: "DDMPR", name: "DDMP REIT, Inc.", sector: "Property", isREIT: true },
  FILRT: { symbol: "FILRT", name: "Filinvest REIT Corp.", sector: "Property", isREIT: true },
  PREIT: { symbol: "PREIT", name: "Precious Homes REIT, Inc.", sector: "Property", isREIT: true },
  VREIT: { symbol: "VREIT", name: "Vista REIT, Inc.", sector: "Property", isREIT: true },

  // ETFs
  FMETF: { symbol: "FMETF", name: "First Metro Philippine Equity ETF", sector: "ETF", isETF: true },
  PSEETF: { symbol: "PSEETF", name: "PSE ETF", sector: "ETF", isETF: true },
};

/**
 * Look up a stock's info by symbol (case-insensitive).
 * Returns undefined for unknown symbols.
 */
export function lookupPSEStock(symbol: string): PSEStockInfo | undefined {
  return PSE_COMMON_STOCKS[symbol.toUpperCase()];
}

/**
 * Get all PSEi-30 stocks with their full info.
 */
export function getPSEi30Stocks(): PSEStockInfo[] {
  return PSEI_30.map((s) => lookupPSEStock(s)).filter(
    (s): s is PSEStockInfo => s !== undefined,
  );
}

/**
 * Get all PSE REIT stocks with their full info.
 */
export function getPSEReits(): PSEStockInfo[] {
  return PSE_REITS.map((r) => lookupPSEStock(r.symbol)).filter(
    (s): s is PSEStockInfo => s !== undefined,
  );
}