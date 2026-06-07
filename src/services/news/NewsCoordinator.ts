// src/services/news/NewsCoordinator.ts

export type ImpactType = "Positive" | "Neutral" | "Negative" | "Important";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  impact: ImpactType;
  sector: string;
  symbol?: string;
  timestamp: string;
}

export class NewsCoordinator {
  private static liveNewsCache: NewsArticle[] = [];
  private static liveNewsAt = 0;
  private static liveNewsRefreshPromise: Promise<void> | null = null;
  private static readonly LIVE_NEWS_TTL_MS = 10 * 60 * 1000;
  private static readonly LIVE_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "HAL", "ICICIBANK", "LT", "BAJFINANCE", "ITC", "HINDUNILVR"];

  public static getTopNews(symbol?: string, sector?: string): NewsArticle[] {
    let list = this.getLiveNews();
    list = this.dedupe(list);

    if (symbol) {
      list.sort((a, b) => {
        if (a.symbol === symbol && b.symbol !== symbol) return -1;
        if (a.symbol !== symbol && b.symbol === symbol) return 1;
        return 0;
      });
    }

    if (sector) {
      list.sort((a, b) => {
        if (a.sector.toLowerCase() === sector.toLowerCase() && b.sector.toLowerCase() !== sector.toLowerCase()) return -1;
        if (a.sector.toLowerCase() !== sector.toLowerCase() && b.sector.toLowerCase() === sector.toLowerCase()) return 1;
        return 0;
      });
    }

    void this.refreshLiveNews();

    if (list.length === 0) return [];
    return list.slice(0, 10);
  }

  private static getLiveNews(): NewsArticle[] {
    const age = Date.now() - this.liveNewsAt;
    if (this.liveNewsCache.length === 0 || age > this.LIVE_NEWS_TTL_MS) {
      void this.refreshLiveNews();
    }

    return [...this.liveNewsCache];
  }

  private static async refreshLiveNews(): Promise<void> {
    if (this.liveNewsRefreshPromise) return this.liveNewsRefreshPromise;

    this.liveNewsRefreshPromise = (async () => {
      try {
        const { MarketDataGateway } = await import("../data/MarketDataGateway");
        const settled = await Promise.allSettled(this.LIVE_SYMBOLS.map((symbol) => MarketDataGateway.getNews(symbol)));

        const liveArticles = settled.flatMap((entry, idx) => {
          if (entry.status !== "fulfilled") return [];
          const symbol = this.LIVE_SYMBOLS[idx] ?? "MARKET";
          const sector = this.sectorForSymbol(symbol);

          return entry.value.slice(0, 3).map((item, itemIdx) => ({
            id: `live_${symbol}_${idx}_${itemIdx}`,
            title: item.title,
            summary: item.summary || item.source || "Live market news item",
            impact: this.impactForTitle(item.title),
            sector,
            symbol,
            timestamp: this.formatTimestamp(item.datetime),
          }));
        });

        if (liveArticles.length > 0) {
          this.liveNewsCache = this.dedupe(liveArticles).slice(0, 20);
          this.liveNewsAt = Date.now();
        }
      } catch {
        // Keep last successful cache. If nothing cached, news is genuinely unavailable.
      } finally {
        this.liveNewsRefreshPromise = null;
      }
    })();

    return this.liveNewsRefreshPromise;
  }

  private static dedupe(items: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.title}::${item.summary}::${item.symbol ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private static sectorForSymbol(symbol: string): string {
    const map: Record<string, string> = {
      RELIANCE: "Energy",
      TCS: "IT",
      HDFCBANK: "Banking",
      INFY: "IT",
      HAL: "Defence",
      ICICIBANK: "Banking",
      LT: "Infrastructure",
      BAJFINANCE: "Banking",
      ITC: "FMCG",
      HINDUNILVR: "FMCG",
    };
    return map[symbol.toUpperCase()] ?? "Market";
  }

  private static impactForTitle(title: string): ImpactType {
    const t = title.toLowerCase();
    if (/(beats|growth|wins|expands|strong|record|surge|profit|healthy)/i.test(t)) return "Positive";
    if (/(falls|drops|slows|pressure|headwind|loss|risk|warning|weak)/i.test(t)) return "Negative";
    if (/(stable|steady|holds|balanced|flat|mixed)/i.test(t)) return "Neutral";
    return "Important";
  }

  private static formatTimestamp(datetime: string): string {
    const ts = new Date(datetime).getTime();
    if (!Number.isFinite(ts)) return "recent";

    const diffMs = Date.now() - ts;
    const diffHours = Math.max(0, Math.round(diffMs / (60 * 60 * 1000)));

    if (diffHours < 1) return "just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.round(diffHours / 24);
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
}

export default NewsCoordinator;
