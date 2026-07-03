import type { ProviderDomain, PublicProviderId } from './types';
import { ProviderCoordinator } from '../../services/providers/ProviderCoordinator';

interface ProviderHealthResult {
  provider: string;
  status: "healthy" | "degraded" | "unavailable";
  latencyMs?: number;
}

interface DomainStatus {
  healthy: boolean;
}

interface ProviderMatrixEntry {
  domains: Partial<Record<ProviderDomain, DomainStatus>>;
}

interface QuoteResult {
  data?: { lastPrice: number };
  provider?: string;
  latencyMs: number;
  error?: string;
}

interface HistoricalResult {
  data?: unknown[];
  provider?: string;
  latencyMs: number;
  error?: string;
}

const HEALTHY_PROVIDERS: Record<string, PublicProviderId[]> = {
  indianapi: ["indianapi"],
  "jugaad-data": ["jugaad-data"],
  nsepython: ["nsepython"],
  yahoo: ["yahoo"],
};

const DOMAIN_MATRIX: Record<string, Array<{ key: string; domain: ProviderDomain }>> = {
  INDIANAPI_KEY: [
    { key: "indianapi", domain: "quote" },
  ],
  JUGAD_DATA: [
    { key: "jugaad-data", domain: "quote" },
    { key: "jugaad-data", domain: "historical" },
    { key: "jugaad-data", domain: "bhavcopy" },
    { key: "jugaad-data", domain: "index" },
    { key: "jugaad-data", domain: "rbi" },
  ],
  NSEPYTHON: [
    { key: "nsepython", domain: "quote" },
    { key: "nsepython", domain: "historical" },
    { key: "nsepython", domain: "bhavcopy" },
    { key: "nsepython", domain: "index_quote" },
  ],
  YAHOO: [
    { key: "yahoo", domain: "quote" },
    { key: "yahoo", domain: "historical" },
  ],
  FUNDAMENTALS_AUTOMATIC: [
    { key: "automatic_public", domain: "fundamentals" },
  ],
  CSV_FALLBACK: [
    { key: "csv_import", domain: "fundamentals" },
  ],
};

export class PublicMarketDataProviderBroker {
  private coordinator: ProviderCoordinator;

  constructor() {
    this.coordinator = new ProviderCoordinator();
  }

  async checkAllProviders(): Promise<ProviderHealthResult[]> {
    const results: ProviderHealthResult[] = [];
    for (const [providerId] of Object.entries(HEALTHY_PROVIDERS)) {
      const start = Date.now();
      try {
        await this.coordinator.getQuote("RELIANCE");
        results.push({
          provider: providerId,
          status: "healthy",
          latencyMs: Date.now() - start,
        });
      } catch {
        results.push({
          provider: providerId,
          status: "unavailable",
          latencyMs: Date.now() - start,
        });
      }
    }
    return results;
  }

  async getProviderStatusMatrix(): Promise<Record<string, ProviderMatrixEntry>> {
    const matrix: Record<string, ProviderMatrixEntry> = {};
    for (const [envKey, entries] of Object.entries(DOMAIN_MATRIX)) {
      const domains: Partial<Record<ProviderDomain, DomainStatus>> = {};
      for (const { domain } of entries) {
        const start = Date.now();
        try {
          await this.coordinator.getQuote("RELIANCE");
          domains[domain] = { healthy: true };
        } catch {
          domains[domain] = { healthy: false };
        }
      }
      matrix[envKey] = { domains };
    }
    return matrix;
  }

  async getQuote(symbol: string): Promise<QuoteResult> {
    const start = Date.now();
    try {
      const quote = await this.coordinator.getQuote(symbol);
      return {
        data: { lastPrice: quote.price },
        provider: "coordinator",
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      return {
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getHistoricalDaily(symbol: string, from: string, to: string): Promise<HistoricalResult> {
    const start = Date.now();
    try {
      const history = await this.coordinator.getHistory(symbol);
      const filtered = history.filter(
        (p) => p.date >= from && p.date <= to,
      );
      return {
        data: filtered,
        provider: "coordinator",
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      return {
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
