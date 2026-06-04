import { YahooProvider } from "../providers/YahooProvider";
import { IndianMarketProvider } from "../providers/IndianMarketProvider";
import { AlphaVantageProvider } from "../providers/AlphaVantageProvider";
import { FinnhubProvider } from "../providers/FinnhubProvider";
import { GoogleNewsRssProvider } from "../providers/GoogleNewsRssProvider";
import type {
  StockQuote as Quote,
  CompanyMetadata as Metadata,
  FinancialSnapshot as FinancialStatement,
  NewsItem as NewsArticle,
} from "../providers/ProviderInterfaces";

// Simple singleton providers – in a real system these would be instantiated with API keys.
const yahoo = new YahooProvider();
const indian = new IndianMarketProvider();
const alpha = new AlphaVantageProvider();
const finnhub = new FinnhubProvider();
const gnews = new GoogleNewsRssProvider();


export class DataAcquisitionCoordinator {
  /** Fetch quote using provider priority: Yahoo → Indian → AlphaVantage */
  static async fetchQuote(symbol: string): Promise<Quote> {
    const providers = [yahoo, indian, alpha];
    for (const p of providers) {
      try {
        // each provider implements getQuote
        // @ts-ignore – stub methods exist on each class
        const quote = await p.getQuote(symbol);
        if (quote && quote.price !== undefined) return quote;
      } catch (e) {
        // continue to next provider
      }
    }
    throw new Error(`Quote not available for ${symbol}`);
  }

  /** Fetch metadata using priority: Yahoo → Finnhub */
  static async fetchMetadata(symbol: string): Promise<Metadata> {
    const providers = [yahoo, finnhub];
    for (const p of providers) {
      try {
        // @ts-ignore – both have getMetadata
        const meta = await p.getMetadata(symbol);
        if (meta && meta.companyName) return meta;
      } catch (e) {}
    }
    throw new Error(`Metadata not available for ${symbol}`);
  }

  /** Fetch financial statements using priority: Finnhub → Yahoo */
  static async fetchFinancials(symbol: string): Promise<FinancialStatement> {
    const providers = [finnhub]; // Yahoo stub does not implement financials yet
    for (const p of providers) {
      try {
        // @ts-ignore – finnhub implements getFinancials
        const fin = await p.getFinancials(symbol);
        if (fin && fin.periodEnd) return fin;
      } catch (e) {}
    }
    throw new Error(`Financials not available for ${symbol}`);
  }

  /** Fetch news using priority: Finnhub → GNews */
  static async fetchNews(symbol: string): Promise<NewsArticle[]> {
    const providers = [finnhub, gnews];
    for (const p of providers) {
      try {
        // @ts-ignore – both have getNews
        const news = await p.getNews(symbol);
        if (Array.isArray(news) && news.length) return news;
      } catch (e) {}
    }
    // Return empty array if no news found – not fatal for backfill.
    return [];
  }
}
