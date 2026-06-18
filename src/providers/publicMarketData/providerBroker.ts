import type { NormalizedCandle, ProviderHealth, ProviderId, ProviderBrokerResult } from '../marketData/types';
import type { NormalizedQuote, NormalizedBhavcopy, NormalizedIndexConstituent, NormalizedFinancialResult, PublicProviderId, ProviderDomain, DomainHealth } from './types';
import { JugaadDataProvider } from './jugaadDataProvider';
import { NsePythonProvider } from './nsePythonProvider';
import { YahooProvider } from './yahooProvider';
import { IndianApiProvider } from './indianApiProvider';
import { YahooFallbackProvider } from '../marketData/yahooFallbackProvider';

const QUOTE_PRECEDENCE: PublicProviderId[] = ['indianapi', 'jugaad-data', 'nsepython', 'yahoo'];
const HISTORICAL_PRECEDENCE: PublicProviderId[] = ['jugaad-data', 'nsepython', 'yahoo'];
const BHAVCOPY_PRECEDENCE: PublicProviderId[] = ['jugaad-data', 'nsepython'];
const INDEX_PRECEDENCE: PublicProviderId[] = ['nsepython', 'jugaad-data'];
const FUNDAMENTALS_PRECEDENCE: string[] = ['automatic_public', 'csv_import'];
const MACRO_PRECEDENCE: PublicProviderId[] = ['jugaad-data'];

const DOMAIN_PRECEDENCE: Record<ProviderDomain, (PublicProviderId | string)[]> = {
  quote: QUOTE_PRECEDENCE,
  historical: HISTORICAL_PRECEDENCE,
  bhavcopy: BHAVCOPY_PRECEDENCE,
  index: INDEX_PRECEDENCE,
  fundamentals: FUNDAMENTALS_PRECEDENCE,
  macro: MACRO_PRECEDENCE,
};

interface DomainProvider {
  providerId: PublicProviderId;
  getQuote?(symbol: string): Promise<NormalizedQuote>;
  getHistoricalDaily?(symbol: string, fromDate: string, toDate: string): Promise<NormalizedCandle[]>;
  checkHealth(): Promise<ProviderHealth>;
}

class PublicProviderBrokerError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'PublicProviderBrokerError';
  }
}

function classifyError(err: unknown): { code: string; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('missing_optional')) return { code: 'missing_optional', message: msg };
  if (msg.includes('expired') || msg.includes('401')) return { code: 'expired_or_unauthorized', message: msg };
  if (msg.includes('rate_limited') || msg.includes('429')) return { code: 'rate_limited', message: msg };
  if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('timeout') || msg.includes('aborted')) {
    return { code: 'provider_unreachable', message: msg };
  }
  return { code: 'provider_error', message: msg };
}

export class PublicMarketDataProviderBroker {
  private providers: DomainProvider[];
  private providerMap: Map<PublicProviderId, DomainProvider>;
  private yahooFallback: YahooFallbackProvider;

  constructor() {
    const jugaad = new JugaadDataProvider();
    const nsepython = new NsePythonProvider();
    const yahoo = new YahooProvider();
    const indianapi = new IndianApiProvider();
    this.yahooFallback = new YahooFallbackProvider();

    this.providers = [jugaad, nsepython, yahoo, indianapi];
    this.providerMap = new Map(this.providers.map(p => [p.providerId, p]));
  }

  getDomainPrecedence(domain: ProviderDomain): (PublicProviderId | string)[] {
    return DOMAIN_PRECEDENCE[domain] ?? [];
  }

  private getProvider(id: PublicProviderId): DomainProvider | null {
    return this.providerMap.get(id) ?? null;
  }

