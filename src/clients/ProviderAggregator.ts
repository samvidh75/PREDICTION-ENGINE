import type { UnifiedQuote, BatchQuoteRequest, BatchQuoteResponse } from './types';
import { yfinanceClient } from './YFinanceClient';
import { nseClient } from './NSEClient';
import { screenerClient } from './ScreenerClient';
import { bseClient } from './BSEClient';
import { browserCache } from './BrowserCache';
import { providerHealthMonitor } from '../services/health/ProviderHealthMonitor';

export interface PriceValidation {
  symbol: string;
  price: number; // median
  providers: {
    yfinance?: number;
    jugasad?: number;
    screener?: number;
  };
  outliers: Array<{ provider: string; price: number; deviation: number }>;
  confidence: number; // 0-100
  timestamp: number;
}

/**
 * Aggregates multiple data providers with intelligent fallback.
 * Default order: yfinance (fastest) → jugasad (live NSE wrapper) → screener.in (fallback)
 * Returns first successful response within timeout.
 */
export class ProviderAggregator {
  private readonly defaultPreference = ['yfinance', 'jugasad', 'screener'];

  /**
   * Get a quote from the best available provider.
   * Tries in order: cache → preferred providers → fallback providers.
   */
  async getQuote(
    symbol: string,
    options: { preferredSources?: string[]; timeout?: number } = {},
  ): Promise<UnifiedQuote | null> {
    const { preferredSources = this.defaultPreference, timeout = 5000 } = options;

    // Try cache first
    const cached = await browserCache.get(symbol);
    if (cached) {
      return { ...cached, cached: true };
    }

    // All available providers
    // Order: NSE first (most common), then BSE, then international
    const allProviders = [
      { name: 'jugasad', fetch: () => nseClient.fetchQuote(symbol, false) },
      { name: 'bse', fetch: () => bseClient.fetchQuote(symbol) },
      { name: 'yfinance', fetch: () => yfinanceClient.fetchQuote(symbol, false) },
      { name: 'screener', fetch: () => screenerClient.fetchQuote(symbol, false) },
    ];

    // Sort by preference order
    const sortedProviders = allProviders.sort((a, b) => {
      const aIdx = preferredSources.indexOf(a.name);
      const bIdx = preferredSources.indexOf(b.name);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    // Try each provider with timeout
    for (const provider of sortedProviders) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          provider.fetch(),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeout),
          ),
        ]) as { success: boolean; quote?: UnifiedQuote; error?: string };

        if (result.success && result.quote) {
          const responseTime = Date.now() - startTime;
          providerHealthMonitor.recordSuccess(
            provider.name as any,
            responseTime,
          );
          return result.quote;
        }
      } catch {
        providerHealthMonitor.recordFailure(
          provider.name as any,
        );
      }
    }

    return null;
  }

  /**
   * Get multiple quotes from the best providers.
   */
  async getQuotes(request: BatchQuoteRequest): Promise<BatchQuoteResponse> {
    const startTime = Date.now();

    // Fetch from best available provider for each symbol
    const results = await Promise.allSettled(
      request.symbols.map((symbol) =>
        this.getQuote(symbol, {
          preferredSources: request.preferredSources,
          timeout: request.timeout || 5000,
        }),
      ),
    );

    const quotes: UnifiedQuote[] = [];
    const errors: Array<{ symbol: string; error: string; source: string; timestamp: number }> = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        quotes.push(result.value);
      } else {
        errors.push({
          symbol: request.symbols[i],
          error: result.status === 'rejected' ? String(result.reason?.message) : 'Failed to fetch',
          source: 'aggregator',
          timestamp: Date.now(),
        });
      }
    }

    return {
      quotes,
      errors,
      fetchedAt: Date.now(),
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Validate a price by fetching from all 3 providers and comparing.
   * Returns median price + provider breakdown + outliers.
   */
  async validatePrice(symbol: string): Promise<PriceValidation> {
    const providers = [
      { name: 'yfinance', client: yfinanceClient },
      { name: 'jugasad', client: nseClient },
      { name: 'screener', client: screenerClient },
    ];

    const priceMap: { [key: string]: number } = {};
    const responseTimes: number[] = [];

    // Fetch from all providers in parallel
    await Promise.allSettled(
      providers.map(async (p) => {
        const startTime = Date.now();
        const result = await p.client.fetchQuote(symbol, false);
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        if (result.success && result.quote?.price) {
          priceMap[p.name] = result.quote.price;
          providerHealthMonitor.recordSuccess(
            p.name as any,
            responseTime,
          );
        } else {
          providerHealthMonitor.recordFailure(
            p.name as any,
          );
        }
      }),
    );

    // Calculate median price
    const prices = Object.values(priceMap).sort((a, b) => a - b);
    const median =
      prices.length === 0
        ? 0
        : prices.length % 2 === 0
          ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
          : prices[Math.floor(prices.length / 2)];

    // Find outliers (> 1% away from median)
    const outliers: Array<{ provider: string; price: number; deviation: number }> = [];
    for (const [provider, price] of Object.entries(priceMap)) {
      const deviation = Math.abs(price - median) / median;
      if (deviation > 0.01) {
        outliers.push({
          provider,
          price,
          deviation: Math.round(deviation * 10000) / 100, // as percentage
        });
      }
    }

    // Calculate confidence (0-100)
    const confidence =
      prices.length === 3 ? 100 : prices.length === 2 ? 85 : prices.length === 1 ? 60 : 0;

    return {
      symbol,
      price: Math.round(median * 100) / 100,
      providers: {
        yfinance: priceMap['yfinance'],
        jugasad: priceMap['jugasad'],
        screener: priceMap['screener'],
      },
      outliers,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Smart cache validation: if we have 2+ providers disagreeing on price,
   * flag it and use median.
   */
  async validateAndMedianPrice(symbols: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    for (const symbol of symbols) {
      const validation = await this.validatePrice(symbol);
      if (validation.price > 0) {
        priceMap.set(symbol, validation.price);
      }
    }

    return priceMap;
  }
}

// Singleton
export const providerAggregator = new ProviderAggregator();
