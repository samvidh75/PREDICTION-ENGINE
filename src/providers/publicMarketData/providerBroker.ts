import type { ProviderDomain } from './types';
import { ProviderCoordinator } from '../../services/providers/ProviderCoordinator';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

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

const DOMAIN_MATRIX: Record<string, Array<{ key: string; domain: ProviderDomain }>> = {
  INDIANAPI_KEY: [
    { key: "indianapi", domain: "quote" },
  ],
  JUGAD_DATA: [
    { key: "jugaad-data", domain: "quote" },
    { key: "jugaad-data", domain: "historical" },
    { key: "jugaad-data", domain: "pse-daily" },
    { key: "jugaad-data", domain: "index" },
    { key: "jugaad-data", domain: "rbi" },
  ],
  NSEPYTHON: [
    { key: "nsepython", domain: "quote" },
    { key: "nsepython", domain: "historical" },
    { key: "nsepython", domain: "pse-daily" },
    { key: "nsepython", domain: "index_quote" },
  ],
  YAHOO: [
    { key: "yahoo", domain: "quote" },
    { key: "yahoo", domain: "historical" },
    { key: "yahoo", domain: "index" },
  ],
  FUNDAMENTALS_AUTOMATIC: [
    { key: "automatic_public", domain: "fundamentals" },
  ],
  CSV_FALLBACK: [
    { key: "csv_import", domain: "fundamentals" },
  ],
  RBI_PUBLIC: [
    { key: "rbi_public", domain: "macro" },
  ],
};

interface ProbeDomainResult {
  status?: string;
}

interface PythonProbeResult {
  healthy_probes?: number;
  total_probes?: number;
  domains?: Record<string, ProbeDomainResult>;
}

interface RbiMacroProbeResult {
  healthy: boolean;
}

async function runPythonProbe(scriptName: string): Promise<PythonProbeResult | null> {
  try {
    const { stdout } = await execFileAsync('python3', [`scripts/${scriptName}`], {
      cwd: process.cwd(),
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
    });
    const jsonStart = stdout.indexOf('{');
    const payload = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
    return JSON.parse(payload) as PythonProbeResult;
  } catch {
    return null;
  }
}

function domainHealthy(status?: string): boolean {
  return status === 'healthy';
}

async function probeRbiMacro(): Promise<RbiMacroProbeResult> {
  try {
    const response = await fetch('https://www.rbi.org.in/Home.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StockStory/1.0; +https://stockstory-india.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) {
      return { healthy: false };
    }
    const html = await response.text();
    const hasPolicyRate = /Policy Repo Rate\s*:\s*\d+(?:\.\d+)?%/i.test(html);
    const hasExchangeRate = /INR\s*\/\s*1\s*USD\s*:\s*\d+(?:\.\d+)?/i.test(html);
    return { healthy: hasPolicyRate && hasExchangeRate };
  } catch {
    return { healthy: false };
  }
}

export class PublicMarketDataProviderBroker {
  private coordinator: ProviderCoordinator;

  constructor() {
    this.coordinator = new ProviderCoordinator();
  }

  async checkAllProviders(): Promise<ProviderHealthResult[]> {
    const results: ProviderHealthResult[] = [];

    const nsepythonStart = Date.now();
    const nsepython = await runPythonProbe('probe-nsepython-provider.py');
    results.push({
      provider: 'nsepython',
      status: nsepython ? ((nsepython.healthy_probes ?? 0) > 0 ? 'healthy' : 'degraded') : 'unavailable',
      latencyMs: Date.now() - nsepythonStart,
    });

    const jugaadStart = Date.now();
    const jugaad = await runPythonProbe('probe-jugaad-data-provider.py');
    results.push({
      provider: 'jugaad-data',
      status: jugaad ? ((jugaad.healthy_probes ?? 0) > 0 ? 'healthy' : 'degraded') : 'unavailable',
      latencyMs: Date.now() - jugaadStart,
    });

    const yahooStart = Date.now();
    try {
      await this.coordinator.getQuote('RELIANCE');
      results.push({ provider: 'yahoo', status: 'healthy', latencyMs: Date.now() - yahooStart });
    } catch {
      results.push({ provider: 'yahoo', status: 'unavailable', latencyMs: Date.now() - yahooStart });
    }

    results.push({
      provider: 'indianapi',
      status: process.env.INDIANAPI_KEY ? 'healthy' : 'degraded',
    });

    return results;
  }

  async getProviderStatusMatrix(): Promise<Record<string, ProviderMatrixEntry>> {
    const matrix: Record<string, ProviderMatrixEntry> = {};
    const nsepython = await runPythonProbe('probe-nsepython-provider.py');
    const jugaad = await runPythonProbe('probe-jugaad-data-provider.py');
    const rbiMacro = await probeRbiMacro();

    for (const [envKey, entries] of Object.entries(DOMAIN_MATRIX)) {
      const domains: Partial<Record<ProviderDomain, DomainStatus>> = {};
      for (const { domain } of entries) {
        let healthy = false;
        if (envKey === 'NSEPYTHON') {
          const probeKey = domain === 'quote' ? 'index_quote' : domain;
          healthy = domainHealthy(nsepython?.domains?.[probeKey]?.status);
        } else if (envKey === 'JUGAD_DATA') {
          healthy = domainHealthy(jugaad?.domains?.[domain]?.status);
        } else if (envKey === 'INDIANAPI_KEY') {
          healthy = Boolean(process.env.INDIANAPI_KEY);
        } else if (envKey === 'YAHOO') {
          healthy = domain === 'quote' || domain === 'historical' || domain === 'index';
        } else if (envKey === 'FUNDAMENTALS_AUTOMATIC') {
          healthy = true;
        } else if (envKey === 'CSV_FALLBACK') {
          healthy = true;
        } else if (envKey === 'RBI_PUBLIC') {
          healthy = rbiMacro.healthy;
        }
        domains[domain] = { healthy };
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
