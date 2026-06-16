import { PriceProvider } from './PriceProvider';
import { MetadataProvider } from './MetadataProvider';
import { HistoricalProvider } from './HistoricalProvider';
import { NewsProvider, NewsItem } from './NewsProvider';
import { FinancialProvider } from './FinancialProvider';
import { StockQuote, CompanyMetadata, HistoricalPoint, FinancialSnapshot } from '../data/types';
import { YahooProvider } from './YahooProvider';
import { IndianMarketProvider } from './IndianMarketProvider';
import { IndianApiFinancialProvider } from './IndianApiFinancialProvider';
import { GoogleNewsRssProvider } from './GoogleNewsRssProvider';
import { UpstoxFundamentalsProvider } from './UpstoxFundamentalsProvider';
import { ScreenerProvider } from './ScreenerProvider';
import { MoneycontrolFinancialsProvider } from './MoneycontrolFinancialsProvider';

import { ProviderHealthMonitor } from './ProviderHealthMonitor';
import { DataFlowTracer } from '../audit/DataFlowTracer';
import ProviderCircuitBreaker from './ProviderCircuitBreaker';
import { loadAuthorizedProviderConfig } from './authorization/ProviderAuthorization';

const REQUIRED_SCORING_FIELDS = new Set([
  'peRatio',
  'pbRatio',
  'roa',
  'roe',
  'roic',
  'evEbitda',
  'debtToEquity',
  'marketCap',
  'eps',
  'dividendYield',
  'beta',
  'revenueGrowth',
  'profitGrowth',
  'epsGrowth',
  'fcfGrowth',
  'grossMargin',
  'operatingMargin',
  'currentRatio',
  'fcfYield',
]);

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

    const indianApiFinancials = new IndianApiFinancialProvider();
    this.circuitBreakers.set(indianApiFinancials, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
    this.financialProviders.push(indianApiFinancials);

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

    const authorizedConfig = loadAuthorizedProviderConfig();
    if (authorizedConfig.screener.enabled) {
      const screener = new ScreenerProvider(authorizedConfig.screener);
      this.circuitBreakers.set(screener, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
      this.financialProviders.push(screener);
    }

    if (authorizedConfig.moneycontrol.enabled) {
      const moneycontrolFinancials = new MoneycontrolFinancialsProvider(authorizedConfig.moneycontrol);
      this.circuitBreakers.set(moneycontrolFinancials, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
      this.financialProviders.push(moneycontrolFinancials);
    }

    const indian = new IndianMarketProvider();
    this.circuitBreakers.set(indian, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
    this.priceProviders.push(indian);
    this.metadataProviders.push(indian);
    this.historicalProviders.push(indian);

    const yahoo = new YahooProvider();
    this.circuitBreakers.set(yahoo, new ProviderCircuitBreaker({ failureThreshold: 3, openTimeoutMs: 60_000 }));
    this.priceProviders.push(yahoo);
    this.metadataProviders.push(yahoo);
    this.historicalProviders.push(yahoo);

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
        const result = breaker ? await breaker.execute(() => fn(provider)) : await fn(provider);
        this.healthMonitor.recordSuccess(provider);
        this.tracer.recordUsage(symbol, category, provider.constructor.name, false);
        return result;
      } catch (err: any) {
        errors.push(`${provider.constructor.name}: ${this.sanitizeProviderError(err)}`);
        this.healthMonitor.recordFailure(provider);
        this.tracer.recordUsage(symbol, category, provider.constructor.name, true);
      }
    }

    throw new Error(`All providers failed for ${category}(${symbol}): ${errors.join(' | ')}`);
  }

  private async invokeFinancialsMerge(symbol: string): Promise<FinancialSnapshot> {
    const merged: Record<string, any> = {};
    const sourceMap: Record<string, string> = {};
    const errors: string[] = [];
    const calledProviders = new Set<string>();

    for (const provider of this.financialProviders) {
      const providerName = (provider as any).constructor?.name ?? 'unknown';

      if (calledProviders.has(providerName)) continue;
      calledProviders.add(providerName);

      const status = this.healthMonitor.getStatus(provider);
      if (status === 'Unavailable' || status === 'RateLimited') {
        errors.push(`${providerName}: skipped (${status})`);
        continue;
      }

      if (this.scoringFieldsComplete(merged)) {
        break;
      }

      const breaker = this.circuitBreakers.get(provider);
      try {
        const result = breaker
          ? await breaker.execute(() => provider.getFinancials(symbol))
          : await provider.getFinancials(symbol);
        this.healthMonitor.recordSuccess(provider);
        this.tracer.recordUsage(symbol, 'financials', providerName, false);
        this.mergeFinancialFields(merged, result as Record<string, any>, providerName, sourceMap);
      } catch (err: any) {
        errors.push(`${providerName}: ${this.sanitizeProviderError(err)}`);
        this.healthMonitor.recordFailure(provider);
        this.tracer.recordUsage(symbol, 'financials', providerName, true);
      }
    }

    if (Object.keys(merged).length === 0) {
      throw new Error(`All providers failed for financials(${symbol}): ${errors.join(' | ')}`);
    }

    return {
      symbol: String(merged.symbol ?? symbol).toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, ''),
      periodEnd: merged.periodEnd ?? undefined,
      ...merged,
      _sources: sourceMap,
      _providerErrors: errors,
    } as FinancialSnapshot;
  }

  private scoringFieldsComplete(merged: Record<string, any>): boolean {
    for (const field of REQUIRED_SCORING_FIELDS) {
      if (merged[field] === undefined || merged[field] === null) {
        return false;
      }
    }
    return true;
  }

  private mergeFinancialFields(
    target: Record<string, any>,
    source: Record<string, any>,
    providerName: string,
    sourceMap: Record<string, string>,
  ): void {
    for (const [field, value] of Object.entries(source)) {
      if (field.startsWith('_') || field === 'symbol') continue;
      if (value === undefined || value === null) continue;
      if (target[field] !== undefined && target[field] !== null) continue;
      target[field] = value;
      sourceMap[field] = providerName;
    }
  }

  private sanitizeProviderError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    return message
      .replace(/(token|api[_-]?key|apikey|key|secret|access[_-]?token)=([^&\s]+)/gi, '$1=[REDACTED]')
      .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
      .replace(/authorization:\s*[^\s]+/gi, 'authorization:[REDACTED]');
  }
}
