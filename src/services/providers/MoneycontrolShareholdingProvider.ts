// src/services/providers/MoneycontrolShareholdingProvider.ts
// Provider for shareholding pattern data from Moneycontrol.

import { ProviderAuthorizationConfig } from './authorization/types';
import { authorizeProviderIngestion, getProviderUserAgent } from './authorization/ProviderAuthorization';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';
import { MoneycontrolParser } from './parsers/MoneycontrolParser';
import { parsePercentageFraction, normalizeSymbol } from './normalization/FinancialNormalization';

const PROVIDER_NAME = 'moneycontrol-shareholding';
const REQUEST_TIMEOUT_MS = 10_000;

const CACHE_POLICY = {
  ttlMs: 3_600_000,
  staleWindowMs: 3_600_000,
  negativeTtlMs: 120_000,
} as const;

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function makeCompanySlug(symbol: string): string {
  return normalizeSymbol(symbol).toLowerCase().replace(/\s+/g, '-');
}

export class MoneycontrolShareholdingProvider {
  static readonly PROVIDER_ID = 'moneycontrol-shareholding';
  static readonly BASE_URL = 'https://www.moneycontrol.com';
  static readonly REQUESTS_PER_MINUTE = 6;
  static readonly CONCURRENCY_LIMIT = 1;

  private authConfig?: ProviderAuthorizationConfig;
  private parser: MoneycontrolParser;

  constructor(authConfig?: ProviderAuthorizationConfig) {
    this.authConfig = authConfig;
    this.parser = new MoneycontrolParser();
  }

  async getShareholding(symbol: string): Promise<{
    promoterHolding: number | null;
    institutionalHolding: number | null;
    publicHolding: number | null;
  }> {
    const cleanSymbol = normalizeSymbol(symbol);
    const slug = makeCompanySlug(cleanSymbol);

    if (this.authConfig) {
      const gate = authorizeProviderIngestion(PROVIDER_NAME, this.authConfig);
      if (!gate.passed) {
        throw new Error(`MoneycontrolShareholdingProvider: ${gate.reason}`);
      }
    }

    const userAgent = this.authConfig
      ? getProviderUserAgent(this.authConfig)
      : `Lensory/${PROVIDER_NAME} (research)`;

    const url = `${MoneycontrolShareholdingProvider.BASE_URL}/company/${slug}/shareholding/${cleanSymbol}`;

    const broker = await getSharedProviderRequestBroker();
    const html = await this.fetchPage(broker, cleanSymbol, url, userAgent);
    const parsed = this.parser.parseShareholding(html);

    const pH = parsed.promoterHolding;
    const iH = parsed.institutionalHolding;
    const pHold = parsed.publicHolding;
    return {
      promoterHolding: parsePercentageFraction(
        pH && pH.endsWith('%') ? pH : pH ? `${pH}%` : ''
      ),
      institutionalHolding: parsePercentageFraction(
        iH && iH.endsWith('%') ? iH : iH ? `${iH}%` : ''
      ),
      publicHolding: parsePercentageFraction(
        pHold && pHold.endsWith('%') ? pHold : pHold ? `${pHold}%` : ''
      ),
    };
  }

  private async fetchPage(
    broker: Awaited<ReturnType<typeof getSharedProviderRequestBroker>>,
    symbol: string,
    url: string,
    userAgent: string,
  ): Promise<string> {
    const result = await broker.execute<string>(
      PROVIDER_NAME,
      'key_ratios',
      symbol,
      { url },
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
          const resp = await fetch(url, {
            headers: {
              'User-Agent': userAgent,
              Accept: 'text/html,application/xhtml+xml',
            },
            signal: controller.signal,
          });
          const text = await resp.text();
          return {
            data: text,
            status: resp.status,
            headers: headersToRecord(resp.headers),
            sourceAsOf: new Date().toISOString(),
          };
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        cachePolicy: CACHE_POLICY,
        runId: getCurrentIngestionRunId(),
        timeoutMs: REQUEST_TIMEOUT_MS,
      },
    );

    if (!result.success || result.data === null) {
      throw new Error(
        `MoneycontrolShareholdingProvider: shareholding unavailable for ${symbol} (${result.statusClass})`,
      );
    }

    return result.data;
  }
}
