// src/services/providers/NewsProvider.ts

export interface NewsItem {
  title: string;
  url: string;
  source?: string;
  summary?: string;
  datetime: string; // ISO date
}

export interface NewsProvider {
  getNews(symbol: string): Promise<NewsItem[]>;
}
