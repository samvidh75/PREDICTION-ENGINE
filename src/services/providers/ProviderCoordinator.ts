// src/services/providers/ProviderCoordinator.ts
// Orchestrates provider chain with failover, circuit breakers, and health monitoring.
// 
// RC-UPSTOX-001: Upstox is now Tier 1 for quotes, historical, and portfolio.
// Yahoo remains fallback. Finnhub is primary for fundamentals.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { NewsProvider, NewsItem } from './NewsProvider';
import { FinancialProvider } from './FinancialProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from '../data/types';
import { YahooProvider } from './YahooProvider';
import { UpstoxProvider } from './UpstoxProvider';
import { FinnhubProvider } from './FinnhubProvider';
import { GoogleNewsRssProvider } from './GoogleNewsRssProvider';
import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { DataFlowTracer } from '../audit/DataFlowTracer';
import ProviderCircuitBreaker from './ProviderCircuitBreaker';

/**
 * ProviderCoordinator — the single entry point for all market data.
 *
 * RC-UPSTOX-001 Chain order:
 *   Quotes:      Upstox → Yahoo → Registry fallback
 *   Metadata:    Registry → Provider fallback
 *   Historical:  Upstox → Yahoo
 *   Financials:  Finnhub (primary)
 *   News:        Finnhub → Google News RSS
 *   Portfolio:   Upstox (via getHoldings/getPositions/getFunds)
 */
export class ProviderCoordinator {
  private priceProviders: PriceProvider[] = [];
  private metadataProviders: MetadataProvider[] = [];
  private historicalProviders: HistoricalProvider[] = [];
  private newsProviders: NewsProvider[] = [];
  private financialProviders: FinancialProvider[] = [];
  public upstox: UpstoxProvider;

  private healthMonitor: ProviderHealthMonitor;
  private circuitBreakers: Map<any, ProviderCircuitBreaker> = new Map();
  private tracer: DataFlowTracer;

  constructor() {
    this.healthMonitor = new ProviderHealthMonitor();
    this.tracer = new DataFlowTracer();

    // ── Tier 1: Upstox (primary for quotes, historical, portfolio) ──
    this.upstox = new UpstoxProvider();
    const upstoxBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 });
    this.circuitBreakers.set(this.upstox, upstoxBreaker);
    this.priceProviders.push(this.upstox);
    this.historicalProviders.push(this.upstox);

    // ── Tier 2: Yahoo (fallback for quotes, historical) ─────
    const yahoo = new YahooProvider();
    const yahooBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 });
    this.circuitBreakers.set(yahoo, yahooBreaker);
    this.priceProviders.push(yahoo);
    this.metadataProviders.push(yahoo);
    this.historicalProviders.push(yahoo);

    // ── Tier 3: Finnhub (primary for financials, news) ──────
    try {
      const finnhub = new FinnhubProvider();
      const finnhubBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 });
      this.circuitBreakers.set(finnhub, finnhubBreaker);
      this.metadataProviders.push(finnhub);
      this.financialProviders.push(finnhub);
      this.newsProviders.push(finnhub);
    } catch {
      // API key missing – skip
    }

    // ── Tier 4: Yahoo as FinancialProvider (v8 fallback) ────
    this.financialProviders.push(yahoo);

    // ── Tier 5: Google News RSS fallback for news ──────────
    const googleNews = new GoogleNewsRssProvider();
    const googleNewsBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 });
    this.circuitBreakers.set(googleNews, googleNewsBreaker);
    this.newsProviders.push(googleNews);
  }

  // ── Public façade ───────────────────────────────────────────
  async getQuote(symbol: string): Promise<StockQuote> {
    return this.invokeChain<StockQuote>(this.priceProviders, (p) => p.getQuote(symbol), 'price', symbol);
  }

  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    return this.invokeChain<CompanyMetadata>(this.metadataProviders, (p) => p.getMetadata(symbol), 'metadata', symbol);
  }

  async getHistory(symbol: string, range?: string): Promise<HistoricalPoint[]> {
    return this.invokeChain<HistoricalPoint[]>(this.historicalProviders, (p) => p.getHistory(symbol, range), 'history', symbol);
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    return this.invokeChain<NewsItem[]>(this.newsProviders, (p) => p.getNews(symbol), 'news', symbol);
  }

  async getFinancials(symbol: string): Promise<FinancialSnapshot> {
    return this.invokeChain<FinancialSnapshot>(this.financialProviders, (p) => p.getFinancials(symbol), 'financials', symbol);
  }

  /** Expose trace log for reporting */
  getTraceLog() {
    return this.tracer.getLog();
  }

  // ── Chain execution with circuit breaker + health monitor ──
  private async invokeChain<T>(
    providers: any[],
    fn: (provider: any) => Promise<T>,
    category: string,
    symbol: string,
  ): Promise<T> {
    if (providers.length === 0) {
      throw new Error(`No providers configured for ${category}`);
    }
    const errors: string[] = [];
    for (const provider of providers) {
      const status = this.healthMonitor.getStatus(provider);
      if (status === 'Unavailable' || status === 'RateLimited') {
        errors.push(`${provider.constructor.name}: skipped (${status})`);
        continue;
      }
      const breaker = this.circuitBreakers.get(provider);
      try {
        const result = breaker
          ? await breaker.execute(() => fn(provider))
          : await fn(provider);
        this.healthMonitor.recordSuccess(provider);
        this.tracer?.recordUsage(symbol, category, provider.constructor.name, false);
        return result;
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`${provider.constructor.name}: ${msg}`);
        this.healthMonitor.recordFailure(provider);
        this.tracer.recordUsage(symbol, category, provider.constructor.name, true);
      }
    }
    throw new Error(`All providers failed for ${category}(${symbol}): ${errors.join(' | ')}`);
  }
}
