// src/services/providers/ProviderCoordinator.ts
// Orchestrates provider chain with failover, circuit breakers, and health monitoring.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { NewsProvider, NewsItem } from './NewsProvider';
import { FinancialProvider } from './FinancialProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from '../data/types';
import { YahooProvider } from './YahooProvider';
import { IndianMarketProvider } from './IndianMarketProvider';
import { AlphaVantageProvider } from './AlphaVantageProvider';
import { FinnhubProvider } from './FinnhubProvider';
import { GoogleNewsRssProvider } from './GoogleNewsRssProvider';
import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { DataFlowTracer } from '../audit/DataFlowTracer';
import ProviderCircuitBreaker from './ProviderCircuitBreaker';

/**
 * ProviderCoordinator — the single entry point for all market data.
 *
 * Chain order (as specified):
 *   Quotes:      Yahoo → IndianMarket → AlphaVantage
 *   Metadata:    Yahoo → Finnhub
 *   Historical:  Yahoo → IndianMarket → AlphaVantage
 *   Financials:  Finnhub → Yahoo (Yahoo doesn't have financials, but kept for future)
 *   News:        Finnhub → GNews (GNews not implemented yet, so Finnhub only)
 */
export class ProviderCoordinator {
  private priceProviders: PriceProvider[] = [];
  private metadataProviders: MetadataProvider[] = [];
  private historicalProviders: HistoricalProvider[] = [];
  private newsProviders: NewsProvider[] = [];
  private financialProviders: FinancialProvider[] = [];

  private healthMonitor: ProviderHealthMonitor;
  private circuitBreakers: Map<any, ProviderCircuitBreaker> = new Map();
  private tracer: DataFlowTracer;

  constructor() {
    this.healthMonitor = new ProviderHealthMonitor();
    this.tracer = new DataFlowTracer();

    // ── Tier 1: Yahoo (always available, no API key) ──────
    const yahoo = new YahooProvider();
    const yahooBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 });
    this.circuitBreakers.set(yahoo, yahooBreaker);
    this.priceProviders.push(yahoo);
    this.metadataProviders.push(yahoo);
    this.historicalProviders.push(yahoo);

    // ── Tier 2: Indian Market Provider (no key for NSE direct) ──
    try {
      const indian = new IndianMarketProvider();
      const indianBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 });
      this.circuitBreakers.set(indian, indianBreaker);
      this.priceProviders.push(indian);
      this.historicalProviders.push(indian);
    } catch (e) {
      // Skip if initialization fails
    }

    // ── Tier 3: Alpha Vantage (requires API key) ──────────
    try {
      const alpha = new AlphaVantageProvider();
      const alphaBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 120_000 });
      this.circuitBreakers.set(alpha, alphaBreaker);
      this.priceProviders.push(alpha);
      this.historicalProviders.push(alpha);
    } catch (e) {
      // API key missing – skip
    }

    // ── Tier 4: Finnhub (requires API key) ────────────────
    try {
      const finnhub = new FinnhubProvider();
      const finnhubBreaker = new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 });
      this.circuitBreakers.set(finnhub, finnhubBreaker);
      this.metadataProviders.push(finnhub);
      this.financialProviders.push(finnhub);
      this.newsProviders.push(finnhub);
    } catch (e) {
      // API key missing – skip
    }

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
