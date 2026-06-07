export type HealthStatus =
  | 'very-healthy'
  | 'healthy'
  | 'stable'
  | 'watchlist'
  | 'weakening'
  | 'unhealthy';

export interface HealthometerSignal {
  id: string;
  title: string;
  confidence: number;
  status: HealthStatus;
  summary: string;
  category:
    | 'financials'
    | 'momentum'
    | 'sentiment'
    | 'valuation'
    | 'market-behaviour';
}

export interface StoryBlock {
  id: string;
  title: string;
  narrative: string;
  importance: 'low' | 'medium' | 'high';
}
