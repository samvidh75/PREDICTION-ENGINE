// src/services/data/providers/NewsProvider.ts

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  sector: string;
  timestamp: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
}

export interface NewsProvider {
  getNews(symbol: string): Promise<NewsItem[]>;
}

export class MockNewsProvider implements NewsProvider {
  public async getNews(symbol: string): Promise<NewsItem[]> {
    const sym = symbol.toUpperCase();
    return [
      {
        id: `news_${sym}_1`,
        title: `${sym} Secures Large Capital Order`,
        summary: `The contract expands the long-term capex pipelines of ${sym} by 14% year-on-year.`,
        sector: 'Manufacturing',
        timestamp: '2 hours ago',
        impact: 'Positive',
      },
      {
        id: `news_${sym}_2`,
        title: `Analysts Upgrade ${sym} Margins Outlook`,
        summary: `Strategic investments in regional capacity support margin safety thresholds.`,
        sector: 'Finance',
        timestamp: '1 day ago',
        impact: 'Positive',
      },
    ];
  }
}
