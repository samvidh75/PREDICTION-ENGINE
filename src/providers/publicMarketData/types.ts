import type { NormalizedQuote as BaseQuote, NormalizedCandle, ProviderHealth as BaseHealth, ProviderId } from '../marketData/types';

export type ProviderDomain = 'quote' | 'historical' | 'bhavcopy' | 'index' | 'fundamentals' | 'macro';

export type PublicProviderId = 'indianapi' | 'yahoo' | 'jugaad-data' | 'nselib' | 'nsepython';

export interface DomainHealth {
  domain: ProviderDomain;
  provider: PublicProviderId;
  status: 'healthy' | 'degraded' | 'unavailable' | 'local_only';
  detail: string;
  checkedAt: string;
}

export interface NormalizedQuote extends BaseQuote {
  freshnessStatus: 'live' | 'stale' | 'unavailable';
}

export interface NormalizedBhavcopy {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  last: number;
  prevClose: number;
  totalTradedQty: number;
  totalTradedValue: number;
  deliveryQty?: number;
  deliveryPercent?: number;
  provider: ProviderId;
  sourceQuality: 'exchange' | 'adjusted' | 'fallback';
}

export interface NormalizedIndexConstituent {
  indexName: string;
  symbol: string;
  companyName?: string;
  sector?: string;
  weight?: number;
  provider: ProviderId;
  sourceDate: string;
}

export interface NormalizedFinancialResult {
  symbol: string;
  companyName?: string;
  periodEndDate: string;
  periodType: string;
  currency?: string;
  unit?: string;
  metricsJson: string;
  sourceLabel: string;
  sourceUrl?: string;
  provider: ProviderId;
  ingestionTimestamp: string;
  sourceQuality: 'exchange' | 'adjusted' | 'fallback';
}

export interface PublicMarketDataProvider {
  readonly providerId: PublicProviderId;
  getQuote(symbol: string): Promise<NormalizedQuote>;
  getHistoricalDaily(symbol: string, fromDate: string, toDate: string): Promise<NormalizedCandle[]>;
  checkHealth(): Promise<BaseHealth>;
}
