/**
 * PHISIX Provider — Philippine Stock Exchange (PSE) data via phisix-api3
 * Free, no-auth REST API for PSE stock data
 * Docs: https://phisix-api3.appspot.com/
 */

import axios, { AxiosInstance } from 'axios';
import type { StockQuote } from '../data/types';

/**
 * A single stock as phisix-api3 actually returns it. Verified live against
 * https://phisix-api3.appspot.com/stocks/BDO.json (2026-08-20):
 *
 *   {"stocks":[{"name":"BDO Unibank, Inc.","price":{"currency":"PHP","amount":122.70},
 *     "percentChange":0.49,"volume":2701960,"symbol":"BDO"}],
 *    "as_of":"2026-08-20T00:00:00+08:00"}
 *
 * The previous shape declared here (`percent_change`, plus high/low/open/
 * previous_close) did not match the endpoint — those fields are not returned.
 */
export interface PhisixStock {
  symbol: string;
  name: string;
  price: {
    amount: number;
    currency: string;
  };
  percentChange: number;
  volume: number;
}

export interface PhisixResponse {
  /** The API returns `stocks` (plural). Reading `stock` yields undefined. */
  stocks: PhisixStock[];
  as_of: string;
}

export class PhisixProvider {
  private client: AxiosInstance;
  private baseUrl = 'https://phisix-api3.appspot.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async getStocks(): Promise<PhisixStock[]> {
    const { data } = await this.client.get<PhisixResponse>('/stocks.json');
    return data.stocks ?? [];
  }

  async getStock(symbol: string): Promise<PhisixStock | null> {
    const { data } = await this.client.get<PhisixResponse>(
      `/stocks/${encodeURIComponent(symbol.toUpperCase())}.json`,
    );
    return data.stocks?.[0] ?? null;
  }

  /**
   * Quote for a single PSE symbol.
   *
   * ProviderCoordinator.getQuote() invokes `provider.getQuote(symbol)` on every
   * registered price provider, and Phisix is the first one in that chain. This
   * method did not exist, so the call threw "p.getQuote is not a function" for
   * every symbol; the chain then fell through to Yahoo, whose `.PS` suffix
   * resolves PSE tickers to dead mutual-fund records with a null price, and
   * finally to data/pse-live-prices.json, which is empty. The result was a 503
   * from stockHandler for every stock detail page.
   *
   * PriceProvider is a bare stub class with no instance members, so structural
   * typing accepted a provider missing this method and the compiler never
   * flagged it.
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    // Fetched inline rather than via getStock() so the response's `as_of`
    // market timestamp is available for the freshness fields below.
    const { data } = await this.client.get<PhisixResponse>(
      `/stocks/${encodeURIComponent(symbol.toUpperCase())}.json`,
    );
    const stock = data.stocks?.[0];
    if (!stock || typeof stock.price?.amount !== 'number') {
      throw new Error(`Phisix has no quote for ${symbol}`);
    }

    const price = stock.price.amount;
    const changePercent = stock.percentChange ?? 0;
    // Phisix exposes only the percentage, so derive the absolute move from it.
    const previousClose = changePercent === -100 ? price : price / (1 + changePercent / 100);
    const change = Math.round((price - previousClose) * 10000) / 10000;

    return {
      symbol: stock.symbol,
      exchange: 'PSE',
      price,
      change,
      changePercent,
      volume: stock.volume,
      updatedAt: data.as_of,
      asOf: data.as_of ?? null,
      retrievedAt: new Date().toISOString(),
      source: 'provider',
      // Phisix publishes an end-of-day snapshot, not a live intraday tick.
      freshness: 'delayed',
      delayed: true,
    };
  }

  async getAllPrices(): Promise<Map<string, number>> {
    const stocks = await this.getStocks();
    const map = new Map<string, number>();
    for (const s of stocks) {
      map.set(s.symbol, s.price.amount);
    }
    return map;
  }

  get name(): string {
    return 'phisix';
  }

  async getHealth(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.client.get('/stocks.json');
      return { ok: true, latency: Date.now() - start };
    } catch {
      return { ok: false, latency: Date.now() - start };
    }
  }
}

export const phisixProvider = new PhisixProvider();
export default PhisixProvider;
