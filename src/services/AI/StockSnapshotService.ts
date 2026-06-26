import { sglangService } from './SGLangService';
import type { StockAnalysis } from './types';

export interface StockSnapshotInput {
  symbol: string;
  price: number;
  changePercent: number;
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  roic: number | null;
  revenueGrowth: number | null;
  debtEquity: number | null;
  marketCap: number | null;
}

export interface StockSnapshot {
  symbol: string;
  price: number;
  changePercent: number;
  analysis: StockAnalysis;
  generatedAt: string;
}

export class StockSnapshotService {
  async generateSnapshot(input: StockSnapshotInput): Promise<StockSnapshot> {
    const analysis = await sglangService.analyzeStockParallel(input.symbol, {
      roe: input.roe,
      roic: input.roic,
      peRatio: input.peRatio,
      pbRatio: input.pbRatio,
      revenueGrowth: input.revenueGrowth,
      debtEquity: input.debtEquity,
    });

    return {
      symbol: input.symbol,
      price: input.price,
      changePercent: input.changePercent,
      analysis,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const stockSnapshotService = new StockSnapshotService();
