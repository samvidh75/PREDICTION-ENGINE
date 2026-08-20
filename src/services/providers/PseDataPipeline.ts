/**
 * PSE Data Pipeline — Orchestrates all PSE data sources
 * Combines PHISIX, Yahoo Finance (.PS), EODHD, and Twelve Data
 * for the Philippine Stock Exchange
 */

import { PseDataProvider } from './PseDataProvider';
import { PhisixProvider, type PhisixStock } from './PhisixProvider';
import axios from 'axios';

/**
 * Absolute price move for a Phisix stock.
 *
 * Phisix publishes `percentChange` but no `previous_close`. Four call sites in
 * this file computed `price - s.previous_close`, which was `price - undefined`
 * (NaN), and the gainers/losers filters tested `s.percent_change > 0` against
 * an always-undefined field — so those endpoints returned empty lists. Derive
 * the move from the percentage instead.
 */
function absoluteChange(stock: PhisixStock): number {
  const price = stock.price.amount;
  const changePercent = stock.percentChange ?? 0;
  const previousClose = changePercent === -100 ? price : price / (1 + changePercent / 100);
  return Math.round((price - previousClose) * 10000) / 10000;
}

/** Map a Phisix stock to the pipeline's result shape. */
function toResult(stock: PhisixStock, sector: string): PseDataResult {
  return {
    symbol: stock.symbol,
    name: stock.name,
    price: stock.price.amount,
    change: absoluteChange(stock),
    changePercent: stock.percentChange ?? 0,
    volume: stock.volume,
    sector,
  };
}

export interface PseMarketSummary {
  index: { psei: number; pseiChange: number; pseiChangePercent: number };
  advancers: number;
  decliners: number;
  unchanged: number;
  volume: number;
  value: number;
  timestamp: string;
}

export interface PseDataResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  sector: string;
}

export class PseDataPipeline {
  private pseProvider: PseDataProvider;
  private phisix: PhisixProvider;

  constructor() {
    this.pseProvider = new PseDataProvider();
    this.phisix = new PhisixProvider();
  }

  async getMarketSummary(): Promise<PseMarketSummary> {
    const stocks = await this.phisix.getStocks();
    let advancers = 0, decliners = 0, unchanged = 0;
    let totalVolume = 0;

    for (const s of stocks) {
      const pct = s.percentChange ?? 0;
      if (pct > 0) advancers++;
      else if (pct < 0) decliners++;
      else unchanged++;
      totalVolume += s.volume;
    }

    // Equal-weighted average % change across the fetched constituents — a
    // proxy for index direction, not the PSE's own official market-cap-
    // weighted PSEi value (PHISIX doesn't expose per-stock market cap, so
    // true cap-weighting isn't possible from this feed).
    const pseiChangePercent = stocks.length
      ? Number((stocks.reduce((sum, s) => sum + (s.percentChange ?? 0), 0) / stocks.length).toFixed(2))
      : 0;
    const avgPrice = stocks.length
      ? stocks.reduce((sum, s) => sum + s.price.amount, 0) / stocks.length
      : 0;
    const pseiChange = Number(((avgPrice * pseiChangePercent) / 100).toFixed(2));

    return {
      index: { psei: avgPrice, pseiChange, pseiChangePercent },
      advancers,
      decliners,
      unchanged,
      volume: totalVolume,
      value: stocks.reduce((sum, s) => sum + s.price.amount * s.volume, 0),
      timestamp: new Date().toISOString(),
    };
  }

  async getTopGainers(limit = 10): Promise<PseDataResult[]> {
    const stocks = await this.phisix.getStocks();
    return stocks
      .filter(s => (s.percentChange ?? 0) > 0)
      .sort((a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0))
      .slice(0, limit)
      .map(s => toResult(s, 'N/A'));
  }

  async getTopLosers(limit = 10): Promise<PseDataResult[]> {
    const stocks = await this.phisix.getStocks();
    return stocks
      .filter(s => (s.percentChange ?? 0) < 0)
      .sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0))
      .slice(0, limit)
      .map(s => toResult(s, 'N/A'));
  }

  async getMostActive(limit = 10): Promise<PseDataResult[]> {
    const stocks = await this.phisix.getStocks();
    return stocks
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit)
      .map(s => toResult(s, 'N/A'));
  }

  async getAllSectors(): Promise<Record<string, PseDataResult[]>> {
    const stocks = await this.phisix.getStocks();
    const sectors: Record<string, PseDataResult[]> = {};
    for (const s of stocks) {
      const sector = 'All';
      if (!sectors[sector]) sectors[sector] = [];
      sectors[sector].push(toResult(s, sector));
    }
    return sectors;
  }

  async getHistoricalData(symbol: string, days = 30): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
    try {
      const yahooSymbol = symbol.endsWith('.PS') ? symbol : `${symbol}.PS`;
      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        { params: { interval: '1d', range: `${days}d` }, timeout: 8000 },
      );

      const result = data.chart.result[0];
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];
      const adjclose = result.indicators.adjclose?.[0]?.adjclose;

      return timestamps.map((t: number, i: number) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: adjclose?.[i] || quote.close[i],
        volume: quote.volume[i] || 0,
      }));
    } catch {
      return [];
    }
  }

  get name(): string {
    return 'PSE Data Pipeline';
  }
}

export const pseDataPipeline = new PseDataPipeline();
export default PseDataPipeline;
