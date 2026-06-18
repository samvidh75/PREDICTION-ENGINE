import { execFile } from 'child_process';
import type { NormalizedCandle, ProviderHealth, ProviderId } from '../marketData/types';
import type { NormalizedQuote, PublicProviderId, PublicMarketDataProvider } from './types';

const BRIDGE_SCRIPT = 'scripts/probe-nsepython-provider.py';
const BRIDGE_TIMEOUT = 30_000;

class NsePythonProviderError extends Error {
  constructor(
    public readonly safeCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'NsePythonProviderError';
  }
}

interface NsePythonProbeResult {
  probe: string;
  healthy_probes: number;
  total_probes: number;
  results: Record<string, { status: string; elapsed?: number; detail: string }>;
}

function runProbe(): Promise<NsePythonProbeResult> {
  return new Promise((resolve, reject) => {
    execFile('python3', [BRIDGE_SCRIPT], {
      timeout: BRIDGE_TIMEOUT,
      maxBuffer: 5 * 1024 * 1024,
    }, (error, stdout) => {
      if (error && !stdout) {
        reject(new NsePythonProviderError('provider_unreachable', `nsepython bridge error: ${error.message}`));
        return;
      }
      try {
        const data = JSON.parse(stdout) as NsePythonProbeResult;
        resolve(data);
      } catch {
        reject(new NsePythonProviderError('provider_error', 'nsepython bridge returned invalid JSON'));
      }
    });
  });
}

export class NsePythonProvider implements PublicMarketDataProvider {
  readonly providerId: PublicProviderId = 'nsepython';

  async getQuote(_symbol: string): Promise<NormalizedQuote> {
    throw new NsePythonProviderError(
      'provider_error',
      'nsepython equity quote endpoint is blocked by NSE; use index quote or jugaad-data instead',
    );
  }

  async getHistoricalDaily(_symbol: string, _fromDate: string, _toDate: string): Promise<NormalizedCandle[]> {
    throw new NsePythonProviderError(
      'provider_error',
      'nsepython historical data is unreliable and often blocked by NSE; use jugaad-data instead',
    );
  }

  async getIndexQuote(indexName: string): Promise<Record<string, unknown>> {
    const probe = await runProbe();
    const nifty = probe.results?.nifty_quote;
    if (!nifty || nifty.status !== 'healthy') {
      throw new NsePythonProviderError('provider_error', 'nsepython index quote unavailable');
    }
    return { index: indexName, detail: nifty.detail };
  }

  async getBhavcopy(date: string): Promise<unknown[]> {
    const probe = await runProbe();
    const bhav = probe.results?.bhavcopy;
    if (!bhav || bhav.status !== 'healthy') {
      throw new NsePythonProviderError('provider_error', 'nsepython bhavcopy unavailable');
    }
    return [{ date, detail: bhav.detail }];
  }

  async getMarketStatus(): Promise<Record<string, unknown>> {
    const probe = await runProbe();
    return { healthy_probes: probe.healthy_probes, total_probes: probe.total_probes };
  }

  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const probe = await runProbe();
      const latency = Date.now() - start;
      if (probe.healthy_probes > 0) {
        return { provider: 'nsepython' as ProviderId, status: 'healthy', latencyMs: latency, checkedAt: new Date().toISOString() };
      }
      return { provider: 'nsepython' as ProviderId, status: 'provider_error', latencyMs: latency, checkedAt: new Date().toISOString() };
    } catch {
      return { provider: 'nsepython' as ProviderId, status: 'provider_unreachable', latencyMs: Date.now() - start, checkedAt: new Date().toISOString() };
    }
  }

  async checkDomainHealth(): Promise<Record<string, { healthy: boolean; detail?: string }>> {
    try {
      const probe = await runProbe();
      const domain = (name: string, fallback: string) => {
        const info = probe.results?.[name] ?? (probe as any).domains?.[name];
        return {
          healthy: info?.status === 'healthy',
          detail: info?.detail ?? fallback,
        };
      };
      return {
        index_quote: domain('nifty_quote', 'NSEPython index quote probe unavailable.'),
        bhavcopy: domain('bhavcopy', 'NSEPython bhavcopy probe unavailable.'),
        index: domain('index_history', 'NSEPython index history probe unavailable.'),
        historical: domain('historical', 'NSEPython historical probe unavailable.'),
        quote: { healthy: false, detail: 'Equity quote scraping is not used; NSE restrictions are labelled instead of bypassed.' },
      };
    } catch {
      return {
        index_quote: { healthy: false, detail: 'NSEPython probe failed.' },
        bhavcopy: { healthy: false, detail: 'NSEPython probe failed.' },
        index: { healthy: false, detail: 'NSEPython probe failed.' },
        historical: { healthy: false, detail: 'NSEPython probe failed.' },
        quote: { healthy: false, detail: 'Equity quote scraping is not used; NSE restrictions are labelled instead of bypassed.' },
      };
    }
  }
}
