/**
 * PSE Data Provider — Unified Philippine Stock Exchange data source
 * Combines Yahoo Finance (PSE suffix .PS) with PHISIX and EODHD
 */

import axios from 'axios';
import { PhisixProvider } from './PhisixProvider';

export interface PseQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp: string;
  source: string;
}

export interface PseFundamentals {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  dividendYield: number | null;
  eps: number | null;
  sharesOutstanding: number | null;
}

const PSE_SUFFIX = '.PS'; // Yahoo Finance suffix for PSE

export class PseDataProvider {
  private phisix: PhisixProvider;
  private yahooBase = 'https://query1.finance.yahoo.com/v8/finance/chart';

  constructor() {
    this.phisix = new PhisixProvider();
  }

  async getQuote(symbol: string): Promise<PseQuote> {
    const errors: string[] = [];

    try {
      return await this.getYahooQuote(symbol);
    } catch (e) {
      errors.push(`yahoo: ${e}`);
    }

    try {
      return await this.getPhisixQuote(symbol);
    } catch (e) {
      errors.push(`phisix: ${e}`);
    }

    throw new Error(`All PSE quote providers failed for ${symbol}: ${errors.join(' | ')}`);
  }

  private async getYahooQuote(symbol: string): Promise<PseQuote> {
    const yahooSymbol = symbol.endsWith(PSE_SUFFIX) ? symbol : `${symbol}${PSE_SUFFIX}`;
    const { data } = await axios.get(`${this.yahooBase}/${yahooSymbol}`, {
      params: { interval: '1d', range: '1d' },
      timeout: 8000,
    });

    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];

    return {
      symbol: symbol.toUpperCase(),
      name: meta.shortName || meta.longName || symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      volume: quote.volume?.[0] || 0,
      marketCap: meta.marketCap,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
      previousClose: meta.previousClose,
      timestamp: new Date().toISOString(),
      source: 'yahoo',
    };
  }

  private async getPhisixQuote(symbol: string): Promise<PseQuote> {
    const stock = await this.phisix.getStock(symbol);
    if (!stock) throw new Error(`${symbol} not found in PHISIX`);

    return {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price.amount,
      change: stock.price.amount - stock.previous_close,
      changePercent: stock.percent_change,
      volume: stock.volume,
      high: stock.high,
      low: stock.low,
      open: stock.open,
      previousClose: stock.previous_close,
      timestamp: new Date().toISOString(),
      source: 'phisix',
    };
  }

  async getPseStocks(): Promise<PseQuote[]> {
    const stocks = await this.phisix.getStocks();
    return stocks.map(s => ({
      symbol: s.symbol,
      name: s.name,
      price: s.price.amount,
      change: s.price.amount - s.previous_close,
      changePercent: s.percent_change,
      volume: s.volume,
      high: s.high,
      low: s.low,
      open: s.open,
      previousClose: s.previous_close,
      timestamp: new Date().toISOString(),
      source: 'phisix',
    }));
  }

  get name(): string {
    return 'PSE Provider';
  }
}

export const pseDataProvider = new PseDataProvider();
export default PseDataProvider;
