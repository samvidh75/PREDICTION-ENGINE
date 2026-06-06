// src/services/providers/ProviderCoordinator.ts
// Orchestrates provider chains with failover, circuit breakers, and health monitoring.

import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { NewsProvider, NewsItem } from './NewsProvider';
import { FinancialProvider } from './FinancialProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from '../data/types';
import { YahooProvider } from './YahooProvider';
import { UpstoxProvider } from '../brokers/UpstoxProvider';
import { FinnhubProvider } from './FinnhubProvider';
import { GoogleNewsRssProvider } from './GoogleNewsRssProvider';
import { UpstoxFundamentalsProvider } from './UpstoxFundamentalsProvider';
import { ScreenerProvider } from './ScreenerProvider';
import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { ProviderHealthService, type ProviderHealthSnapshot } from './ProviderHealthService';
import { DataFlowTracer } from '../audit/DataFlowTracer';
import ProviderCircuitBreaker from './ProviderCircuitBreaker';

const FIELD_PRECEDENCE: Record<string, string[]> = {
  symbol: ['FinnhubProvider', 'ScreenerProvider', 'UpstoxFundamentalsProvider', 'YahooProvider'],
  periodEnd: ['FinnhubProvider', 'ScreenerProvider', 'UpstoxFundamentalsProvider', 'YahooProvider'],
  marketCap: ['FinnhubProvider', 'ScreenerProvider', 'YahooProvider'],
  peRatio: ['FinnhubProvider', 'UpstoxFundamentalsProvider', 'YahooProvider'],
  pbRatio: ['FinnhubProvider', 'UpstoxFundamentalsProvider', 'YahooProvider'],
  evEbitda: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  eps: ['FinnhubProvider', 'ScreenerProvider', 'YahooProvider'],
  fcfYield: ['FinnhubProvider', 'YahooProvider'],
  roe: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  roa: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  roic: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  grossMargin: ['FinnhubProvider', 'YahooProvider'],
  operatingMargin: ['ScreenerProvider', 'FinnhubProvider'],
  revenueGrowth: ['ScreenerProvider', 'FinnhubProvider'],
  profitGrowth: ['ScreenerProvider', 'FinnhubProvider'],
  epsGrowth: ['FinnhubProvider', 'ScreenerProvider'],
  fcfGrowth: ['FinnhubProvider', 'ScreenerProvider'],
  debtToEquity: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  currentRatio: ['FinnhubProvider', 'ScreenerProvider'],
  dividendYield: ['ScreenerProvider', 'FinnhubProvider'],
  beta: ['FinnhubProvider', 'YahooProvider'],
  bookValue: ['ScreenerProvider'],
  interestCoverage: ['FinnhubProvider'],
  freeCashFlow: ['FinnhubProvider'],
  totalAssets: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  totalLiabilities: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  totalEquity: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
};

/**
 * ProviderCoordinator is the single entry point for market data.
 * Financial values are resolved at field level so a lower-priority provider
 * can fill gaps but cannot silently overwrite a preferred real value.
 */
export class ProviderCoordinator {
  private priceProviders: PriceProvider[] = [];
  private metadataProviders: MetadataProvider[] = [];
  private historicalProviders: HistoricalProvider[] = [];
  private newsProviders: NewsProvider[] = [];
  private financialProviders: FinancialProvider[] = [];
  public upstox: UpstoxProvider;

  private healthMonitor: ProviderHealthMonitor;
  private providerHealthService: ProviderHealthService;
  private circuitBreakers: Map<any, ProviderCircuitBreaker> = new Map();
  private tracer: DataFlowTracer;

  constructor() {
    this.healthMonitor = new ProviderHealthMonitor();
    this.providerHealthService = new ProviderHealthService();
    this.tracer = new DataFlowTracer();

    this.upstox = new UpstoxProvider();
    this.circuitBreakers.set(this.upstox, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));

