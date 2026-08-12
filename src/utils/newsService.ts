/**
 * Real-time News Service
 * Fetches market news and sentiment for PSX stocks
 * - News from multiple sources
 * - Sentiment analysis (positive/negative/neutral)
 * - Ticker-specific filtering
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  timestamp: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  tickers: string[];
  imageUrl?: string;
}

export interface NewsContext {
  ticker: string;
  recentNews: NewsArticle[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 to +1,
  newsCount: number;
  lastUpdate: number;
}

const SENTIMENT_KEYWORDS = {
  positive: [
    'surge', 'jump', 'rally', 'gain', 'rise', 'bullish', 'profit', 'growth',
    'strong', 'excellent', 'opportunity', 'beat', 'upgrade', 'outperform',
    'boom', 'recovery', 'expansion', 'success', 'rally', 'positive'
  ],
  negative: [
    'fall', 'drop', 'crash', 'loss', 'bearish', 'weakness', 'decline',
    'down', 'risk', 'downgrade', 'underperform', 'concern', 'warning',
    'uncertainty', 'pressure', 'slump', 'negative', 'cautious'
  ]
};

class NewsService {
  private newsCache = new Map<string, { articles: NewsArticle[]; timestamp: number }>();
  private cacheTTL = 300000; // 5 minutes

  /**
   * Analyze sentiment from text
   */
  private analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    SENTIMENT_KEYWORDS.positive.forEach((keyword) => {
      if (lowerText.includes(keyword)) positiveScore++;
    });

    SENTIMENT_KEYWORDS.negative.forEach((keyword) => {
      if (lowerText.includes(keyword)) negativeScore++;
    });

    const netScore = positiveScore - negativeScore;
    const normalizedScore = netScore / Math.max(1, positiveScore + negativeScore);

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (netScore > 0) sentiment = 'positive';
    if (netScore < 0) sentiment = 'negative';

    return { sentiment, score: normalizedScore };
  }


  /**
   * Mock news fetch (in production, use real API)
   */
  private async fetchNewsFromAPI(ticker: string): Promise<NewsArticle[]> {
    // Placeholder: In production, integrate with:
    // - NewsAPI.org (free tier: 100 requests/day)
    // - India's Economic Times API
    // - Moneycontrol RSS feeds
    // - Reuters, Bloomberg APIs

    const mockNews: Record<string, NewsArticle[]> = {
      TEL: [
        {
          id: 'tel-1',
          title: 'PLDT Q2 profit beats estimates, up 5%',
          description: 'PLDT reported strong Q2 earnings, exceeding analyst expectations.',
          source: 'Philippine Star',
          url: '#',
          timestamp: Date.now() - 3600000,
          sentiment: 'positive',
          tickers: ['TEL'],
        },
        {
          id: 'tel-2',
          title: 'Telecom sector gains on data demand surge',
          description: 'Rising data consumption drives revenues for Philippine telcos.',
          source: 'BusinessWorld',
          url: '#',
          timestamp: Date.now() - 7200000,
          sentiment: 'positive',
          tickers: ['TEL', 'GLO'],
        },
      ],
      BDO: [
        {
          id: 'bdo-1',
          title: 'BDO Unibank Q3 profit climbs on loan growth',
          description: 'BDO reports higher net income driven by expanding loan portfolio.',
          source: 'Philippine Daily Inquirer',
          url: '#',
          timestamp: Date.now() - 1800000,
          sentiment: 'positive',
          tickers: ['BDO'],
        },
      ],
      BPI: [
        {
          id: 'bpi-1',
          title: 'BSP holds rates steady, BPI gains on improved outlook',
          description: 'Banking sector benefits from stable monetary policy.',
          source: 'BusinessWorld',
          url: '#',
          timestamp: Date.now() - 5400000,
          sentiment: 'positive',
          tickers: ['BPI', 'MBT', 'PNB'],
        },
      ],
    };

    return mockNews[ticker] || [];
  }

  /**
   * Get news for a ticker
   */
  async getNewsForTicker(ticker: string): Promise<NewsContext> {
    // Check cache
    const cached = this.newsCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return this.buildNewsContext(ticker, cached.articles);
    }

    try {
      // Fetch fresh news
      const articles = await this.fetchNewsFromAPI(ticker);

      // Analyze sentiment for each article
      const enrichedArticles = articles.map((article) => {
        const titleSentiment = this.analyzeSentiment(article.title + ' ' + article.description);
        return {
          ...article,
          sentiment: titleSentiment.sentiment,
        };
      });

      // Cache results
      this.newsCache.set(ticker, {
        articles: enrichedArticles,
        timestamp: Date.now(),
      });

      return this.buildNewsContext(ticker, enrichedArticles);
    } catch (error) {
      console.warn(`Failed to fetch news for ${ticker}:`, error);
      return {
        ticker,
        recentNews: [],
        sentiment: 'neutral',
        sentimentScore: 0,
        newsCount: 0,
        lastUpdate: Date.now(),
      };
    }
  }

  /**
   * Build news context for AI
   */
  private buildNewsContext(ticker: string, articles: NewsArticle[]): NewsContext {
    if (articles.length === 0) {
      return {
        ticker,
        recentNews: [],
        sentiment: 'neutral',
        sentimentScore: 0,
        newsCount: 0,
        lastUpdate: Date.now(),
      };
    }

    // Calculate overall sentiment
    const sentimentScores = articles.map((a) => (a.sentiment === 'positive' ? 1 : a.sentiment === 'negative' ? -1 : 0));
    const avgSentiment = sentimentScores.reduce((a: number, b: number) => a + b, 0) / articles.length;

    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgSentiment > 0.2) sentiment = 'bullish';
    if (avgSentiment < -0.2) sentiment = 'bearish';

    return {
      ticker,
      recentNews: articles.slice(0, 5), // Top 5 most recent
      sentiment,
      sentimentScore: avgSentiment,
      newsCount: articles.length,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Get news for multiple tickers (portfolio)
   */
  async getPortfolioNews(tickers: string[]): Promise<NewsContext[]> {
    const newsContexts = await Promise.all(tickers.map((ticker) => this.getNewsForTicker(ticker)));
    return newsContexts;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.newsCache.clear();
  }
}

export const newsService = new NewsService();
