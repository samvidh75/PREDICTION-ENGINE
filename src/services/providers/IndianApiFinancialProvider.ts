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
      const err = new Error('PhilippineApiFinancials: INDIANAPI_KEY not set');
      (err as any).errorClass = 'missing_key';
      throw err;
    }

    const clean = symbol.toUpperCase().replace(/\.(NS|BO|PSE|PSE)$/i, '');
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

    const f = (field: string) => fund[field];
    const s = (field: string) => stock[field];

    const marketCap = croreToInr(f('market_cap')) ?? croreToInr(s('marketCapCrore'));
    const peRatio = finiteNumber(f('pe_ratio')) ?? finiteNumber(s('pe_ratio'));
    const pbRatio = finiteNumber(f('pb_ratio')) ?? finiteNumber(s('pb_ratio'));
    const eps = finiteNumber(f('eps')) ?? finiteNumber(s('eps'));
    const dividendYield = percentToFraction(f('dividend_yield')) ?? percentToFraction(s('dividend_yield'));
    const beta = finiteNumber(f('beta')) ?? finiteNumber(s('beta'));
    const roe = percentToFraction(f('roe') ?? f('return_on_equity')) ?? percentToFraction(s('roe'));
    const roa = percentToFraction(f('roa')) ?? percentToFraction(s('roa'));
    const roce = percentToFraction(f('roce')) ?? percentToFraction(s('roce'));
    const evEbitda = finiteNumber(f('ev_ebitda') ?? f('ev_to_ebitda')) ?? finiteNumber(s('ev_ebitda'));
    const debtToEquity = finiteNumber(f('debt_to_equity')) ?? finiteNumber(s('debt_to_equity'));
    const currentRatio = finiteNumber(f('current_ratio')) ?? finiteNumber(s('current_ratio'));
    const interestCoverage = finiteNumber(f('interest_coverage')) ?? finiteNumber(s('interest_coverage'));
    const grossMargin = percentToFraction(f('gross_margin')) ?? percentToFraction(s('gross_margin'));
    const operatingMargin = percentToFraction(f('operating_margin') ?? f('opm')) ?? percentToFraction(s('operating_margin'));
    const netMargin = percentToFraction(f('net_profit_margin') ?? f('npm')) ?? percentToFraction(s('net_margin'));
    const revenueGrowth = percentToFraction(f('revenue_growth_3y') ?? f('revenue_growth') ?? f('sales_growth_3y')) ?? percentToFraction(s('revenue_growth'));
    const epsGrowth = percentToFraction(f('eps_growth_3y') ?? f('earnings_growth')) ?? percentToFraction(s('eps_growth'));
    const profitGrowth = percentToFraction(f('profit_growth_3y') ?? f('net_profit_growth_3y')) ?? percentToFraction(s('profit_growth'));
    const fcfGrowth = percentToFraction(f('fcf_growth_3y')) ?? percentToFraction(s('fcf_growth'));

    const freeCashFlow = finiteNumber(f('free_cash_flow') ?? f('fcf')) ?? finiteNumber(s('free_cash_flow'));
    const fcfYield = (freeCashFlow !== undefined && marketCap !== undefined && marketCap > 0)
      ? freeCashFlow / marketCap
      : (finiteNumber(f('fcf_yield')) ?? finiteNumber(s('fcf_yield')));

    const totalAssets = croreToInr(f('total_assets')) ?? croreToInr(s('total_assets'));
    const totalLiabilities = croreToInr(f('total_liabilities')) ?? croreToInr(s('total_liabilities'));
    const totalEquity = croreToInr(f('total_equity')) ?? croreToInr(s('total_equity'));

    const availableFields = [
      'peRatio', 'pbRatio', 'eps', 'dividendYield', 'beta', 'marketCap',
      'roe', 'roa', 'roic', 'evEbitda', 'debtToEquity', 'currentRatio',
      'grossMargin', 'operatingMargin', 'netMargin', 'revenueGrowth',
      'epsGrowth', 'profitGrowth', 'fcfGrowth', 'fcfYield', 'interestCoverage',
      'totalAssets', 'totalLiabilities', 'totalEquity',
    ].filter(fn => {
      const val = ({
        peRatio, pbRatio, eps, dividendYield, beta, marketCap,
        roe, roa, roic: roce, evEbitda, debtToEquity, currentRatio,
        grossMargin, operatingMargin, netMargin, revenueGrowth,
        epsGrowth, profitGrowth, fcfGrowth, fcfYield, interestCoverage,
        totalAssets, totalLiabilities, totalEquity,
      } as Record<string, unknown>)[fn];
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
      periodEnd: f('period_end') ?? f('reporting_date') ?? undefined,
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
        indianapi: 'PhilippineAPI /stock_fundamentals + /stock',
        fieldsAvailable: availableFields.join(','),
        fundamentalsAvailable: !!fundamentals,
        stockMetricsAvailable: !!stockMetrics,
      },
      _raw: {
        fundamentals: fund,
        stockMetrics: stock,
      },
    } as any;
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

    return this.normalizeStockMetrics(result.data);
  }

  private normalizeStockMetrics(data: Record<string, any>): Record<string, any> {
    const s = data.stockDetailsReusableData || {};
    const marketCapCrore = finiteNumber(s.marketCap);

    const extracted: Record<string, any> = { marketCapCrore };

    if (data.keyMetrics && typeof data.keyMetrics === 'object') {
      for (const items of Object.values(data.keyMetrics) as any) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.key && item?.value !== undefined) {
              extracted[item.key] = item.value;
            }
          }
        }
      }
    }

    const km = extracted;

    const INDIANAPI_METRIC_MAP: Array<{ keys: string[]; field: string; convert: (v: unknown) => number | undefined }> = [
      { keys: ['pPerEExcludingExtraordinaryItemsMostRecentFiscalYear', 'pPerEBasicExcludingExtraordinaryItemsTTM'], field: 'pe_ratio', convert: finiteNumber },
      { keys: ['priceToBookMostRecentFiscalYear'], field: 'pb_ratio', convert: finiteNumber },
      { keys: ['returnOnAverageEquity5YearAverage'], field: 'roe', convert: finiteNumber },
      { keys: ['returnOnInvestmentMostRecentFiscalYear'], field: 'roce', convert: finiteNumber },
      { keys: ['returnOnAverageAssetsMostRecenFiscalYear'], field: 'roa', convert: finiteNumber },
      { keys: ['operatingMarginTrailing12Month', 'operatingMargin5YearAverage', 'operatingMargin1stHistoricalFiscalYear)'], field: 'operating_margin', convert: finiteNumber },
      { keys: ['grossMargin5YearAverage'], field: 'gross_margin', convert: finiteNumber },
      { keys: ['netProfitMarginPercent1stHistoricalFiscalYear'], field: 'net_margin', convert: finiteNumber },
      { keys: ['revenueGrowthRate5Year', 'revenueChangePercentMostRecentQuarter1YearAgo'], field: 'revenue_growth', convert: finiteNumber },
      { keys: ['ePSChangePercentTTMOverTTM', 'ePSGrowthRate5Year'], field: 'eps_growth', convert: finiteNumber },
      { keys: ['totalDebtPerTotalEquityMostRecentQuarter'], field: 'debt_to_equity', convert: finiteNumber },
      { keys: ['currentDividendYieldCommonStockPrimaryIssueLTM'], field: 'dividend_yield', convert: finiteNumber },
      { keys: ['freeCashFlowtrailing12Month', 'freeCashFlowMostRecentFiscalYear'], field: 'free_cash_flow', convert: finiteNumber },
    ];

    for (const mapping of INDIANAPI_METRIC_MAP) {
      for (const key of mapping.keys) {
        const raw = km[key];
        if (raw !== undefined && raw !== null && raw !== 'null' && raw !== '') {
          const converted = mapping.convert(raw);
          if (converted !== undefined) {
            extracted[mapping.field] = converted;
            break;
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
