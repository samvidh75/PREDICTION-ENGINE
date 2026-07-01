// src/services/providers/MoneycontrolCorporateActionsProvider.ts
// Provider for corporate actions (dividends, splits, bonuses) from Moneycontrol.

import { ProviderAuthorizationConfig } from './authorization/types';
import { authorizeProviderIngestion, getProviderUserAgent } from './authorization/ProviderAuthorization';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';
import { MoneycontrolParser } from './parsers/MoneycontrolParser';
import { parseIndianNumber, parseDateOrNull, normalizeSymbol } from './normalization/FinancialNormalization';

const PROVIDER_NAME = 'moneycontrol-corporate-actions';
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

export class MoneycontrolCorporateActionsProvider {
  static readonly PROVIDER_ID = 'moneycontrol-corporate-actions';
  static readonly BASE_URL = 'https://www.moneycontrol.com';
  static readonly REQUESTS_PER_MINUTE = 6;
  static readonly CONCURRENCY_LIMIT = 1;

  private authConfig?: ProviderAuthorizationConfig;
  private parser: MoneycontrolParser;

  constructor(authConfig?: ProviderAuthorizationConfig) {
    this.authConfig = authConfig;
    this.parser = new MoneycontrolParser();
  }

  async getCorporateActions(symbol: string): Promise<{
    dividends: Array<{ exDate: string; dividendPerShare: number; type: string }>;
    splits: Array<{ exDate: string; ratio: string }>;
    bonuses: Array<{ exDate: string; ratio: string }>;
  }> {
    const cleanSymbol = normalizeSymbol(symbol);
    const slug = makeCompanySlug(cleanSymbol);

    if (this.authConfig) {
      const gate = authorizeProviderIngestion(PROVIDER_NAME, this.authConfig);
      if (!gate.passed) {
        throw new Error(`MoneycontrolCorporateActionsProvider: ${gate.reason}`);
      }
    }

    const userAgent = this.authConfig
      ? getProviderUserAgent(this.authConfig)
      : `Lensory/${PROVIDER_NAME} (research)`;

    const url = `${MoneycontrolCorporateActionsProvider.BASE_URL}/company/${slug}/corporate-actions/${cleanSymbol}`;

    const broker = await getSharedProviderRequestBroker();
    const html = await this.fetchPage(broker, cleanSymbol, url, userAgent);
    const parsed = this.parser.parseCorporateActions(html);

    return {
      dividends: parsed.dividends.map((d) => ({
        exDate: parseDateOrNull(d.exDate) || d.exDate,
        dividendPerShare: parseIndianNumber(d.dividendPerShare) ?? 0,
        type: d.type,
      })),
      splits: parsed.splits.map((s) => ({
        exDate: parseDateOrNull(s.exDate) || s.exDate,
        ratio: s.ratio,
      })),
      bonuses: parsed.bonuses.map((b) => ({
        exDate: parseDateOrNull(b.exDate) || b.exDate,
        ratio: b.ratio,
      })),
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
        `MoneycontrolCorporateActionsProvider: corporate-actions unavailable for ${symbol} (${result.statusClass})`,
      );
    }

    return result.data;
  }
}
