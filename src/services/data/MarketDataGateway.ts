// src/services/data/MarketDataGateway.ts
import { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from './types';
import { DataCache } from './cache/DataCache';
import { ProviderCoordinator } from '../providers/ProviderCoordinator';
import { MetadataProviderCoordinator, EnrichedMetadata } from '../providers/MetadataProviderCoordinator';
import { NewsItem } from '../providers/NewsProvider';
import { EodDataCacheService } from '../marketData/EodDataCacheService';
import { MarketHours } from '../market/MarketHours';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes — in-memory TTL

export class MarketDataGateway {
  private static coordinator = new ProviderCoordinator();

  /**
   * Read a quote using the three-layer strategy:
   *   L1 — In-memory DataCache (fast, per-page-session)
   *   L2 — EodDataCacheService (persistent DB, shared across users)
   *   L3 — ProviderCoordinator fallback → backfill both caches
   *
   * Post-market freeze: After ~4 PM IST, quotes are served ONLY from cache.
   * No provider calls are made unless the cache is empty (cold start).
   */
  public static async getQuote(symbol: string): Promise<StockQuote> {
    const key = `quote_${symbol.toUpperCase()}`;

    // L1: In-memory (fastest)
    const cached = DataCache.get<StockQuote>(key);
    if (cached) return cached;

    // L2: DB cache (persistent across sessions)
    const dbCached = await EodDataCacheService.get<StockQuote>('quote', symbol);
    if (dbCached) {
      DataCache.set(key, dbCached, DEFAULT_TTL);
      return dbCached;
    }

    // Post-market freeze: after 4 PM IST, do NOT call providers for quotes.
    // The last cached values from market hours are served instead.
    // If cache is cold (first request after deploy), we fall through to provider.
    if (MarketHours.shouldFreezeQuotes()) {
      throw new Error(`Market closed: no cached quote for ${symbol}. Try again during market hours.`);
    }

    // L3: Provider chain (budgeted, coalesced)
    const data = await this.coordinator.getQuote(symbol);

    // Backfill both caches
    DataCache.set(key, data, DEFAULT_TTL);
    await EodDataCacheService.set('quote', symbol, data);

    return data as StockQuote;
  }

  /**
   * Retrieve enriched, validated company metadata.
   * Uses MetadataProviderCoordinator which applies:
   *   Provider chain → Validation → Registry enrichment → Integrity normalisation
   *
   * Cache strategy: L1 memory → L2 DB → provider
   */
  public static async getCompany(symbol: string): Promise<EnrichedMetadata> {
    const key = `metadata_enriched_${symbol.toUpperCase()}`;

    // L1: In-memory
    const cached = DataCache.get<EnrichedMetadata>(key);
    if (cached) return cached;

    // L2: DB cache
    const dbCached = await EodDataCacheService.get<EnrichedMetadata>('profile', symbol);
    if (dbCached) {
      DataCache.set(key, dbCached, DEFAULT_TTL);
      return dbCached;
    }

    // L3: Provider
    const data = await MetadataProviderCoordinator.getMetadata(symbol);

    // Backfill
    DataCache.set(key, data, DEFAULT_TTL);
    await EodDataCacheService.set('profile', symbol, data);

    return data;
  }

  /**
   * Retrieve raw company metadata from provider chain (backward compat).
   * Prefer getCompany() for enriched data.
   */
  public static async getCompanyRaw(symbol: string): Promise<CompanyMetadata> {
    const key = `metadata_raw_${symbol.toUpperCase()}`;

    // L1: In-memory
    const cached = DataCache.get<CompanyMetadata>(key);
    if (cached) return cached;

    // L2: DB cache
    const dbCached = await EodDataCacheService.get<CompanyMetadata>('profile', symbol);
    if (dbCached) {
      DataCache.set(key, dbCached, DEFAULT_TTL);
      return dbCached;
    }

    // L3: Provider
    const data = await this.coordinator.getMetadata(symbol);

    // Backfill
    DataCache.set(key, data, DEFAULT_TTL);
    await EodDataCacheService.set('profile', symbol, data);

    return data as CompanyMetadata;
  }

  /**
   * Historical prices — L1 memory → L2 DB → provider
   */
  public static async getHistory(symbol: string): Promise<HistoricalPoint[]> {
    const key = `history_${symbol.toUpperCase()}`;

    // L1: In-memory
    const cached = DataCache.get<HistoricalPoint[]>(key);
    if (cached) return cached;

    // L2: DB cache
    const dbCached = await EodDataCacheService.get<HistoricalPoint[]>('history', symbol);
    if (dbCached) {
      DataCache.set(key, dbCached, DEFAULT_TTL);
      return dbCached;
    }

    // L3: Provider
    const data = await this.coordinator.getHistory(symbol);

    // Backfill
    DataCache.set(key, data, DEFAULT_TTL);
    await EodDataCacheService.set('history', symbol, data);

    return data as HistoricalPoint[];
  }

  /**
   * News — L1 memory → L2 DB → provider
   */
  public static async getNews(symbol: string): Promise<NewsItem[]> {
    const key = `news_${symbol.toUpperCase()}`;

    // L1: In-memory
    const cached = DataCache.get<NewsItem[]>(key);
    if (cached) return cached;

    // L2: DB cache
    const dbCached = await EodDataCacheService.get<NewsItem[]>('news', symbol);
    if (dbCached) {
      DataCache.set(key, dbCached, DEFAULT_TTL);
      return dbCached;
    }

    // L3: Provider
    const data = await this.coordinator.getNews(symbol);

    // Backfill
    DataCache.set(key, data, DEFAULT_TTL);
    await EodDataCacheService.set('news', symbol, data);

    return data as NewsItem[];
  }

  /**
   * Financial snapshot — L1 memory → L2 DB → provider (cache-first).
   * Fundamentals change slowly (quarterly), so DB TTL is long (7d).
   * Even after market close, financials are served from cache. Only on
   * complete cache miss do we call the provider chain.
   */
  public static async getFinancials(symbol: string): Promise<FinancialSnapshot> {
    const key = `financials_${symbol.toUpperCase()}`;

    const cached = DataCache.get<FinancialSnapshot>(key);
    if (cached) return cached;

    const dbCached = await EodDataCacheService.get<FinancialSnapshot>('financials', symbol);
    if (dbCached) {
      DataCache.set(key, dbCached, DEFAULT_TTL);
      return dbCached;
    }

    const data = await this.coordinator.getFinancials(symbol);

    DataCache.set(key, data, DEFAULT_TTL);
    await EodDataCacheService.set('financials', symbol, data);

    return data;
  }
}
