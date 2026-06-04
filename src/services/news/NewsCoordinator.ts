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

const MOCK_NEWS: NewsArticle[] = [
  { id: "1", title: "Defence Production Allocations Exceed Budget Targets", summary: "Ministry reports multi-year acceleration in local components output and production speeds.", impact: "Positive", sector: "Defence", timestamp: "1 hour ago" },
  { id: "2", title: "Banking Credit Growth Expands Steady 15% YoY", summary: "Financial institutions report steady capital utilization led by commercial infrastructure projects.", impact: "Positive", sector: "Banking", timestamp: "3 hours ago" },
  { id: "3", title: "IT Service Exports Stable Near Global Bounds", summary: "Firms report stable billing cycles with slight recovery in localized delivery volumes.", impact: "Neutral", sector: "IT", timestamp: "5 hours ago" },
  { id: "4", title: "Pharma API Clearances Align with International Inspections", summary: "Three manufacturing units clear regulatory safety audits, stabilizing long-term export channels.", impact: "Important", sector: "Pharma", timestamp: "6 hours ago" },
  { id: "5", title: "Auto Manufacturing Adjusts EV Transition Timelines", summary: "Producers sync supply logistics to match regional passenger consumption patterns.", impact: "Neutral", sector: "Auto", timestamp: "8 hours ago" },
  { id: "6", title: "National Railway Modernization Targets Steady Execution", summary: "Infrastructure modernization budgets fuel accelerated capital equipment orders.", impact: "Positive", sector: "Railways", timestamp: "12 hours ago" },
  { id: "7", title: "Metals Global Demand Faces Short-term Pricing Headwinds", summary: "Inventory builds across production hubs suggest near-term pricing adjustments.", impact: "Negative", sector: "Metals", timestamp: "18 hours ago" },
  { id: "8", title: "FMCG Rural Markets Volume Growth Consolidates Safely", summary: "FMCG players defend pricing margins as rural volume expansion remains stable.", impact: "Important", sector: "FMCG", timestamp: "1 day ago" },
  { id: "9", title: "Green Energy Transition Gains Direct Structural Incentives", summary: "Policy updates offer direct support for grid integrations and transmission assets.", impact: "Positive", sector: "Energy", timestamp: "1 day ago" },
  { id: "10", title: "Telecom Tariffs Firm Up, Enhancing ARPU Outlook", summary: "Carriers stabilize operational revenues as average data utilization continues expanding.", impact: "Important", sector: "Telecom", timestamp: "2 days ago" },
];

export class NewsCoordinator {
  private static liveNewsCache: NewsArticle[] = [];
  private static liveNewsAt = 0;
  private static liveNewsRefreshPromise: Promise<void> | null = null;
  private static readonly LIVE_NEWS_TTL_MS = 10 * 60 * 1000;
  private static readonly LIVE_SYMBOLS = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "HAL"];

  public static getTopNews(symbol?: string, sector?: string): NewsArticle[] {
    let list = [...this.getLiveNews(), ...MOCK_NEWS];
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
          this.liveNewsCache = this.dedupe([...liveArticles, ...MOCK_NEWS]).slice(0, 20);
          this.liveNewsAt = Date.now();
        }
      } catch {
        // Keep last successful cache or fall back to mock feed.
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
