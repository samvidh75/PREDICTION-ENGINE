import type { NormalizedCandle, ProviderHealth, ProviderId } from '../marketData/types';
import type { NormalizedQuote, PublicProviderId, PublicMarketDataProvider } from './types';

class NseLibProviderError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'NseLibProviderError';
  }
}

export class NseLibProvider implements PublicMarketDataProvider {
  readonly providerId: PublicProviderId = 'nselib';

  async getQuote(_symbol: string): Promise<NormalizedQuote> {
    throw new NseLibProviderError(
      'provider_error',
      'nselib does not support live quotes: requires Python 3.10+ and nselib only provides historical/bhavcopy/index data',
    );
  }

  async getHistoricalDaily(_symbol: string, _fromDate: string, _toDate: string): Promise<NormalizedCandle[]> {
    throw new NseLibProviderError(
      'provider_error',
      'nselib historical data requires Python 3.10+ which is not available in this environment',
    );
  }

  async getBhavcopy(_date: string): Promise<unknown[]> {
    throw new NseLibProviderError(
      'provider_error',
      'nselib bhavcopy requires Python 3.10+ which is not available in this environment',
    );
  }

  async getIndexConstituents(_indexName: string): Promise<unknown[]> {
    throw new NseLibProviderError(
      'provider_error',
      'nselib index constituents require Python 3.10+ which is not available in this environment',
    );
  }

  async getFinancialResults(_symbol: string): Promise<unknown[]> {
    throw new NseLibProviderError(
      'provider_error',
      'nselib financial results require Python 3.10+ which is not available in this environment',
    );
  }

  async checkHealth(): Promise<ProviderHealth> {
    return {
      provider: 'nselib' as ProviderId,
      status: 'provider_error',
      latencyMs: null,
      checkedAt: new Date().toISOString(),
    };
  }
}
