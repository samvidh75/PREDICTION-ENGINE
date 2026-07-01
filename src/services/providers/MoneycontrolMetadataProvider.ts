// src/services/providers/MoneycontrolMetadataProvider.ts
// MetadataProvider implementation using Moneycontrol company pages.

import { MetadataProvider } from './MetadataProvider';
import { ProviderAuthorizationConfig } from './authorization/types';
import { authorizeProviderIngestion, getProviderUserAgent } from './authorization/ProviderAuthorization';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';
import { normalizeSymbol } from './normalization/FinancialNormalization';

import type { CompanyMetadata } from '../data/types';

const PROVIDER_NAME = 'moneycontrol-metadata';
const REQUEST_TIMEOUT_MS = 10_000;

const CACHE_POLICY = {
  ttlMs: 300_000,
  staleWindowMs: 300_000,
  negativeTtlMs: 60_000,
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

function extractMetaField(pattern: RegExp, html: string): string | null {
  const m = html.match(pattern);
  if (m) {
    const v = m[1].trim();
    if (v && v !== '&nbsp;' && v !== '-') return v;
  }
  return null;
}

export class MoneycontrolMetadataProvider implements MetadataProvider {
  static readonly PROVIDER_ID = 'moneycontrol-metadata';
  static readonly BASE_URL = 'https://www.moneycontrol.com';
  static readonly REQUESTS_PER_MINUTE = 6;
  static readonly CONCURRENCY_LIMIT = 1;

  private authConfig?: ProviderAuthorizationConfig;

  constructor(authConfig?: ProviderAuthorizationConfig) {
    this.authConfig = authConfig;
  }

  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const cleanSymbol = normalizeSymbol(symbol);
    const slug = makeCompanySlug(cleanSymbol);

    if (this.authConfig) {
      const gate = authorizeProviderIngestion(PROVIDER_NAME, this.authConfig);
      if (!gate.passed) {
        throw new Error(`MoneycontrolMetadataProvider: ${gate.reason}`);
      }
    }

    const userAgent = this.authConfig
      ? getProviderUserAgent(this.authConfig)
      : `Lensory/${PROVIDER_NAME} (research)`;

    const url = `${MoneycontrolMetadataProvider.BASE_URL}/company/${slug}/${cleanSymbol}`;

    const broker = await getSharedProviderRequestBroker();
    const html = await this.fetchPage(broker, cleanSymbol, url, userAgent);

    const companyName =
      extractMetaField(
        /<h1[^>]*class="[^"]*company[^"]*"[^>]*>([^<]+)<\/h1>/i,
        html,
      ) ||
      extractMetaField(
        /<title>([^<]+?)\s*-\s*Moneycontrol/i,
        html,
      ) ||
      cleanSymbol;

    const sector =
      extractMetaField(
        /Sector[\s\S]{0,50}?<a[^>]*>\s*([^<]+?)\s*<\/a>/i,
        html,
      ) || '';

    const industry =
      extractMetaField(
        /Industry[\s\S]{0,50}?<a[^>]*>\s*([^<]+?)\s*<\/a>/i,
        html,
      ) || '';

    const bseCode =
      extractMetaField(
        /BSE[\s\S]{0,50}?(\d{5,6})/i,
        html,
      ) || null;

    const nseSymbol =
      extractMetaField(
        /NSE[\s\S]{0,50}?([A-Z]{2,10})/i,
        html,
      ) || null;

    const isin =
      extractMetaField(
        /ISIN[\s\S]{0,50}?([A-Z]{2}\d{10})/i,
        html,
      ) || null;

    return {
      symbol: cleanSymbol,
      companyName,
      sector,
      industry,
      exchange: 'NSE',
      marketCap: undefined,
      currency: 'INR',
      website: '',
      isin,
      bseCode,
      nseSymbol,
      enrichmentSource: 'provider',
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
      'metadata',
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
        `MoneycontrolMetadataProvider: metadata unavailable for ${symbol} (${result.statusClass})`,
      );
    }

    return result.data;
  }
}
