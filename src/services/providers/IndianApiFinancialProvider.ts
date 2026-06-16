import { FinancialProvider, FinancialData } from './FinancialProvider';
import { getSharedProviderRequestBroker } from './broker/createProviderRequestBroker';
import { getCurrentIngestionRunId } from '../acquisition/IngestionRunContext';

const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_POLICY = { ttlMs: 3_600_000, staleWindowMs: 3_600_000, negativeTtlMs: 120_000 };

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function percentToFraction(value: unknown): number | undefined {
  const n = finiteNumber(value);
  if (n === undefined) return undefined;
  return n / 100;
}

function croreToInr(value: unknown): number | undefined {
  const n = finiteNumber(value);
  if (n === undefined) return undefined;
  return n * 10_000_000;
}

export type ProviderErrorClass =
  | 'accepted'
  | 'missing_key'
  | 'invalid_key'
  | 'unauthorized'
  | 'subscription_blocked'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'unsupported_symbol'
  | 'unsupported_field'
  | 'malformed_response'
  | 'network_error'
  | 'unknown';

function classifyError(statusCode: number, statusClass: string): ProviderErrorClass {
  if (statusCode === 401) return 'invalid_key';
  if (statusCode === 403) return 'subscription_blocked';
  if (statusCode === 429) return 'rate_limited';
  if (statusCode === 404) return 'unsupported_symbol';
  if (statusCode >= 500) return 'network_error';
  if (statusClass === 'unauthorized') return 'invalid_key';
  if (statusClass === 'rate_limited') return 'rate_limited';
  if (statusClass === 'not_found') return 'unsupported_symbol';
  if (statusClass === 'network_error' || statusClass === 'timeout') return 'network_error';
  if (statusClass === 'server_error') return 'network_error';
  return 'unknown';
}

