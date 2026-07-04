// src/services/providers/unified/ProviderRegistry.ts
// Unified provider registry with fallback chains and health monitoring
// Wraps existing ProviderCoordinator and adds unified IMarketDataProvider interface

import { QuoteData, FundamentalData, ProviderHealth, IMarketDataProvider } from './types';
import { ProviderCoordinator } from '../ProviderCoordinator';
import { ProviderHealthMonitor, ProviderStatus } from '../ProviderHealthMonitor';
import { TrendlyneProvider } from './TrendlyneProvider';

// Lazy singleton — Vercel serverless functions get fresh instances per invocation
let coordinator: ProviderCoordinator | null = null;
let trendlyneProvider: TrendlyneProvider | null = null;

function getCoordinator(): ProviderCoordinator {
  if (!coordinator) {
    coordinator = new ProviderCoordinator();
  }
  return coordinator;
}

function getTrendlyne(): TrendlyneProvider {
  if (!trendlyneProvider) {
    trendlyneProvider = new TrendlyneProvider();
  }
  return trendlyneProvider;
}

/** Map internal ProviderStatus to unified ProviderHealth */
function mapStatus(name: string, status: ProviderStatus, failures: number, lastError?: string): ProviderHealth {
  const unified: ProviderHealth['status'] =
    status === 'Healthy' ? 'healthy' :
    status === 'Degraded' ? 'degraded' : 'down';

  return {
    name,
    status: unified,
    lastCheck: new Date().toISOString(),
    responseTimeMs: 0,
    failureCount: failures,
    successRate: failures > 0 ? Math.max(0, 1 - failures / 10) : 1,
    lastError,
  };
}

export class ProviderRegistry {
  private unifiedProviders: Map<string, IMarketDataProvider> = new Map();

  constructor() {
    // Register unified providers
    this.register(getTrendlyne());
  }

  register(provider: IMarketDataProvider) {
    this.unifiedProviders.set(provider.name, provider);
  }

  get(name: string): IMarketDataProvider | undefined {
    return this.unifiedProviders.get(name);
  }

  /**
   * Get quote with fallback chain:
   * 1. ProviderCoordinator (IndianAPI → Yahoo)
   * 2. Falls back to registered unified providers
   */
  async getQuoteWithFallback(symbol: string): Promise<QuoteData> {
    try {
      const coord = getCoordinator();
      const quote = await coord.getQuote(symbol);
      return {
        symbol: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        volume: quote.volume ?? 0,
        marketCap: undefined,
        timestamp: quote.retrievedAt ?? new Date().toISOString(),
        source: 'indianapi/yahoo',
        isRealtime: false,
      };
    } catch (err) {
      // Fallback to Trendlyne (quote not available, will throw)
      throw new Error(`All quote providers failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
    }
  }

  /**
   * Get fundamentals with intelligent aggregation:
   * 1. ProviderCoordinator (IndianAPI → Upstox → Screener → Moneycontrol)
   * 2. Trendlyne for additional fields
   */
  async getFundamentalsWithFallback(symbol: string): Promise<FundamentalData> {
    const errors: { provider: string; error: string }[] = [];
    const aggregated: Record<string, any> = {};

    // Step 1: Try ProviderCoordinator (merge from all financial providers)
    try {
      const coord = getCoordinator();
      const financials = await coord.getFinancials(symbol) as Record<string, unknown>;

      if (financials && Object.keys(financials).length > 0) {
        // Map FinancialSnapshot fields to unified FundamentalData
        const mapField = (srcKey: string, targetKey: string) => {
          const val = financials[srcKey];
          if (val !== undefined && val !== null) {
            aggregated[targetKey] = val;
          }
        };

        aggregated.symbol = symbol;
        aggregated.source = 'coordinator';
        aggregated.companyName = financials.companyName as string;
        aggregated.sector = financials.sector as string;
        aggregated.isin = financials.isin as string;

        mapField('peRatio', 'pe');
        mapField('pbRatio', 'pb');
        mapField('evEbitda', 'evEbitda');
        mapField('roe', 'roe');
        mapField('roa', 'roa');
        mapField('roic', 'roic');
        mapField('debtToEquity', 'debtToEquity');
        mapField('revenueGrowth', 'revenueGrowth');
        mapField('profitGrowth', 'profitGrowth');
        mapField('epsGrowth', 'epsGrowth');
        mapField('operatingMargin', 'operatingMargin');
        mapField('netMargin', 'netMargin');
        mapField('dividendYield', 'dividendYield');
        aggregated._raw = financials._raw ?? {};
      }
    } catch (err) {
      errors.push({ provider: 'coordinator', error: err instanceof Error ? err.message : String(err) });
    }

    // Step 2: Fill gaps from Trendlyne (best-effort — may require auth)
    try {
      const trendlyne = getTrendlyne();
      const tlData = await trendlyne.getFundamentals(symbol);

      const FIELDS_TO_MERGE: (keyof FundamentalData)[] = [
        'pe', 'pb', 'evEbitda', 'roe', 'roa', 'roic',
        'debtToEquity', 'revenueGrowth', 'profitGrowth', 'epsGrowth',
        'operatingMargin', 'netMargin', 'dividendYield',
        'companyName', 'sector', 'isin',
      ];

      for (const field of FIELDS_TO_MERGE) {
        if ((aggregated[field] === undefined || aggregated[field] === null) && tlData[field] !== undefined && tlData[field] !== null) {
          aggregated[field] = tlData[field];
        }
      }

      if (!aggregated._raw) aggregated._raw = {};
      (aggregated._raw as Record<string, unknown>).trendlyne = tlData._raw ?? {};
    } catch {
      // Trendlyne is best-effort — silently skip if auth required
    }

    if (Object.keys(aggregated).length <= 2) {
      throw new Error(
        `All providers failed for fundamentals(${symbol}): ${errors.map(e => `${e.provider}: ${e.error}`).join(' | ')}`
      );
    }

    return {
      ...aggregated,
      symbol,
      lastUpdated: new Date().toISOString(),
    } as FundamentalData;
  }

  /**
   * Search across all providers
   */
  async search(query: string): Promise<{ symbol: string; name: string }[]> {
    const results = new Map<string, { symbol: string; name: string }>();

    // Try Trendlyne autocomplete
    try {
      const trendlyne = getTrendlyne();
      const trendlyneResults = await trendlyne.search(query);
      for (const r of trendlyneResults) {
        if (!results.has(r.symbol)) results.set(r.symbol, r);
      }
    } catch {
      // Non-critical
    }

    return Array.from(results.values()).slice(0, 20);
  }

  /**
   * Get health status of all providers
   */
  async getAllHealth(): Promise<ProviderHealth[]> {
    const health: ProviderHealth[] = [];

    // Trendlyne
    try {
      const trendlyne = getTrendlyne();
      health.push(await trendlyne.getHealth());
    } catch (err) {
      health.push({
        name: 'trendlyne',
        status: 'down',
        lastCheck: new Date().toISOString(),
        responseTimeMs: 0,
        failureCount: 1,
        successRate: 0,
        lastError: err instanceof Error ? err.message : String(err),
      });
    }

    return health;
  }
}

// Singleton export
let registryInstance: ProviderRegistry | null = null;

export function getProviderRegistry(): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry();
  }
  return registryInstance;
}

export default ProviderRegistry;
