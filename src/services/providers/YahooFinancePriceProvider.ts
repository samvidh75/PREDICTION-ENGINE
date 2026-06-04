// src/services/providers/YahooFinancePriceProvider.ts
import { PriceProvider } from './PriceProvider';
import { StockQuote } from '../data/types';

/**
 * YahooFinancePriceProvider fetches real‑time quote data from Yahoo Finance.
 * It expects symbols in the format "RELIANCE.NS" for NSE and "RELIANCE.BO" for BSE.
 */
export class YahooFinancePriceProvider implements PriceProvider {
  async getQuote(symbol: string): Promise<StockQuote> {
    // Determine exchange suffix based on symbol format or default to NSE
    const exchangeSuffix = symbol.endsWith('.BO') ? '.BO' : '.NS';
    const ticker = `${symbol.toUpperCase()}${exchangeSuffix}`;
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(ticker)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YahooFinancePriceProvider failed: ${response.status}`);
    }
    const data = await response.json();
    const result = data?.quoteResponse?.result?.[0];
    if (!result) {
      throw new Error(`No quote data for ${symbol}`);
    }
    const quote: StockQuote = {
      symbol: result.symbol.replace('.NS', '').replace('.BO', ''),
      exchange: result.exchange === 'NSE' ? 'NSE' : 'BSE',
      price: result.regularMarketPrice,
      change: result.regularMarketChange,
      changePercent: result.regularMarketChangePercent,
      volume: result.regularMarketVolume,
      updatedAt: new Date(result.regularMarketTime * 1000).toISOString(),
    };
    return quote;
  }
}
