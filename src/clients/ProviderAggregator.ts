import type { UnifiedQuote, BatchQuoteRequest, BatchQuoteResponse } from './types';
import { yfinanceClient } from './YFinanceClient';
import { nseClient } from './NSEClient';
import { screenerClient } from './ScreenerClient';
import { browserCache } from './BrowserCache';

/**
 * Aggregates multiple data providers with intelligent fallback.
 * Default order: yfinance (fastest) → nselib (live NSE) → screener.in (fallback)
 * Returns first successful response within timeout.
 */
export class ProviderAggregator {
  private readonly defaultPreference = ['yfinance', 'nselib', 'screener'];

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
    const allProviders = [
      { name: 'yfinance', fetch: () => yfinanceClient.fetchQuote(symbol, false) },
      { name: 'nselib', fetch: () => nseClient.fetchQuote(symbol, false) },
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
        const result = await Promise.race([
          provider.fetch(),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeout),
          ),
        ]) as { success: boolean; quote?: UnifiedQuote; error?: string };

        if (result.success && result.quote) {
          return result.quote;
        }
      } catch {
        // Continue to next provider on error or timeout
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
   * Smart cache validation: if we have 2+ providers disagreeing on price,
   * flag it and use median.
   */
  async validateAndMedianPrice(symbols: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    // TODO: Implement multi-provider comparison
    // For now, just return first available

    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote) {
        priceMap.set(symbol, quote.price);
      }
    }

    return priceMap;
  }
}

// Singleton
export const providerAggregator = new ProviderAggregator();
