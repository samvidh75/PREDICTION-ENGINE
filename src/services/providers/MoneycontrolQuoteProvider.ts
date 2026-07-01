// src/services/providers/MoneycontrolQuoteProvider.ts
// PriceProvider implementation using Moneycontrol quote pages.

import { PriceProvider } from './PriceProvider';
import { ProviderAuthorizationConfig } from './authorization/types';
import { authorizeProviderIngestion, getProviderUserAgent } from './authorization/ProviderAuthorization';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';
import { MoneycontrolParser } from './parsers/MoneycontrolParser';
import { parseIndianNumber, normalizeSymbol } from './normalization/FinancialNormalization';

import type { StockQuote } from '../data/types';

const PROVIDER_NAME = 'moneycontrol-quote';
const REQUEST_TIMEOUT_MS = 10_000;

const CACHE_POLICY = {
  ttlMs: 30_000,
  staleWindowMs: 30_000,
  negativeTtlMs: 30_000,
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

export class MoneycontrolQuoteProvider implements PriceProvider {
  static readonly PROVIDER_ID = 'moneycontrol-quote';
  static readonly BASE_URL = 'https://www.moneycontrol.com';
  static readonly REQUESTS_PER_MINUTE = 6;
  static readonly CONCURRENCY_LIMIT = 1;

  private authConfig?: ProviderAuthorizationConfig;
  private parser: MoneycontrolParser;

  constructor(authConfig?: ProviderAuthorizationConfig) {
    this.authConfig = authConfig;
    this.parser = new MoneycontrolParser();
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const cleanSymbol = normalizeSymbol(symbol);
    const slug = makeCompanySlug(cleanSymbol);

    if (this.authConfig) {
      const gate = authorizeProviderIngestion(PROVIDER_NAME, this.authConfig);
      if (!gate.passed) {
        throw new Error(`MoneycontrolQuoteProvider: ${gate.reason}`);
      }
    }

    const userAgent = this.authConfig
      ? getProviderUserAgent(this.authConfig)
      : `Lensory/${PROVIDER_NAME} (research)`;

    const url = `${MoneycontrolQuoteProvider.BASE_URL}/india/stockpricequote/${slug}/${cleanSymbol}`;

    const broker = await getSharedProviderRequestBroker();
    const html = await this.fetchPage(broker, cleanSymbol, url, userAgent);
    const parsed = this.parser.parseQuotePage(html);

    const price = parseIndianNumber(parsed.price) ?? 0;
    const change = parseIndianNumber(parsed.change) ?? 0;
    const percentChange = parseIndianNumber(parsed.percentChange) ?? 0;
    const open = parseIndianNumber(parsed.open);
    const high = parseIndianNumber(parsed.high);
    const low = parseIndianNumber(parsed.low);
    const volume = parseIndianNumber(parsed.volume);

    if (price === 0) {
      throw new Error(
        `MoneycontrolQuoteProvider: could not parse price for ${symbol} from page`,
      );
    }

    return {
      symbol: cleanSymbol,
      exchange: 'NSE',
      price,
      change,
      changePercent: percentChange,
      volume: volume ?? undefined,
      updatedAt: new Date().toISOString(),
      retrievedAt: new Date().toISOString(),
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
      'quote',
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
        `MoneycontrolQuoteProvider: quote unavailable for ${symbol} (${result.statusClass})`,
      );
    }

    return result.data;
  }
}
