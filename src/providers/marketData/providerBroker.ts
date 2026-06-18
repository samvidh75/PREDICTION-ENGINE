/**
 * providerBroker.ts — Market data provider broker with fallback precedence.
 *
 * Fallback order for quotes:
 *   1. Dhan (if credentials present + healthy)
 *   2. Upstox (if token valid)
 *   3. IndianAPI (if configured)
 *   4. Yahoo fallback
 *   5. unavailable
 *
 * Fallback order for historical:
 *   1. Dhan
 *   2. Upstox
 *   3. Yahoo fallback
 *   4. unavailable
 *
 * No trading/order methods exposed.
 */

import type {
  NormalizedQuote, NormalizedCandle, ProviderHealth, ProviderId,
  MarketDataProvider, ProviderBrokerResult,
} from './types';
import { DhanProvider } from './dhanProvider';
import { UpstoxProvider } from './upstoxProvider';
import { YahooFallbackProvider } from './yahooFallbackProvider';

function classifyError(err: unknown): { code: string; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : '';

  if (name === 'DhanProviderError' || name === 'UpstoxProviderError') {
    const safeCode = (err as any).safeCode || 'provider_error';
    return { code: safeCode, message: msg };
  }
  if (msg.includes('missing_optional')) return { code: 'missing_optional', message: msg };
  if (msg.includes('expired') || msg.includes('401')) return { code: 'expired_or_unauthorized', message: msg };
  if (msg.includes('rate_limited') || msg.includes('429')) return { code: 'rate_limited', message: msg };
  if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('timeout') || msg.includes('aborted')) {
    return { code: 'provider_unreachable', message: msg };
  }
  if (msg.includes('symbol_mapping_missing')) return { code: 'symbol_mapping_missing', message: msg };
  return { code: 'provider_error', message: msg };
}

export class ProviderBroker {
  private providers: MarketDataProvider[];
  private providerMap: Map<ProviderId, MarketDataProvider>;

  constructor() {
    this.providers = [
      new DhanProvider(),
      new UpstoxProvider(),
      new YahooFallbackProvider(),
    ];
    this.providerMap = new Map(this.providers.map(p => [p.providerId, p]));
  }

  get quotePrecedence(): ProviderId[] {
    return ['dhan', 'upstox', 'indianapi', 'yahoo'];
  }

  get historicalPrecedence(): ProviderId[] {
    return ['dhan', 'upstox', 'yahoo'];
  }

  private getProvider(id: ProviderId): MarketDataProvider | null {
    return this.providerMap.get(id) ?? null;
  }

  async getQuote(symbol: string): Promise<ProviderBrokerResult<NormalizedQuote>> {
    const fallbackChain: ProviderId[] = [];
    let lastError: string | null = null;

    for (const providerId of this.quotePrecedence) {
      const provider = this.getProvider(providerId);
      if (!provider) {
        fallbackChain.push(providerId);
        continue;
      }

      const start = Date.now();
      try {
        const quote = await provider.getQuote(symbol);
        return {
          data: quote,
          provider: providerId,
          latencyMs: Date.now() - start,
          error: null,
          fallbackChain,
        };
      } catch (err: unknown) {
        const classified = classifyError(err);
        lastError = classified.message;
        fallbackChain.push(providerId);
      }
    }

    return {
      data: null,
      provider: 'unavailable',
      latencyMs: 0,
      error: lastError || 'All quote providers unavailable',
      fallbackChain,
    };
  }

  async getHistoricalDaily(
    symbol: string,
    fromDate: string,
    toDate: string,
  ): Promise<ProviderBrokerResult<NormalizedCandle[]>> {
    const fallbackChain: ProviderId[] = [];
    let lastError: string | null = null;

    for (const providerId of this.historicalPrecedence) {
      const provider = this.getProvider(providerId);
      if (!provider) {
        fallbackChain.push(providerId);
        continue;
      }

      const start = Date.now();
      try {
        const candles = await provider.getHistoricalDaily(symbol, fromDate, toDate);
        return {
          data: candles,
          provider: providerId,
          latencyMs: Date.now() - start,
          error: null,
          fallbackChain,
        };
      } catch (err: unknown) {
        const classified = classifyError(err);
        lastError = classified.message;
        fallbackChain.push(providerId);
      }
    }

    return {
      data: null,
      provider: 'unavailable',
      latencyMs: 0,
      error: lastError || 'All historical providers unavailable',
      fallbackChain,
    };
  }

  async checkAllProviders(): Promise<ProviderHealth[]> {
    return Promise.all(
      this.providers.map(p => p.checkHealth()),
    );
  }

  async getProviderHealth(providerId: ProviderId): Promise<ProviderHealth | null> {
    const provider = this.getProvider(providerId);
    return provider ? provider.checkHealth() : null;
  }

  async getStatusSummary(): Promise<Record<ProviderId, { status: string; latencyMs: number | null }>> {
    const healths = await this.checkAllProviders();
    const summary: Record<string, { status: string; latencyMs: number | null }> = {};
    for (const h of healths) {
      summary[h.provider] = { status: h.status, latencyMs: h.latencyMs };
    }
    summary['indianapi'] = {
      status: process.env.INDIANAPI_KEY ? 'healthy' : 'missing_optional',
      latencyMs: null,
    };
    return summary as Record<ProviderId, { status: string; latencyMs: number | null }>;
  }
}