    try {
      const finnhub = new FinnhubProvider();
      this.circuitBreakers.set(finnhub, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
      this.metadataProviders.push(finnhub);
      this.financialProviders.push(finnhub);
      this.newsProviders.push(finnhub);
    } catch {
      // Finnhub remains optional when no API key is configured.
    }

    const screener = new ScreenerProvider();
    this.circuitBreakers.set(screener, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
    this.financialProviders.push(screener);

    const upstoxFundamentals = new UpstoxFundamentalsProvider(() => {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem('upstox_access_token') ?? null;
      }
      if (typeof process !== 'undefined') {
        return process.env.UPSTOX_ACCESS_TOKEN ?? process.env.VITE_UPSTOX_ACCESS_TOKEN ?? null;
      }
      return null;
    });
    this.circuitBreakers.set(upstoxFundamentals, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
    this.financialProviders.push(upstoxFundamentals);

    const yahoo = new YahooProvider();
    this.circuitBreakers.set(yahoo, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
    this.priceProviders.push(yahoo);
    this.metadataProviders.push(yahoo);
    this.historicalProviders.push(yahoo);
    this.financialProviders.push(yahoo);

    const googleNews = new GoogleNewsRssProvider();
    this.circuitBreakers.set(googleNews, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
    this.newsProviders.push(googleNews);
  }

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
    return this.invokeFinancialsMerge(symbol);
  }

  getTraceLog() {
    return this.tracer.getLog();
  }

  getProviderHealth(): ProviderHealthSnapshot[] {
    return this.providerHealthService.getAllSnapshots();
  }

  private async invokeChain<T>(providers: any[], fn: (provider: any) => Promise<T>, category: string, symbol: string): Promise<T> {
    if (providers.length === 0) throw new Error(`No providers configured for ${category}`);

    const errors: string[] = [];
    for (const provider of providers) {
      const providerName = provider.constructor.name;
      const status = this.healthMonitor.getStatus(provider);
      const serviceStatus = this.providerHealthService.getStatus(providerName);
      if (status === 'Unavailable' || status === 'RateLimited' || serviceStatus === 'Unavailable' || serviceStatus === 'RateLimited') {
        errors.push(`${providerName}: skipped (${status}/${serviceStatus})`);
        continue;
      }

      const breaker = this.circuitBreakers.get(provider);
      const startedAt = Date.now();
      try {
        const result = breaker ? await breaker.execute(() => fn(provider)) : await fn(provider);
        this.healthMonitor.recordSuccess(provider);
        this.providerHealthService.recordSuccess(providerName, Date.now() - startedAt, this.estimateCompleteness(result));
        this.tracer.recordUsage(symbol, category, providerName, false);
        return result;
      } catch (err: any) {
        errors.push(`${providerName}: ${err?.message || String(err)}`);
        this.healthMonitor.recordFailure(provider);
        this.providerHealthService.recordFailure(providerName, Date.now() - startedAt, err);
        this.tracer.recordUsage(symbol, category, providerName, true);
      }
    }

    throw new Error(`All providers failed for ${category}(${symbol}): ${errors.join(' | ')}`);
  }

  private async invokeFinancialsMerge(symbol: string): Promise<FinancialSnapshot> {
    const candidates: Record<string, Array<{ provider: string; value: any }>> = {};
    const sourceMap: Record<string, string> = {};
    const errors: string[] = [];

    for (const provider of this.financialProviders) {
      const providerName = provider.constructor.name;
      const status = this.healthMonitor.getStatus(provider);
      const serviceStatus = this.providerHealthService.getStatus(providerName);
      if (status === 'Unavailable' || status === 'RateLimited' || serviceStatus === 'Unavailable' || serviceStatus === 'RateLimited') {
        errors.push(`${providerName}: skipped (${status}/${serviceStatus})`);
        continue;
      }

      const breaker = this.circuitBreakers.get(provider);
      const startedAt = Date.now();
      try {
        const result = breaker ? await breaker.execute(() => provider.getFinancials(symbol)) : await provider.getFinancials(symbol);
        this.healthMonitor.recordSuccess(provider);
        this.providerHealthService.recordSuccess(providerName, Date.now() - startedAt, this.estimateCompleteness(result));
        this.tracer.recordUsage(symbol, 'financials', providerName, false);
        this.collectFinancialCandidates(candidates, result as Record<string, any>, providerName);
      } catch (err: any) {
        errors.push(`${providerName}: ${err?.message || String(err)}`);
        this.healthMonitor.recordFailure(provider);
        this.providerHealthService.recordFailure(providerName, Date.now() - startedAt, err);
        this.tracer.recordUsage(symbol, 'financials', providerName, true);
      }
    }

    const resolved: Record<string, any> = {};
    for (const [field, fieldCandidates] of Object.entries(candidates)) {
      const chosen = this.resolveCandidate(field, fieldCandidates);
      if (!chosen) continue;
      resolved[field] = chosen.value;
      sourceMap[field] = chosen.provider;
    }

    if (Object.keys(resolved).length === 0) {
      throw new Error(`All providers failed for financials(${symbol}): ${errors.join(' | ')}`);
    }

    return {
      symbol: String(resolved.symbol ?? symbol).toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, ''),
      periodEnd: resolved.periodEnd ?? new Date().toISOString().split('T')[0],
      ...resolved,
      _sources: sourceMap,
      _providerErrors: errors,
    } as FinancialSnapshot;
  }

  private collectFinancialCandidates(candidates: Record<string, Array<{ provider: string; value: any }>>, source: Record<string, any>, providerName: string): void {
    for (const [field, value] of Object.entries(source)) {
      if (field.startsWith('_') || value === undefined || value === null) continue;
      const precedence = FIELD_PRECEDENCE[field];
      if (!precedence || !precedence.includes(providerName)) continue;
      if (!candidates[field]) candidates[field] = [];
      candidates[field].push({ provider: providerName, value });
    }
  }

  private resolveCandidate(field: string, candidates: Array<{ provider: string; value: any }>): { provider: string; value: any } | undefined {
    for (const providerName of FIELD_PRECEDENCE[field] ?? []) {
      const match = candidates.find(candidate => candidate.provider === providerName);
      if (match) return match;
    }
    return candidates[0];
  }

  private estimateCompleteness(result: unknown): number {
    if (Array.isArray(result)) return result.length > 0 ? 1 : 0;
    if (!result || typeof result !== 'object') return result == null ? 0 : 1;
    const entries = Object.entries(result as Record<string, unknown>).filter(([key]) => !key.startsWith('_'));
    if (entries.length === 0) return 0;
    return entries.filter(([, value]) => value !== null && value !== undefined).length / entries.length;
  }
}
