/**
 * News Service with Auto-Sync
 * - Fetches real news every 2 hours
 * - NewsAPI + Financial data sources
 * - Sponsored content + monetization
 */

import { cacheManager, CACHE_KEYS, CACHE_TTL } from '../cache/CacheStrategy';

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || 'demo';

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: number;
  imageUrl?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  isSponsored?: boolean;
  affiliateLink?: string;
}


class NewsService {
  private updateInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private retryCount: Record<string, number> = {};
  private maxRetries = 3;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Start auto-sync: every 2 hours
    this.startAutoSync();

    // Fetch news immediately on init
    await this.refreshAllNews();
  }

  private startAutoSync(): void {
    // 2 hour interval = 7200000ms
    this.updateInterval = setInterval(() => {
      this.refreshAllNews().catch(console.error);
    }, 2 * 60 * 60 * 1000);

    console.log('[News Service] Auto-sync started: refreshing every 2 hours');
  }

  async refreshAllNews(): Promise<void> {
    console.log('[News Service] Syncing news from all sources...');

    const stocks = ['HDFCBANK', 'INFY', 'TCS', 'RELIANCE', 'MARUTI', 'BAJAJ', 'GRANULES', 'CHENNPETRO'];

    for (const symbol of stocks) {
      try {
        await this.fetchNewsForStock(symbol);
      } catch (error) {
        console.error(`[News Service] Error fetching news for ${symbol}:`, error);
      }
    }

    console.log('[News Service] News sync complete');
  }

  async fetchNewsForStock(symbol: string): Promise<NewsItem[]> {
    // Try cache first (2 hour TTL)
    const cacheKey = CACHE_KEYS.NEWS(symbol);
    const cached = await cacheManager.get<NewsItem[]>(cacheKey);
    if (cached) return cached;

    // Fetch from multiple sources with retry logic
    let news: NewsItem[] = [];
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        news = await this.aggregateNews(symbol);
        this.retryCount[symbol] = 0; // Reset on success
        break;
      } catch (error) {
        attempt++;
        this.retryCount[symbol] = attempt;
        console.warn(`[News Service] Fetch attempt ${attempt}/${this.maxRetries} failed for ${symbol}:`, error);

        if (attempt < this.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    // Cache for 2 hours even if empty (to avoid constant retries)
    await cacheManager.set(cacheKey, news, CACHE_TTL.NEWS);

    return news;
  }

  private async aggregateNews(symbol: string): Promise<NewsItem[]> {
    const news: NewsItem[] = [];

    // Get real news from NewsAPI
    try {
      const realNews = await this.fetchRealNews(symbol);
      news.push(...realNews);
    } catch (error) {
      console.error(`[News Service] Error fetching real news for ${symbol}:`, error);
    }

    // Add sponsored content (monetization)
    const sponsored = this.getSponsored(symbol);
    news.push(...sponsored);

    // Sort by date (newest first)
    return news.sort((a, b) => b.publishedAt - a.publishedAt);
  }

  private async fetchRealNews(symbol: string): Promise<NewsItem[]> {
    const news: NewsItem[] = [];

    // Fetch from NewsAPI
    try {
      const newsApiNews = await this.fetchFromNewsAPI(symbol);
      news.push(...newsApiNews);
    } catch (error) {
      console.error(`[News Service] NewsAPI error:`, error);
    }

    // Fetch from financial RSS feeds (Moneycontrol, ET, etc)
    try {
      const rssNews = await this.fetchFromRSSFeeds();
      news.push(...rssNews);
    } catch (error) {
      console.error(`[News Service] RSS fetch error:`, error);
    }

    return news;
  }

  private async fetchFromNewsAPI(symbol: string): Promise<NewsItem[]> {
    if (NEWS_API_KEY === 'demo') {
      console.warn('[News Service] NewsAPI key not configured. Set VITE_NEWS_API_KEY in .env');
      return [];
    }

    try {
      const query = `${symbol} stock market India`;
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${NEWS_API_KEY}`
      );

      if (!response.ok) throw new Error(`NewsAPI error: ${response.status}`);

      const data = await response.json();

      return (data.articles || []).map((article: any, i: number) => ({
        id: `newsapi-${symbol}-${i}`,
        title: article.title,
        description: article.description || article.content?.substring(0, 150) || '',
        source: article.source?.name || 'NewsAPI',
        url: article.url,
        publishedAt: new Date(article.publishedAt).getTime(),
        imageUrl: article.urlToImage,
        sentiment: this.detectSentiment(article.title + ' ' + (article.description || '')) as 'positive' | 'neutral' | 'negative',
      }));
    } catch (error) {
      console.error('[News Service] NewsAPI fetch failed:', error);
      return [];
    }
  }

  private async fetchFromRSSFeeds(): Promise<NewsItem[]> {
    // Moneycontrol, Economic Times, Business Today RSS feeds
    const rssFeeds = [
      { name: 'MoneyControl', url: `https://www.moneycontrol.com/rss/business.xml` },
      { name: 'Economic Times', url: `https://feeds.economictimes.indiatimes.com/markets` },
      { name: 'Business Today', url: `https://feeds.business-standard.bsgroup.in/` },
    ];

    const news: NewsItem[] = [];

    for (const feed of rssFeeds) {
      try {
        // Note: RSS requires CORS proxy or backend endpoint
        // For now, this is a placeholder for RSS integration
        console.log(`[News Service] RSS feed (${feed.name}) integration ready - requires backend proxy`);
      } catch (error) {
        console.error(`[News Service] RSS feed error (${feed.name}):`, error);
      }
    }

    return news;
  }

  private detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['rise', 'surge', 'gain', 'jump', 'rally', 'strong', 'upgrade', 'beat', 'outperform', 'bull', 'positive'];
    const negativeWords = ['fall', 'drop', 'decline', 'crash', 'lose', 'weak', 'downgrade', 'miss', 'underperform', 'bear', 'negative'];

    const lower = text.toLowerCase();
    const posCount = positiveWords.filter(word => lower.includes(word)).length;
    const negCount = negativeWords.filter(word => lower.includes(word)).length;

    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }

  private getSponsored(symbol: string): NewsItem[] {
    // Mix ads with news naturally (like TradingView, MutualFunds apps do)
    const sponsored: NewsItem[] = [
      {
        id: `ad-${symbol}-1`,
        title: '💰 Open a Trading Account - Commission Free',
        description: 'Trade stocks with Zero brokerage. Instant account opening.',
        source: 'Upstox',
        url: 'https://upstox.com?ref=stockex',
        publishedAt: Date.now(),
        isSponsored: true,
        affiliateLink: 'https://upstox.com/affiliate',
      },
      {
        id: `ad-${symbol}-2`,
        title: '📱 Trade Smarter with Advanced Analytics',
        description: 'Access institutional-grade research on TradingView.',
        source: 'TradingView',
        url: 'https://tradingview.com?ref=stockex',
        publishedAt: Date.now() - 3600000,
        isSponsored: true,
        affiliateLink: 'https://tradingview.com/affiliate',
      },
    ];

    return sponsored;
  }

  async getNewsForStock(symbol: string): Promise<NewsItem[]> {
    return this.fetchNewsForStock(symbol);
  }

  async refreshNews(symbol: string): Promise<NewsItem[]> {
    // Force refresh by clearing cache
    const cacheKey = CACHE_KEYS.NEWS(symbol);
    const news = await this.aggregateNews(symbol);
    await cacheManager.set(cacheKey, news, CACHE_TTL.NEWS);
    return news;
  }

  getNextRefreshTime(): Date {
    const now = new Date();
    const nextRefresh = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return nextRefresh;
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isInitialized = false;
  }
}

export const newsService = new NewsService();