  async getQuote(symbol: string): Promise<ProviderBrokerResult<NormalizedQuote>> {
    const fallbackChain: ProviderId[] = [];
    let lastError: string | null = null;

    for (const providerId of QUOTE_PRECEDENCE) {
      const provider = this.getProvider(providerId);
      if (!provider || !provider.getQuote) {
        fallbackChain.push(providerId as ProviderId);
        continue;
      }

      const start = Date.now();
      try {
        const quote = await provider.getQuote(symbol);
        return {
          data: quote,
          provider: providerId as ProviderId,
          latencyMs: Date.now() - start,
          error: null,
          fallbackChain,
        };
      } catch (err: unknown) {
        const classified = classifyError(err);
        lastError = classified.message;
        fallbackChain.push(providerId as ProviderId);
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

    for (const providerId of HISTORICAL_PRECEDENCE) {
      const provider = this.getProvider(providerId);
      if (!provider || !provider.getHistoricalDaily) {
        fallbackChain.push(providerId as ProviderId);
        continue;
      }

      const start = Date.now();
      try {
        const candles = await provider.getHistoricalDaily(symbol, fromDate, toDate);
        return {
          data: candles,
          provider: providerId as ProviderId,
          latencyMs: Date.now() - start,
          error: null,
          fallbackChain,
        };
      } catch (err: unknown) {
        const classified = classifyError(err);
        lastError = classified.message;
        fallbackChain.push(providerId as ProviderId);
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

  async getBhavcopy(date: string): Promise<ProviderBrokerResult<NormalizedBhavcopy[]>> {
    const fallbackChain: ProviderId[] = [];
    let lastError: string | null = null;

    for (const providerId of BHAVCOPY_PRECEDENCE) {
      const provider = this.getProvider(providerId);
      if (!provider) {
        fallbackChain.push(providerId as ProviderId);
        continue;
      }

      const start = Date.now();
      try {
        let rows: unknown[] = [];
        if (provider instanceof JugaadDataProvider) {
          rows = await provider.getBhavcopy(date);
        } else if (provider instanceof NsePythonProvider) {
          rows = await provider.getBhavcopy(date);
        } else {
          fallbackChain.push(providerId as ProviderId);
          continue;
        }

        const bhavcopyRows = rows as NormalizedBhavcopy[];
        return {
          data: bhavcopyRows,
          provider: providerId as ProviderId,
          latencyMs: Date.now() - start,
          error: null,
          fallbackChain,
        };
      } catch (err: unknown) {
        const classified = classifyError(err);
        lastError = classified.message;
        fallbackChain.push(providerId as ProviderId);
      }
    }

    return {
      data: null,
      provider: 'unavailable',
      latencyMs: 0,
      error: lastError || 'All bhavcopy providers unavailable',
      fallbackChain,
    };
  }

  async checkAllProviders(): Promise<ProviderHealth[]> {
    return Promise.all(
      this.providers.map(p => p.checkHealth()),
    );
  }

  async getProviderHealth(providerId: PublicProviderId): Promise<ProviderHealth | null> {
    const provider = this.getProvider(providerId);
    return provider ? provider.checkHealth() : null;
  }

  async checkDomainHealth(): Promise<DomainHealth[]> {
    const results: DomainHealth[] = [];
    const now = new Date().toISOString();

    const healths = await this.checkAllProviders();
    const healthMap = new Map(healths.map(h => [h.provider, h]));

    for (const [domain, precedence] of Object.entries(DOMAIN_PRECEDENCE)) {
      for (const pid of precedence) {
        const health = healthMap.get(pid as ProviderId);
        if (health) {
          const domainStatus = health.status === 'healthy' ? 'healthy' : health.status === 'missing_optional' ? 'degraded' : 'unavailable';
          results.push({
            domain: domain as ProviderDomain,
            provider: pid as PublicProviderId,
            status: domainStatus as 'healthy' | 'degraded' | 'unavailable' | 'local_only',
            detail: `${pid} status: ${health.status}`,
            checkedAt: now,
          });
          break;
        }
      }
    }

    return results;
  }

  async getStatusSummary(): Promise<Record<string, { status: string; latencyMs: number | null }>> {
    const healths = await this.checkAllProviders();
    const summary: Record<string, { status: string; latencyMs: number | null }> = {};
    for (const h of healths) {
      summary[h.provider] = { status: h.status, latencyMs: h.latencyMs };
    }
    return summary;
  }
}
