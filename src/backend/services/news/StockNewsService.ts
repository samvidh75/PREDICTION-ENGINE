export interface StockNewsItem {
  id: string;
  symbol: string;
  headline: string;
  publisher?: string;
  publishedAt: string;
  summary?: string;
  whyItMatters?: string;
  url?: string;
  category?: "company" | "results" | "brokerage" | "sector" | "corporate_action" | "market";
}

interface CacheEntry {
  items: StockNewsItem[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const cache = new Map<string, CacheEntry>();

export class StockNewsService {
  async getNews(symbol: string): Promise<{ items: StockNewsItem[]; refreshedAt: string }> {
    const normalized = symbol.toUpperCase().trim();
    const cached = cache.get(normalized);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      return { items: cached.items, refreshedAt: new Date(cached.fetchedAt).toISOString() };
    }
    const items = await this.fetchNews(normalized);
    cache.set(normalized, { items, fetchedAt: now });
    return { items, refreshedAt: new Date(now).toISOString() };
  }

  private async fetchNews(_symbol: string): Promise<StockNewsItem[]> {
    return [];
  }

  clearCache(): void {
    cache.clear();
  }
}

export const stockNewsService = new StockNewsService();
