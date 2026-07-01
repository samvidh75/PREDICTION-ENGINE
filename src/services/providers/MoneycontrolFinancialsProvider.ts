// src/services/providers/MoneycontrolFinancialsProvider.ts
// Moneycontrol financials provider — scrapes publicly available financial data.

import { FinancialProvider, FinancialData } from './FinancialProvider';
import { ProviderAuthorizationConfig } from './authorization/types';
import { authorizeProviderIngestion, getProviderUserAgent } from './authorization/ProviderAuthorization';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';
import { MoneycontrolParser } from './parsers/MoneycontrolParser';
import {
  parseIndianNumber,
  parsePercentageFraction,
  normalizeSymbol,
} from './normalization/FinancialNormalization';

const PROVIDER_NAME = 'moneycontrol-financials';
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

export class MoneycontrolFinancialsProvider implements FinancialProvider {
  static readonly PROVIDER_ID = 'moneycontrol-financials';
  static readonly BASE_URL = 'https://www.moneycontrol.com';
  static readonly REQUESTS_PER_MINUTE = 6;
  static readonly CONCURRENCY_LIMIT = 1;

  private authConfig?: ProviderAuthorizationConfig;
  private parser: MoneycontrolParser;

  constructor(authConfig?: ProviderAuthorizationConfig) {
    this.authConfig = authConfig;
    this.parser = new MoneycontrolParser();
  }

  async getFinancials(symbol: string): Promise<FinancialData> {
    const cleanSymbol = normalizeSymbol(symbol);
    const slug = makeCompanySlug(cleanSymbol);

    if (this.authConfig) {
      const gate = authorizeProviderIngestion(PROVIDER_NAME, this.authConfig);
      if (!gate.passed) {
        throw new Error(`MoneycontrolFinancialsProvider: ${gate.reason}`);
      }
    }

    const userAgent = this.authConfig
      ? getProviderUserAgent(this.authConfig)
      : `Lensory/${PROVIDER_NAME} (research)`;

    const ratiosUrl = `${MoneycontrolFinancialsProvider.BASE_URL}/financials/${slug}/ratios/${cleanSymbol}`;

    const broker = await getSharedProviderRequestBroker();
    const html = await this.fetchPage(broker, cleanSymbol, ratiosUrl, userAgent, 'key_ratios');

    const parsed = this.parser.parseFinancialsPage(html);
    const ratios = parsed.ratios;

    const pe = parseIndianNumber(ratios['P/E'] || '');
    const pb = parseIndianNumber(ratios['P/B'] || '');
    const eps = parseIndianNumber(ratios['EPS'] || '');
    const dy = parsePercentageFraction(
      (ratios['Dividend Yield'] || '').endsWith('%')
        ? ratios['Dividend Yield']
        : `${ratios['Dividend Yield']}%`,
    );
    const roeNum = parsePercentageFraction(
      (ratios['ROE'] || '').endsWith('%')
        ? ratios['ROE']
        : `${ratios['ROE']}%`,
    );
    const roceNum = parsePercentageFraction(
      (ratios['ROCE'] || '').endsWith('%')
        ? ratios['ROCE']
        : `${ratios['ROCE']}%`,
    );
    const de = parseIndianNumber(ratios['Debt to Equity'] || '');
    const cr = parseIndianNumber(ratios['Current Ratio'] || '');
    const om = parsePercentageFraction(
      (ratios['Operating Margin'] || '').endsWith('%')
        ? ratios['Operating Margin']
        : `${ratios['Operating Margin']}%`,
    );
    const nm = parsePercentageFraction(
      (ratios['Net Margin'] || '').endsWith('%')
        ? ratios['Net Margin']
        : `${ratios['Net Margin']}%`,
    );
    const gm = parsePercentageFraction(
      (ratios['Gross Margin'] || '').endsWith('%')
        ? ratios['Gross Margin']
        : `${ratios['Gross Margin']}%`,
    );
    const revG = parsePercentageFraction(
      (ratios['Revenue Growth'] || '').endsWith('%')
        ? ratios['Revenue Growth']
        : `${ratios['Revenue Growth']}%`,
    );
    const profitG = parsePercentageFraction(
      (ratios['Profit Growth'] || '').endsWith('%')
        ? ratios['Profit Growth']
        : `${ratios['Profit Growth']}%`,
    );
    const evEb = parseIndianNumber(ratios['EV/EBITDA'] || '');

    return {
      symbol: cleanSymbol,
      source: MoneycontrolFinancialsProvider.PROVIDER_ID,
      retrievedAt: new Date().toISOString(),
      marketCap: undefined,
      peRatio: pe ?? undefined,
      pbRatio: pb ?? undefined,
      evEbitda: evEb ?? undefined,
      eps: eps ?? undefined,
      dividendYield: dy ?? undefined,
      roe: roeNum ?? undefined,
      roic: roceNum ?? undefined,
      debtToEquity: de ?? undefined,
      currentRatio: cr ?? undefined,
      operatingMargin: om ?? undefined,
      netMargin: nm ?? undefined,
      grossMargin: gm ?? undefined,
      revenueGrowth: revG ?? undefined,
      profitGrowth: profitG ?? undefined,
      _raw: {
        ratios: parsed.ratios,
        profitLoss: parsed.profitLoss,
        balanceSheet: parsed.balanceSheet,
        cashFlow: parsed.cashFlow,
      },
    };
  }

  private async fetchPage(
    broker: Awaited<ReturnType<typeof getSharedProviderRequestBroker>>,
    symbol: string,
    url: string,
    userAgent: string,
    operation: 'key_ratios' | 'balance_sheet',
  ): Promise<string> {
    const result = await broker.execute<string>(
      PROVIDER_NAME,
      operation,
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
        `MoneycontrolFinancialsProvider: ${operation} unavailable for ${symbol} (${result.statusClass})`,
      );
    }

    return result.data;
  }
}
