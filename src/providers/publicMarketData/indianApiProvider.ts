import type { NormalizedCandle, ProviderHealth, ProviderId } from '../marketData/types';
import type { NormalizedQuote, PublicProviderId, PublicMarketDataProvider } from './types';
import { IndianMarketProvider } from '../../services/providers/IndianMarketProvider';

class IndianApiProviderError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'IndianApiProviderError';
  }
}

export class IndianApiProvider implements PublicMarketDataProvider {
  readonly providerId: PublicProviderId = 'indianapi';
  private inner: IndianMarketProvider | null = null;

  constructor() {
    const key = process.env.INDIANAPI_KEY?.trim();
    if (key) {
      this.inner = new IndianMarketProvider(key);
    }
  }

  private requireInner(): IndianMarketProvider {
    if (!this.inner) {
      throw new IndianApiProviderError('missing_optional', 'IndianAPI key not set (INDIANAPI_KEY)');
    }
    return this.inner;
  }

  async getQuote(symbol: string): Promise<NormalizedQuote> {
    const provider = this.requireInner();
    try {
      const quote = await provider.getQuote(symbol);
      return {
        symbol: quote.symbol,
        exchange: quote.exchange ?? 'NSE',
        lastPrice: quote.price,
        previousClose: null,
        open: null,
        high: null,
        low: null,
        volume: quote.volume ?? null,
        timestamp: quote.retrievedAt ?? new Date().toISOString(),
        provider: 'indianapi' as ProviderId,
        sourceQuality: 'live',
        freshnessStatus: 'live',
      };
    } catch (err: unknown) {
      if (err instanceof IndianApiProviderError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new IndianApiProviderError('provider_error', `IndianAPI quote error for ${symbol}: ${msg}`);
    }
  }

  async getHistoricalDaily(symbol: string, fromDate: string, toDate: string): Promise<NormalizedCandle[]> {
    const provider = this.requireInner();
    try {
      const points = await provider.getHistorical(symbol, '1Y');
      const filtered = points.filter(p => {
        const pd = p.date;
        return pd >= fromDate && pd <= toDate;
      });
      return filtered.map(p => ({
        symbol,
        date: p.date,
        open: p.close,
        high: p.close,
        low: p.close,
        close: p.close,
        volume: 0,
        provider: 'indianapi' as ProviderId,
        sourceQuality: 'fallback',
      }));
    } catch (err: unknown) {
      if (err instanceof IndianApiProviderError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new IndianApiProviderError('provider_error', `IndianAPI historical error for ${symbol}: ${msg}`);
    }
  }

  async checkHealth(): Promise<ProviderHealth> {
    if (!process.env.INDIANAPI_KEY?.trim()) {
      return { provider: 'indianapi' as ProviderId, status: 'missing_optional', latencyMs: null, checkedAt: new Date().toISOString() };
    }
    const start = Date.now();
    try {
      await this.requireInner().getQuote('RELIANCE');
      return { provider: 'indianapi' as ProviderId, status: 'healthy', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    } catch {
      return { provider: 'indianapi' as ProviderId, status: 'provider_error', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  }
}
