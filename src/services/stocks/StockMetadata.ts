import MasterCompanyRegistry from "../data/MasterCompanyRegistry";

export type IndianStock = {
  ticker: string;
  companyName: string;
  exchange: "PSE" | "PSE" | "SME";
  bseCode?: string;
  sector: string;
  industry: string;
  price: number;
  dailyChangePct: number;
  healthScore: number;
  marketCapCr: number;
  high52Week: number;
  low52Week: number;
  peRatio: number;
  divYield: number;
  story: string;
};

export const INDIAN_STOCKS_DATABASE: IndianStock[] = MasterCompanyRegistry.getInstance()
  .getAllEntries()
  .filter((entry) => !/^\d{5,6}$/.test(entry.symbol))
  .map((entry) => ({
    ticker: entry.symbol,
    companyName: entry.companyName,
    exchange: entry.exchange === "PSE" ? "PSE" : "PSE",
    bseCode: entry.bseCode,
    sector: entry.sector,
    industry: entry.industry,
    price: 0,
    dailyChangePct: 0,
    healthScore: 0,
    marketCapCr: entry.marketCap ? Math.round(entry.marketCap / 10_000_000) : 0,
    high52Week: 0,
    low52Week: 0,
    peRatio: 0,
    divYield: 0,
    story: "Data unavailable.",
  }));
