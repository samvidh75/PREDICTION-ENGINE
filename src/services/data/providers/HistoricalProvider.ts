// src/services/data/providers/HistoricalProvider.ts
import { HistoricalPoint } from '../types';

export interface HistoricalProvider {
  getHistory(symbol: string): Promise<HistoricalPoint[]>;
}

export class MockHistoricalProvider implements HistoricalProvider {
  public async getHistory(symbol: string): Promise<HistoricalPoint[]> {
    const points: HistoricalPoint[] = [];
    const basePrice = symbol.toUpperCase() === 'RELIANCE' ? 2800 : 150;
    
    // Generate 30 days of mock timeline points
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      points.push({
        date: date.toISOString().split('T')[0],
        open: basePrice + Math.sin(i) * 10,
        high: basePrice + Math.sin(i) * 10 + 5,
        low: basePrice + Math.sin(i) * 10 - 5,
        close: basePrice + Math.sin(i) * 10 + Math.cos(i) * 3,
        volume: 50000 + Math.floor(Math.random() * 20000),
      });
    }

    return points;
  }
}
