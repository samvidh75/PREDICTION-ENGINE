/**
 * PSE Data Provider — Unified Philippine Stock Exchange data source
 * Combines Yahoo Finance (PSE suffix .PS) with PHISIX and EODHD
 */

import axios from 'axios';
import { PhisixProvider, type PhisixStock } from './PhisixProvider';

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

  /**
   * Map a Phisix stock to a PseQuote.
   *
   * Phisix returns only symbol/name/price/percentChange/volume. This mapping
   * previously read `previous_close`, `high`, `low` and `open` off the response
   * — fields the endpoint has never returned — so `change` evaluated to
   * `price - undefined` (NaN) and the OHLC fields were all undefined. The
   * absolute change is now derived from the percentage, and the fields Phisix
   * does not publish are left off rather than emitted as undefined/NaN.
   */
  private toPseQuote(stock: PhisixStock): PseQuote {
    const price = stock.price.amount;
    const changePercent = stock.percentChange ?? 0;
    const previousClose = changePercent === -100 ? price : price / (1 + changePercent / 100);

    return {
      symbol: stock.symbol,
      name: stock.name,
      price,
      change: Math.round((price - previousClose) * 10000) / 10000,
      changePercent,
      volume: stock.volume,
      previousClose: Math.round(previousClose * 10000) / 10000,
      timestamp: new Date().toISOString(),
      source: 'phisix',
    };
  }

  private async getPhisixQuote(symbol: string): Promise<PseQuote> {
    const stock = await this.phisix.getStock(symbol);
    if (!stock) throw new Error(`${symbol} not found in PHISIX`);
    return this.toPseQuote(stock);
  }

  async getPseStocks(): Promise<PseQuote[]> {
    const stocks = await this.phisix.getStocks();
    return stocks.map(s => this.toPseQuote(s));
  }

  get name(): string {
    return 'PSE Provider';
  }
}

export const pseDataProvider = new PseDataProvider();
export default PseDataProvider;
