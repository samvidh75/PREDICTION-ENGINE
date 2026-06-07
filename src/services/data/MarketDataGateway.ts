// src/services/data/MarketDataGateway.ts
import { StockQuote, CompanyMetadata, HistoricalPoint } from './types';
import { DataCache } from './cache/DataCache';
import { ProviderCoordinator } from '../providers/ProviderCoordinator';
import { MetadataProviderCoordinator, EnrichedMetadata } from '../providers/MetadataProviderCoordinator';
import { NewsItem } from '../providers/NewsProvider';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export class MarketDataGateway {
  private static coordinator = new ProviderCoordinator();

  public static async getQuote(symbol: string): Promise<StockQuote> {
    const key = `quote_${symbol.toUpperCase()}`;
    const cached = DataCache.get<StockQuote>(key);
    if (cached) return cached;

    const data = await this.coordinator.getQuote(symbol);
    DataCache.set(key, data, DEFAULT_TTL);
    return data as StockQuote;
  }

  /**
   * Retrieve enriched, validated company metadata.
   * Uses MetadataProviderCoordinator which applies:
   *   Provider chain → Validation → Registry enrichment → Integrity normalisation
   */
  public static async getCompany(symbol: string): Promise<EnrichedMetadata> {
    const key = `metadata_enriched_${symbol.toUpperCase()}`;
    const cached = DataCache.get<EnrichedMetadata>(key);
    if (cached) return cached;

    const data = await MetadataProviderCoordinator.getMetadata(symbol);
    DataCache.set(key, data, DEFAULT_TTL);
    return data;
  }

  /**
   * Retrieve raw company metadata from provider chain (backward compat).
   * Prefer getCompany() for enriched data.
   */
  public static async getCompanyRaw(symbol: string): Promise<CompanyMetadata> {
    const key = `metadata_raw_${symbol.toUpperCase()}`;
    const cached = DataCache.get<CompanyMetadata>(key);
    if (cached) return cached;

    const data = await this.coordinator.getMetadata(symbol);
    DataCache.set(key, data, DEFAULT_TTL);
    return data as CompanyMetadata;
  }

  public static async getHistory(symbol: string): Promise<HistoricalPoint[]> {
    const key = `history_${symbol.toUpperCase()}`;
    const cached = DataCache.get<HistoricalPoint[]>(key);
    if (cached) return cached;

    const data = await this.coordinator.getHistory(symbol);
    DataCache.set(key, data, DEFAULT_TTL);
    return data as HistoricalPoint[];
  }

  public static async getNews(symbol: string): Promise<NewsItem[]> {
    const key = `news_${symbol.toUpperCase()}`;
    const cached = DataCache.get<NewsItem[]>(key);
    if (cached) return cached;

    const data = await this.coordinator.getNews(symbol);
    DataCache.set(key, data, DEFAULT_TTL);
    return data as NewsItem[];
  }
}
