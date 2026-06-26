import type { Fundamentals, Quote } from '@/types';

export interface EngineInput {
  fundamentals: Fundamentals;
  quote: Quote;
  technicals?: {
    rsi: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    adx: number | null;
    atr: number | null;
    volatility: number | null;
    trendStrength: number | null;
    sectorName?: string;
  };
}

export interface EngineResult {
  score: number;
  confidence: 'high' | 'medium' | 'low';
}
