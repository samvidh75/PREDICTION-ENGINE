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

export interface ProviderDomainStatusEntry {
  healthy: boolean;
  detail?: string;
}

export interface ProviderStatusEntry {
  lifecycle: 'active' | 'standby' | 'archived';
  required: boolean;
  status: string;
  message: string;
  domains?: Record<string, ProviderDomainStatusEntry>;
}

export type ProviderStatusMatrix = Record<string, ProviderStatusEntry>;

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

function healthMessage(health: ProviderHealth | undefined, healthyMessage: string, missingMessage: string): string {
  if (!health) return 'Provider health was not checked.';
  if (health.status === 'healthy') return healthyMessage;
  if (health.status === 'missing_optional') return missingMessage;
  return `Provider reported ${health.status}.`;
}

function domainFromHealth(health: ProviderHealth | undefined, healthyDetail: string, unavailableDetail: string): ProviderDomainStatusEntry {
  return {
    healthy: health?.status === 'healthy',
    detail: health?.status === 'healthy' ? healthyDetail : (health ? `Provider reported ${health.status}.` : unavailableDetail),
  };
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
    const healthMap = new Map<string, ProviderHealth>(healths.map(h => [h.provider, h]));

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

  async getProviderStatusMatrix(): Promise<ProviderStatusMatrix> {
    const healths = await this.checkAllProviders();
    const healthMap = new Map<string, ProviderHealth>(healths.map(h => [h.provider, h]));
    const indianapi = healthMap.get('indianapi');
    const yahoo = healthMap.get('yahoo');
    const jugaad = healthMap.get('jugaad-data');
    const nsepython = healthMap.get('nsepython');

    const yahooHealthy = yahoo?.status === 'healthy';
    const yahooStatus = yahooHealthy ? 'healthy' : yahoo?.status === 'rate_limited' ? 'blocked' : (yahoo?.status ?? 'unavailable');
    const yahooMessage = yahooHealthy
      ? 'Yahoo fallback is reachable for quote and historical requests. It is optional and may return delayed/stale public data.'
      : healthMessage(yahoo, 'Yahoo fallback reachable.', 'Yahoo fallback is optional and not configured.');

    const jugaadEnabled = process.env.JUGAD_DATA_ENABLED === 'true';
    const nsepythonEnabled = process.env.NSEPYTHON_ENABLED === 'true';

    return {
      INDIANAPI_KEY: {
        lifecycle: 'active',
        required: false,
        status: indianapi?.status ?? 'missing_optional',
        message: healthMessage(indianapi, 'IndianAPI quote endpoint reachable.', 'Optional — set INDIANAPI_KEY for IndianAPI quotes.'),
        domains: {
          quote: domainFromHealth(indianapi, 'IndianAPI quote endpoint reachable.', 'IndianAPI quote endpoint not configured or unavailable.'),
        },
      },
      YAHOO: {
        lifecycle: 'active',
        required: false,
        status: yahooStatus,
        message: yahooMessage,
        domains: {
          quote: domainFromHealth(yahoo, 'Yahoo fallback quote reachable.', 'Yahoo quote fallback unavailable.'),
          historical: domainFromHealth(yahoo, 'Yahoo fallback historical endpoint reachable.', 'Yahoo historical fallback unavailable.'),
        },
      },
      JUGAD_DATA: {
        lifecycle: 'active',
        required: false,
        status: jugaadEnabled ? (jugaad?.status === 'healthy' ? 'healthy' : (jugaad?.status ?? 'unavailable')) : 'missing_optional',
        message: jugaadEnabled
          ? healthMessage(jugaad, 'Jugaad-Data probe reachable for public NSE backup domains. Equity quote endpoints remain restricted by NSE.', 'Optional — set JUGAD_DATA_ENABLED for bhavcopy/RBI/market-status backup checks.')
          : 'Optional — set JUGAD_DATA_ENABLED for bhavcopy/RBI/market-status backup checks.',
        domains: {
          bhavcopy: domainFromHealth(jugaadEnabled ? jugaad : undefined, 'Jugaad-Data public NSE backup probe reachable.', 'Jugaad-Data backup not enabled or unavailable.'),
          rbi: domainFromHealth(jugaadEnabled ? jugaad : undefined, 'Jugaad-Data RBI/macro backup probe reachable.', 'Jugaad-Data RBI backup not enabled or unavailable.'),
          market_status: domainFromHealth(jugaadEnabled ? jugaad : undefined, 'Jugaad-Data market-status probe reachable.', 'Jugaad-Data market-status backup not enabled or unavailable.'),
          quote: { healthy: false, detail: 'Equity quote scraping is not used; NSE restrictions are labelled instead of bypassed.' },
        },
      },
      NSEPYTHON: {
        lifecycle: 'active',
        required: false,
        status: nsepythonEnabled ? (nsepython?.status === 'healthy' ? 'healthy' : (nsepython?.status ?? 'unavailable')) : 'missing_optional',
        message: nsepythonEnabled
          ? healthMessage(nsepython, 'NSEPython backup probe reachable for index/bhavcopy domains. Equity quote endpoints remain restricted by NSE.', 'Optional — set NSEPYTHON_ENABLED for index/bhavcopy backup checks.')
          : 'Optional — set NSEPYTHON_ENABLED for index/bhavcopy backup checks.',
        domains: {
          index_quote: domainFromHealth(nsepythonEnabled ? nsepython : undefined, 'NSEPython index backup probe reachable.', 'NSEPython index backup not enabled or unavailable.'),
          bhavcopy: domainFromHealth(nsepythonEnabled ? nsepython : undefined, 'NSEPython bhavcopy backup probe reachable.', 'NSEPython bhavcopy backup not enabled or unavailable.'),
          quote: { healthy: false, detail: 'Equity quote scraping is not used; NSE restrictions are labelled instead of bypassed.' },
        },
      },
      NSELIB: {
        lifecycle: 'archived',
        required: false,
        status: 'archived_unusable',
        message: 'Evaluated and not active. Provides no usable data-fetching domains in this context.',
      },
    };
  }
}
