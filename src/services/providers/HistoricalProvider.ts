import type { HistoricalPoint } from '../data/types';

export interface HistoricalProvider {
  getHistorical(symbol: string, range?: string): Promise<HistoricalPoint[]>;
}
