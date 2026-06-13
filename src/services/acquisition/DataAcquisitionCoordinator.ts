import { YahooProvider } from "../providers/YahooProvider";
import { IndianMarketProvider } from "../providers/IndianMarketProvider";
import { FinnhubProvider } from "../providers/FinnhubProvider";
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
const finnhub: MetadataProvider & FinancialProvider & NewsProvider = new FinnhubProvider();
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

  /** Fetch quote using provider priority: Yahoo then IndianMarket */
  static async fetchQuote(symbol: string): Promise<StockQuote> {
    return this.runWithIngestionContext(() => this.fetchQuoteWithinRun(symbol));
  }

  private static async fetchQuoteWithinRun(symbol: string): Promise<StockQuote> {
    const providers: PriceProvider[] = [yahoo, indian];
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

  /** Fetch metadata using priority: Yahoo -> Finnhub */
  static async fetchMetadata(symbol: string): Promise<CompanyMetadata> {
    return this.runWithIngestionContext(() => this.fetchMetadataWithinRun(symbol));
  }

  private static async fetchMetadataWithinRun(symbol: string): Promise<CompanyMetadata> {
    const providers: MetadataProvider[] = [yahoo, finnhub];
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

  /** Fetch financial statements using priority: Finnhub -> Yahoo */
  static async fetchFinancials(symbol: string): Promise<FinancialSnapshot> {
    return this.runWithIngestionContext(() => this.fetchFinancialsWithinRun(symbol));
  }

  private static async fetchFinancialsWithinRun(symbol: string): Promise<FinancialSnapshot> {
    const providers: FinancialProvider[] = [finnhub];
    for (const p of providers) {
      try {
        const fin = await p.getFinancials(symbol);
        // FinancialData is Record<string, unknown>, cast only at boundary
        const result = fin as unknown as FinancialSnapshot | undefined;
        if (result && result.symbol) return result;
      } catch (e) {
        // continue to next provider
      }
    }
    throw new Error(`Financials not available for ${symbol}`);
  }

  /** Fetch news using priority: Finnhub -> GNews */
  static async fetchNews(symbol: string): Promise<NewsItem[]> {
    return this.runWithIngestionContext(() => this.fetchNewsWithinRun(symbol));
  }

  private static async fetchNewsWithinRun(symbol: string): Promise<NewsItem[]> {
    const providers: NewsProvider[] = [finnhub, gnews];
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
