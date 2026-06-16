import { YahooProvider } from "../providers/YahooProvider";
import { IndianMarketProvider } from "../providers/IndianMarketProvider";
import { GoogleNewsRssProvider } from "../providers/GoogleNewsRssProvider";
import type { PriceProvider } from "../providers/PriceProvider";
import type { MetadataProvider } from "../providers/MetadataProvider";
import type { HistoricalProvider } from "../providers/HistoricalProvider";
import type { FinancialProvider } from "../providers/FinancialProvider";
import type { NewsProvider, NewsItem } from "../providers/NewsProvider";
import type {
  StockQuote,
  CompanyMetadata,
  FinancialSnapshot,
} from "../data/types";
import {
  createIngestionRunId,
  getCurrentIngestionRunContext,
  runWithIngestionRunContext,
  type IngestionRunContext,
} from "./IngestionRunContext";

const yahoo: PriceProvider & MetadataProvider & HistoricalProvider & FinancialProvider = new YahooProvider();
const indian: PriceProvider & MetadataProvider & HistoricalProvider = new IndianMarketProvider();
const gnews: NewsProvider = new GoogleNewsRssProvider();

export class DataAcquisitionCoordinator {
  static async runWithIngestionContext<T>(
    work: () => Promise<T>,
    context: Partial<IngestionRunContext> = {},
  ): Promise<T> {
    if (getCurrentIngestionRunContext()) return work();

    return runWithIngestionRunContext({
      runId: context.runId ?? createIngestionRunId("data-acquisition"),
      source: context.source ?? "DataAcquisitionCoordinator",
    }, work);
  }

  /** Fetch quote using provider priority: IndianAPI then Yahoo */
  static async fetchQuote(symbol: string): Promise<StockQuote> {
    return this.runWithIngestionContext(() => this.fetchQuoteWithinRun(symbol));
  }

  private static async fetchQuoteWithinRun(symbol: string): Promise<StockQuote> {
    const providers: PriceProvider[] = [indian, yahoo];
    for (const p of providers) {
      try {
        const quote = await p.getQuote(symbol);
        if (quote && quote.price !== undefined) return quote;
      } catch (e) {
        // continue to next provider
      }
    }
    throw new Error(`Quote not available for ${symbol}`);
  }

  /** Fetch metadata using priority: IndianAPI -> Yahoo */
  static async fetchMetadata(symbol: string): Promise<CompanyMetadata> {
    return this.runWithIngestionContext(() => this.fetchMetadataWithinRun(symbol));
  }

  private static async fetchMetadataWithinRun(symbol: string): Promise<CompanyMetadata> {
    const providers: MetadataProvider[] = [indian, yahoo];
    for (const p of providers) {
      try {
        const meta = await p.getMetadata(symbol);
        if (meta && meta.companyName) return meta;
      } catch (e) {
        // continue to next provider
      }
    }
    throw new Error(`Metadata not available for ${symbol}`);
  }

  /** Fetch financial statements using priority: IndianAPI -> Yahoo */
  static async fetchFinancials(symbol: string): Promise<FinancialSnapshot> {
    return this.runWithIngestionContext(() => this.fetchFinancialsWithinRun(symbol));
  }

  private static async fetchFinancialsWithinRun(symbol: string): Promise<FinancialSnapshot> {
    throw new Error(`Financials not available for ${symbol} — no financial provider configured`);
  }

  /** Fetch news using priority: GNews */
  static async fetchNews(symbol: string): Promise<NewsItem[]> {
    return this.runWithIngestionContext(() => this.fetchNewsWithinRun(symbol));
  }

  private static async fetchNewsWithinRun(symbol: string): Promise<NewsItem[]> {
    const providers: NewsProvider[] = [gnews];
    for (const p of providers) {
      try {
        const news = await p.getNews(symbol);
        if (Array.isArray(news) && news.length) return news;
      } catch (e) {
        // continue to next provider
      }
    }
    return [];
  }
}
