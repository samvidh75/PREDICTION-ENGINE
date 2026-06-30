import type { CompanyMetadata } from '../data/types';

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  summary: string;
  datetime: string;
  /** Optional timestamp override — some providers supply a separate publish timestamp */
  timestamp?: string;
  /** Optional impact classification from the provider */
  impact?: 'Positive' | 'Negative' | 'Neutral';
}

export interface NewsProvider {
  getNews(symbol: string): Promise<NewsItem[]>;
}
