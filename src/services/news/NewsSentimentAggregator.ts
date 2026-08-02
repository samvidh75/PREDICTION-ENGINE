export interface NewsArticle {
  id: string;
  symbol: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  sentiment: number;
  relevance: number;
  topics: string[];
}

export interface NewsSentimentSummary {
  symbol: string;
  overallSentiment: number;
  sentimentLabel: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  articleCount: number;
  periodStart: string;
  periodEnd: string;
  avgRelevance: number;
  topArticles: NewsArticle[];
  sentimentTrend: {
    shortTerm: number;
    mediumTerm: number;
    longTerm: number;
  };
  topicBreakdown: Record<string, {
    count: number;
    avgSentiment: number;
  }>;
  sourceBreakdown: Record<string, {
    count: number;
    avgSentiment: number;
    reliability: number;
  }>;
}

export interface SentimentConfig {
  lookbackDays: number;
  minArticles: number;
  sources: string[];
}

const DEFAULT_CONFIG: SentimentConfig = {
  lookbackDays: 7,
  minArticles: 1,
  sources: ['moneycontrol', 'economictimes', 'livemint', 'business-standard', 'reuters'],
};

export class NewsSentimentAggregator {
  private articles: NewsArticle[] = [];
  private config: SentimentConfig;

  constructor(config: Partial<SentimentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  addArticle(article: Omit<NewsArticle, 'id'>): NewsArticle {
    const full: NewsArticle = {
      ...article,
      id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    this.articles.push(full);
    return full;
  }

  getSentimentSummary(symbol: string): NewsSentimentSummary {
    const relevant = this.articles.filter(a => {
      const now = Date.now();
      const cutoff = now - this.config.lookbackDays * 86400000;
      return a.symbol === symbol && new Date(a.publishedAt).getTime() >= cutoff;
    });

    if (relevant.length === 0) {
      return this.emptySummary(symbol);
    }

    const overallSentiment = relevant.reduce((s, a) => s + a.sentiment * a.relevance, 0)
      / relevant.reduce((s, a) => s + a.relevance, 0);

    const sentimentLabel = overallSentiment > 0.5 ? 'very_positive'
      : overallSentiment > 0.15 ? 'positive'
        : overallSentiment < -0.5 ? 'very_negative'
          : overallSentiment < -0.15 ? 'negative' : 'neutral';

    const avgRelevance = relevant.reduce((s, a) => s + a.relevance, 0) / relevant.length;

    const sortedByDate = [...relevant].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    const now = Date.now();
    const shortTerm = this.avgSentimentInWindow(relevant, now - 1 * 86400000);
    const mediumTerm = this.avgSentimentInWindow(relevant, now - 3 * 86400000);
    const longTerm = this.avgSentimentInWindow(relevant, now - this.config.lookbackDays * 86400000);

    const topicBreakdown: Record<string, { count: number; avgSentiment: number }> = {};
    for (const article of relevant) {
      for (const topic of article.topics) {
        if (!topicBreakdown[topic]) topicBreakdown[topic] = { count: 0, avgSentiment: 0 };
        topicBreakdown[topic].count++;
        topicBreakdown[topic].avgSentiment += article.sentiment;
      }
    }
    for (const topic of Object.keys(topicBreakdown)) {
      topicBreakdown[topic].avgSentiment /= topicBreakdown[topic].count;
    }

    const sourceBreakdown: Record<string, { count: number; avgSentiment: number; reliability: number }> = {};
    for (const article of relevant) {
      if (!sourceBreakdown[article.source]) {
        sourceBreakdown[article.source] = { count: 0, avgSentiment: 0, reliability: 0.7 };
      }
      sourceBreakdown[article.source].count++;
      sourceBreakdown[article.source].avgSentiment += article.sentiment;
    }
    for (const source of Object.keys(sourceBreakdown)) {
      sourceBreakdown[source].avgSentiment /= sourceBreakdown[source].count;
    }

    const dates = relevant.map(a => new Date(a.publishedAt).getTime());
    const periodStart = new Date(Math.min(...dates)).toISOString();
    const periodEnd = new Date(Math.max(...dates)).toISOString();

    return {
      symbol,
      overallSentiment,
      sentimentLabel,
      articleCount: relevant.length,
      periodStart,
      periodEnd,
      avgRelevance,
      topArticles: sortedByDate.slice(0, 5),
      sentimentTrend: { shortTerm, mediumTerm, longTerm },
      topicBreakdown,
      sourceBreakdown,
    };
  }

  getMarketSentiment(symbols: string[]): Map<string, NewsSentimentSummary> {
    const results = new Map<string, NewsSentimentSummary>();
    for (const symbol of symbols) {
      results.set(symbol, this.getSentimentSummary(symbol));
    }
    return results;
  }

  private avgSentimentInWindow(articles: NewsArticle[], windowStart: number): number {
    const inWindow = articles.filter(a => new Date(a.publishedAt).getTime() >= windowStart);
    if (inWindow.length === 0) return 0;
    return inWindow.reduce((s, a) => s + a.sentiment, 0) / inWindow.length;
  }

  private emptySummary(symbol: string): NewsSentimentSummary {
    return {
      symbol,
      overallSentiment: 0,
      sentimentLabel: 'neutral',
      articleCount: 0,
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      avgRelevance: 0,
      topArticles: [],
      sentimentTrend: { shortTerm: 0, mediumTerm: 0, longTerm: 0 },
      topicBreakdown: {},
      sourceBreakdown: {},
    };
  }

  clear(symbol?: string): void {
    if (symbol) {
      this.articles = this.articles.filter(a => a.symbol !== symbol);
    } else {
      this.articles = [];
    }
  }
}

export const newsSentimentAggregator = new NewsSentimentAggregator();
