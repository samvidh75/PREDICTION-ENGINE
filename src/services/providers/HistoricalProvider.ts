// src/services/providers/HistoricalProvider.ts
import { HistoricalPoint } from '../data/types';

export interface HistoricalProvider {
  getHistory(symbol: string, range?: string): Promise<HistoricalPoint[]>;
}
