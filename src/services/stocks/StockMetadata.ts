export type IndianStock = {
  ticker: string;
  companyName: string;
  exchange: "NSE" | "BSE" | "SME";
  bseCode?: string;
  sector: string;
  industry: string;
  price: number;
  dailyChangePct: number;
  healthScore: number; // 0 - 100
  marketCapCr: number;
  high52Week: number;
  low52Week: number;
  peRatio: number;
  divYield: number;
  story: string; // Plain English, max 120 words
};

import { generate500Stocks } from "./generate500Stocks";

export const INDIAN_STOCKS_DATABASE: IndianStock[] = (() => {
  const dynamicList = generate500Stocks();
  return dynamicList.map(stock => ({
    ticker: stock.symbol,
    companyName: stock.name,
    exchange: stock.exchange as any,
    bseCode: stock.exchange === "BSE" ? "500000" : undefined,
    sector: stock.sector,
    industry: stock.industry,
    price: 150.00,
    dailyChangePct: 1.0,
    healthScore: 75,
    marketCapCr: 50000,
    high52Week: 200.00,
    low52Week: 100.00,
    peRatio: 22.0,
    divYield: 1.5,
    story: `${stock.name} is a leading player in the ${stock.sector} sector, showing robust operational capabilities and market share growth.`
  }));
})();
