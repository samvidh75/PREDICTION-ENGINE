import type { NormalizedCandle, ProviderHealth, ProviderId } from '../marketData/types';
import type { NormalizedQuote, PublicProviderId, PublicMarketDataProvider } from './types';
import { YahooFallbackProvider } from '../marketData/yahooFallbackProvider';

class YahooProviderError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'YahooProviderError';
  }
}

function isRailwayUnreachable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('aborted');
}

export class YahooProvider implements PublicMarketDataProvider {
  readonly providerId: PublicProviderId = 'yahoo';
  private fallback: YahooFallbackProvider;

  constructor() {
    this.fallback = new YahooFallbackProvider();
  }

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    try {
      const quote = await this.fallback.getQuote(symbol);
      return {
        ...quote,
        freshnessStatus: 'stale',
      };
    } catch (err: unknown) {
      if (isRailwayUnreachable(err)) {
        throw new YahooProviderError('provider_unreachable', `Yahoo blocked/unreachable from Railway: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (err instanceof Error) throw new YahooProviderError('provider_error', err.message);
      throw new YahooProviderError('provider_error', String(err));
    }
  }

  async getHistoricalDaily(symbol: string, fromDate: string, toDate: string): Promise<NormalizedCandle[]> {
    try {
      return await this.fallback.getHistoricalDaily(symbol, fromDate, toDate);
    } catch (err: unknown) {
      if (isRailwayUnreachable(err)) {
        throw new YahooProviderError('provider_unreachable', `Yahoo blocked/unreachable from Railway: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (err instanceof Error) throw new YahooProviderError('provider_error', err.message);
      throw new YahooProviderError('provider_error', String(err));
    }
  }

  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const health = await this.fallback.checkHealth();
      if (health.status === 'provider_unreachable') {
        return {
          provider: 'yahoo' as ProviderId,
          status: 'provider_unreachable',
          latencyMs: health.latencyMs,
          checkedAt: health.checkedAt,
        };
      }
      return health;
    } catch {
      return { provider: 'yahoo' as ProviderId, status: 'provider_unreachable', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  }
}