export class IndianApiFinancialProvider implements FinancialProvider {
  static readonly PROVIDER_ID = 'indianapi-financials';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || (typeof process !== 'undefined' && process.env?.INDIANAPI_KEY) || '';
  }

  async getFinancials(symbol: string): Promise<FinancialData> {
    if (!this.apiKey) {
      const err = new Error('IndianApiFinancials: INDIANAPI_KEY not set');
      (err as any).errorClass = 'missing_key';
      throw err;
    }

    const clean = symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
    const broker = await getSharedProviderRequestBroker();

    const [fundamentalsResult, stockResult] = await Promise.allSettled([
      this.fetchFundamentals(broker, clean),
      this.fetchStockMetrics(broker, clean),
    ]);

    const fundamentals = fundamentalsResult.status === 'fulfilled' ? fundamentalsResult.value : null;
    const stockMetrics = stockResult.status === 'fulfilled' ? stockResult.value : null;

    if (!fundamentals && !stockMetrics) {
      const fundErr = fundamentalsResult.status === 'rejected' ? fundamentalsResult.reason : null;
      const stockErr = stockResult.status === 'rejected' ? stockResult.reason : null;
      const err = new Error(
        `IndianApiFinancials: all endpoints failed for ${clean}: ` +
        `${fundErr?.message || 'no data'}; ${stockErr?.message || 'no data'}`,
      );
      (err as any).errorClass = fundErr?.errorClass || stockErr?.errorClass || 'unknown';
      throw err;
    }

    const fund = fundamentals || {};
    const stock = stockMetrics || {};

    const marketCap = croreToInr(fund.market_cap) ?? croreToInr(stock.marketCapCrore);
    const roe = percentToFraction(fund.roe ?? fund.return_on_equity);
    const roa = percentToFraction(fund.roa);
    const roce = percentToFraction(fund.roce);
    const grossMargin = percentToFraction(fund.gross_margin);
    const operatingMargin = percentToFraction(fund.operating_margin ?? fund.opm);
    const netMargin = percentToFraction(fund.net_profit_margin ?? fund.npm);
    const revenueGrowth = percentToFraction(fund.revenue_growth_3y ?? fund.revenue_growth ?? fund.sales_growth_3y);
    const epsGrowth = percentToFraction(fund.eps_growth_3y ?? fund.earnings_growth);
    const profitGrowth = percentToFraction(fund.profit_growth_3y ?? fund.net_profit_growth_3y);
    const fcfGrowth = percentToFraction(fund.fcf_growth_3y);
    const dividendYield = percentToFraction(fund.dividend_yield);
    const debtToEquity = finiteNumber(fund.debt_to_equity);
    const currentRatio = finiteNumber(fund.current_ratio);
    const peRatio = finiteNumber(fund.pe_ratio);
    const pbRatio = finiteNumber(fund.pb_ratio);
    const eps = finiteNumber(fund.eps);
    const beta = finiteNumber(fund.beta);
    const evEbitda = finiteNumber(fund.ev_ebitda ?? fund.ev_to_ebitda);
    const interestCoverage = finiteNumber(fund.interest_coverage);

    const freeCashFlow = finiteNumber(fund.free_cash_flow ?? fund.fcf);
    const fcfYield = (freeCashFlow !== undefined && marketCap !== undefined && marketCap > 0)
      ? freeCashFlow / marketCap
      : finiteNumber(fund.fcf_yield);

    const totalAssets = croreToInr(fund.total_assets);
    const totalLiabilities = croreToInr(fund.total_liabilities);
    const totalEquity = croreToInr(fund.total_equity);

    const availableFields = [
      'peRatio', 'pbRatio', 'eps', 'dividendYield', 'beta', 'marketCap',
      'roe', 'roa', 'roic', 'evEbitda', 'debtToEquity', 'currentRatio',
      'grossMargin', 'operatingMargin', 'netMargin', 'revenueGrowth',
      'epsGrowth', 'profitGrowth', 'fcfGrowth', 'fcfYield', 'interestCoverage',
      'totalAssets', 'totalLiabilities', 'totalEquity',
    ].filter(f => {
      const val = ({
        peRatio, pbRatio, eps, dividendYield, beta, marketCap,
        roe, roa, roic: roce, evEbitda, debtToEquity, currentRatio,
        grossMargin, operatingMargin, netMargin, revenueGrowth,
        epsGrowth, profitGrowth, fcfGrowth, fcfYield, interestCoverage,
        totalAssets, totalLiabilities, totalEquity,
      } as Record<string, unknown>)[f];
      return val !== undefined && val !== null;
    });

    if (availableFields.length === 0) {
      const err = new Error(`IndianApiFinancials: no financial fields returned for ${clean}`);
      (err as any).errorClass = 'unsupported_field';
      throw err;
    }

    return {
      symbol: clean,
      source: 'indianapi',
      periodEnd: fund.period_end ?? fund.reporting_date ?? undefined,
      snapshotDate: new Date().toISOString().split('T')[0],
      retrievedAt: new Date().toISOString(),

      marketCap,
      peRatio,
      pbRatio,
      eps,
      dividendYield,
      beta,
      roe,
      roa,
      roic: roce,
      roce,
      evEbitda,
      debtToEquity,
      currentRatio,
      interestCoverage,
      grossMargin,
      operatingMargin,
      netMargin,
      revenueGrowth,
      epsGrowth,
      profitGrowth,
      fcfGrowth,
      fcfYield,
      freeCashFlow,
      totalAssets,
      totalLiabilities,
      totalEquity,

      _sources: {
        indianapi: 'IndianAPI /stock_fundamentals + /stock',
        fieldsAvailable: availableFields.join(','),
      },
      _raw: {
        fundamentals: fund,
        stockMetrics: stock,
      },
    };
  }

  private async fetchFundamentals(
    broker: Awaited<ReturnType<typeof getSharedProviderRequestBroker>>,
    symbol: string,
  ): Promise<Record<string, any>> {
    const url = `https://stock.indianapi.in/stock_fundamentals?name=${encodeURIComponent(symbol)}`;
    const result = await broker.execute('indianapi', 'financials', symbol, { name: symbol }, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const resp = await fetch(url, {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        return {
          data: await this.readJsonSafely(resp),
          status: resp.status,
          headers: headersToRecord(resp.headers),
        };
      } finally {
        clearTimeout(timeout);
      }
    }, {
      cachePolicy: CACHE_POLICY,
      runId: getCurrentIngestionRunId(),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    if (!result.success || result.data === null) {
      const err = new Error(`IndianApiFinancials fundamentals unavailable for ${symbol}: ${result.statusClass}`);
      (err as any).errorClass = classifyError(result.error?.statusCode ?? 0, result.statusClass ?? '');
      throw err;
    }

    return result.data?.fundamentals ?? result.data ?? {};
  }

  private async fetchStockMetrics(
    broker: Awaited<ReturnType<typeof getSharedProviderRequestBroker>>,
    symbol: string,
  ): Promise<Record<string, any>> {
    const url = `https://stock.indianapi.in/stock?name=${encodeURIComponent(symbol)}`;
    const result = await broker.execute('indianapi', 'metadata', symbol, { name: symbol }, async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const resp = await fetch(url, {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        return {
          data: await this.readJsonSafely(resp),
          status: resp.status,
          headers: headersToRecord(resp.headers),
        };
      } finally {
        clearTimeout(timeout);
      }
    }, {
      cachePolicy: CACHE_POLICY,
      runId: getCurrentIngestionRunId(),
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    if (!result.success || result.data === null) {
      const err = new Error(`IndianApiFinancials stock metrics unavailable for ${symbol}: ${result.statusClass}`);
      (err as any).errorClass = classifyError(result.error?.statusCode ?? 0, result.statusClass ?? '');
      throw err;
    }

    const data = result.data;
    const s = data.stockDetailsReusableData || {};
    const marketCapCrore = finiteNumber(s.marketCap);

    const extracted: Record<string, any> = { marketCapCrore };

    if (data.keyMetrics && typeof data.keyMetrics === 'object') {
      for (const [category, items] of Object.entries(data.keyMetrics)) {
        if (Array.isArray(items)) {
          for (const item of items as any[]) {
            if (item?.key && item?.value !== undefined) {
              extracted[item.key] = item.value;
            }
          }
        }
      }
    }

    return extracted;
  }

  private async readJsonSafely(resp: Response): Promise<any> {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }
}
