import axios from 'axios';

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sector: string;
  industry: string;
  pe: number;
  pb: number;
  roe: number;
  debtToEquity: number;
  marketCap: number;
  dividendYield: number;
  revenueGrowth: number;
  profitGrowth: number;
  rsi: number;
  macd: number;
  adx: number;
  news: Array<{ headline: string; source: string; time: string }>;
}

export async function fetchStockData(symbol: string): Promise<StockData> {
  try {
    const quoteRes = await axios.get(`https://api.indianapi.in/stock/${symbol}`);
    const quote = quoteRes.data.data.quote;

    const fundRes = await axios.get(`https://www.screener.in/api/companies/${symbol}/`);
    const fund = fundRes.data;

    const histRes = await axios.get(`/api/historical/${symbol}?period=1y`);
    const technical = calculateTechnicals(histRes.data);

    const newsRes = await axios.get(`/api/news/${symbol}`);

    return {
      symbol,
      name: quote.longName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      sector: fund.sector,
      industry: fund.industry,
      pe: fund.priceToEarning,
      pb: fund.priceToBook,
      roe: fund.roe,
      debtToEquity: fund.debtToEquity,
      marketCap: quote.marketCap,
      dividendYield: fund.dividendYield,
      revenueGrowth: fund.revenueGrowth,
      profitGrowth: fund.profitGrowth,
      rsi: technical.rsi,
      macd: technical.macd,
      adx: technical.adx,
      news: newsRes.data,
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    throw error;
  }
}

export async function searchStocks(query: string): Promise<any[]> {
  const res = await axios.get(`/api/search?query=${query.toUpperCase()}`);
  return res.data;
}

export async function scanStocks(type: 'quality' | 'value' | 'momentum' | 'stable') {
  const res = await axios.get(`/api/scanner?type=${type}&limit=50`);
  return res.data;
}

function calculateTechnicals(historical: any[]): { rsi: number; macd: number; adx: number } {
  return { rsi: 55, macd: 0.5, adx: 28 };
}
