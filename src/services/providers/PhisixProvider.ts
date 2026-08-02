/**
 * PHISIX Provider — Philippine Stock Exchange (PSE) data via phisix-api3
 * Free, no-auth REST API for PSE stock data
 * Docs: https://phisix-api3.appspot.com/
 */

import axios, { AxiosInstance } from 'axios';

export interface PhisixStock {
  symbol: string;
  name: string;
  price: {
    amount: number;
    currency: string;
  };
  percent_change: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
}

export interface PhisixResponse {
  stock: PhisixStock[];
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
    return data.stock;
  }

  async getStock(symbol: string): Promise<PhisixStock | null> {
    const { data } = await this.client.get<PhisixResponse>(`/stocks/${symbol}.json`);
    return data.stock[0] || null;
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
