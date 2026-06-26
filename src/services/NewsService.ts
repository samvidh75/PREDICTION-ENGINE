import { cacheService } from './CacheService';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
}

export class NewsService {
  async getNews(symbol: string, limit = 10): Promise<NewsItem[]> {
    const cacheKey = `news:${symbol}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return JSON.parse(cached).slice(0, limit);

    try {
      const url = `https://news.google.com/rss/search?q=${symbol}+stock+OR+${symbol}+NSE&hl=en-IN&gl=IN`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = await res.text();
      const items = this.parseRss(text);
      await cacheService.set(cacheKey, JSON.stringify(items), 30 * 60 * 1000);
      return items.slice(0, limit);
    } catch {
      return [];
    }
  }

  private parseRss(xml: string): NewsItem[] {
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1];
      const title = content.match(/<title>(.*?)<\/title>/)?.[1]?.trim() || '';
      const link = content.match(/<link>(.*?)<\/link>/)?.[1]?.trim() || '';
      const source = content.match(/<source[^>]*>(.*?)<\/source>/)?.[1]?.trim() || '';
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() || '';
      const summary = content.match(/<description>(.*?)<\/description>/)?.[1]?.trim()?.replace(/<[^>]*>/g, '') || '';
      if (title) items.push({ title, link, source, publishedAt: pubDate, summary });
    }
    return items;
  }
}

export const newsService = new NewsService();
