import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TRACKED_FIELDS = [
  'marketCap',
  'peRatio',
  'pbRatio',
  'eps',
  'roe',
  'debtToEquity',
  'revenueGrowth',
  'earningsGrowth',
  'operatingMargin',
  'netMargin',
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];
type ProviderName = 'finnhub' | 'indianapi' | 'yfinance';
type FieldCoverage = Record<TrackedField, boolean>;

type SymbolResult = {
  symbol: string;
  ok: boolean;
  httpStatus?: number;
  coverageCount: number;
  coveragePercent: number;
  coveredFields: string[];
  missingFields: string[];
  sectorAvailable: boolean;
  warnings: string[];
  error?: string;
};

type ProviderResult = {
  provider: ProviderName;
  configured: boolean;
  required: boolean;
  ok: boolean;
  status: 'passed' | 'failed' | 'not-configured' | 'skipped';
  endpointLabels: string[];
  symbols: SymbolResult[];
  error?: string;
};

const argv = process.argv.slice(2);
const strict = argv.includes('--strict');
const symbols = parseCsvArg('--symbols=', ['RELIANCE', 'TCS', 'INFY'], 'upper');
const providers = parseCsvArg('--providers=', ['finnhub', 'indianapi', 'yfinance'], 'lower')
  .filter((provider): provider is ProviderName => ['finnhub', 'indianapi', 'yfinance'].includes(provider));
const required = new Set(parseCsvArg('--require=', ['finnhub', 'indianapi'], 'lower'));

function parseCsvArg(prefix: string, fallback: string[], casing: 'upper' | 'lower' | 'preserve' = 'preserve'): string[] {
  const value = argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = (value ? value.split(',') : fallback)
    .map((entry) => {
      const trimmed = entry.trim();
      if (casing === 'upper') return trimmed.toUpperCase();
      if (casing === 'lower') return trimmed.toLowerCase();
      return trimmed;
    })
    .filter(Boolean);
  return [...new Set(parsed)];
}

function finite(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function coverage(values: Partial<Record<TrackedField, unknown>>): FieldCoverage {
  return Object.fromEntries(TRACKED_FIELDS.map((field) => [field, finite(values[field])])) as FieldCoverage;
}

function summarizeCoverage(values: Partial<Record<TrackedField, unknown>>, sector: unknown, warnings: string[] = []): Omit<SymbolResult, 'symbol' | 'ok'> {
  const result = coverage(values);
  const coveredFields = TRACKED_FIELDS.filter((field) => result[field]);
  const missingFields = TRACKED_FIELDS.filter((field) => !result[field]);
  return {
    coverageCount: coveredFields.length,
    coveragePercent: Math.round((coveredFields.length / TRACKED_FIELDS.length) * 100),
    coveredFields,
    missingFields,
    sectorAvailable: typeof sector === 'string' && sector.trim().length > 0,
    warnings,
  };
}

async function fetchJson(label: string, url: string, init?: RequestInit): Promise<{ status: number; ok: boolean; data: unknown; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    return { status: 0, ok: false, data: null, error: `${label}: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    clearTimeout(timeout);
  }
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstPresent(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== null && record[key] !== undefined && record[key] !== '') return record[key];
  }
  return null;
}

async function checkFinnhub(): Promise<ProviderResult> {
  const token = process.env.FINNHUB_KEY ?? process.env.FINNHUB_API_KEY;
  const requiredProvider = required.has('finnhub');
  if (!token) {
    return { provider: 'finnhub', configured: false, required: requiredProvider, ok: false, status: 'not-configured', endpointLabels: ['stock/metric', 'stock/profile2'], symbols: [], error: 'Set FINNHUB_KEY or FINNHUB_API_KEY.' };
  }
  const symbolResults: SymbolResult[] = [];
  for (const symbol of symbols) {
    const encoded = encodeURIComponent(`${symbol}.NS`);
    const [metric, profile] = await Promise.all([
      fetchJson('Finnhub stock/metric', `https://finnhub.io/api/v1/stock/metric?symbol=${encoded}&metric=all&token=${encodeURIComponent(token)}`),
      fetchJson('Finnhub stock/profile2', `https://finnhub.io/api/v1/stock/profile2?symbol=${encoded}&token=${encodeURIComponent(token)}`),
    ]);
    const metricRoot = getObject(metric.data);
    const metricValues = getObject(metricRoot.metric);
    const profileValues = getObject(profile.data);
    const values = {
      marketCap: firstPresent(profileValues, ['marketCapitalization', 'marketCap']),
      peRatio: firstPresent(metricValues, ['peBasicExclExtraTTM', 'peNormalizedAnnual', 'peTTM']),
      pbRatio: firstPresent(metricValues, ['pbAnnual', 'pbQuarterly']),
      eps: firstPresent(metricValues, ['epsBasicExclExtraItemsTTM', 'epsNormalizedAnnual', 'epsTTM']),
      roe: firstPresent(metricValues, ['roeTTM', 'roeAnnual']),
      debtToEquity: firstPresent(metricValues, ['totalDebt/totalEquityAnnual', 'totalDebt/totalEquityQuarterly', 'totalDebt/totalEquityTTM']),
      revenueGrowth: firstPresent(metricValues, ['revenueGrowthTTMYoy', 'revenueGrowth3Y', 'revenueGrowth5Y']),
      earningsGrowth: firstPresent(metricValues, ['epsGrowthTTMYoy', 'epsGrowth3Y', 'epsGrowth5Y']),
      operatingMargin: firstPresent(metricValues, ['operatingMarginTTM', 'operatingMarginAnnual']),
      netMargin: firstPresent(metricValues, ['netProfitMarginTTM', 'netProfitMarginAnnual']),
    };
    const warnings: string[] = [];
    if (!metric.ok) warnings.push(`stock/metric HTTP ${metric.status}`);
    if (!profile.ok) warnings.push(`stock/profile2 HTTP ${profile.status}`);
    const summary = summarizeCoverage(values, firstPresent(profileValues, ['finnhubIndustry', 'sector']), warnings);
    symbolResults.push({ symbol, ok: metric.ok && summary.coverageCount > 0, httpStatus: metric.status, ...summary, error: metric.error ?? profile.error });
  }
  return { provider: 'finnhub', configured: true, required: requiredProvider, ok: symbolResults.every((result) => result.ok), status: symbolResults.every((result) => result.ok) ? 'passed' : 'failed', endpointLabels: ['stock/metric', 'stock/profile2'], symbols: symbolResults };
}

async function checkIndianApi(): Promise<ProviderResult> {
  const token = process.env.INDIANAPI_KEY;
  const requiredProvider = required.has('indianapi');
  if (!token) {
    return { provider: 'indianapi', configured: false, required: requiredProvider, ok: false, status: 'not-configured', endpointLabels: ['stock', 'stock_fundamentals'], symbols: [], error: 'Set INDIANAPI_KEY.' };
  }
  const symbolResults: SymbolResult[] = [];
  for (const symbol of symbols) {
    const headers = { 'X-Api-Key': token, Accept: 'application/json' };
    const [quote, fundamentals] = await Promise.all([
      fetchJson('IndianAPI stock', `https://stock.indianapi.in/stock?name=${encodeURIComponent(symbol)}`, { headers }),
      fetchJson('IndianAPI stock_fundamentals', `https://stock.indianapi.in/stock_fundamentals?name=${encodeURIComponent(symbol)}`, { headers }),
    ]);
    const quoteValues = getObject(quote.data);
    const fundamentalsValues = getObject(fundamentals.data);
    const merged = { ...quoteValues, ...fundamentalsValues };
    const values = {
      marketCap: firstPresent(merged, ['marketCap', 'market_cap', 'marketCapFull']),
      peRatio: firstPresent(merged, ['pe', 'pe_ratio', 'peRatio']),
      pbRatio: firstPresent(merged, ['pb', 'pb_ratio', 'pbRatio']),
      eps: firstPresent(merged, ['eps', 'earningsPerShare']),
      roe: firstPresent(merged, ['roe', 'return_on_equity', 'returnOnEquity']),
      debtToEquity: firstPresent(merged, ['debt_to_equity', 'debtToEquity']),
      revenueGrowth: firstPresent(merged, ['revenue_growth', 'revenueGrowth']),
      earningsGrowth: firstPresent(merged, ['earnings_growth', 'profit_growth', 'earningsGrowth']),
      operatingMargin: firstPresent(merged, ['operating_margin', 'operatingMargin']),
      netMargin: firstPresent(merged, ['net_margin', 'netMargin']),
    };
    const warnings: string[] = [];
    if (!quote.ok) warnings.push(`stock HTTP ${quote.status}`);
    if (!fundamentals.ok) warnings.push(`stock_fundamentals HTTP ${fundamentals.status}`);
    const summary = summarizeCoverage(values, firstPresent(merged, ['sector', 'industry']), warnings);
    symbolResults.push({ symbol, ok: quote.ok && fundamentals.ok && summary.coverageCount > 0, httpStatus: fundamentals.status, ...summary, error: quote.error ?? fundamentals.error });
  }
  return { provider: 'indianapi', configured: true, required: requiredProvider, ok: symbolResults.every((result) => result.ok), status: symbolResults.every((result) => result.ok) ? 'passed' : 'failed', endpointLabels: ['stock', 'stock_fundamentals'], symbols: symbolResults };
}

function checkYfinance(): ProviderResult {
  const requiredProvider = required.has('yfinance');
  const enabled = String(process.env.YFINANCE_ENABLED ?? '').toLowerCase() === 'true';
  if (!enabled) {
    return { provider: 'yfinance', configured: false, required: requiredProvider, ok: !requiredProvider, status: 'skipped', endpointLabels: ['scripts/yfinance_bridge.py fundamentals-batch'], symbols: [], error: 'Set YFINANCE_ENABLED=true to run the optional Python bridge healthcheck.' };
  }
  const yfinanceSymbols = symbols.map((symbol) => `${symbol}.NS`).join(',');
  const result = spawnSync('python3', ['scripts/yfinance_bridge.py', 'fundamentals-batch', yfinanceSymbols, '0.25', '0.75'], { cwd: process.cwd(), encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    return { provider: 'yfinance', configured: true, required: requiredProvider, ok: false, status: 'failed', endpointLabels: ['scripts/yfinance_bridge.py fundamentals-batch'], symbols: [], error: (result.stderr || result.stdout || 'yfinance bridge failed').trim().slice(0, 500) };
  }
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(result.stdout || '{}') as Record<string, unknown>;
  } catch {
    return { provider: 'yfinance', configured: true, required: requiredProvider, ok: false, status: 'failed', endpointLabels: ['scripts/yfinance_bridge.py fundamentals-batch'], symbols: [], error: 'yfinance bridge returned invalid JSON.' };
  }
  const symbolResults = symbols.map((symbol) => {
    const raw = getObject(parsed[`${symbol}.NS`]);
    const values = {
      marketCap: raw.marketCap,
      peRatio: firstPresent(raw, ['trailingPE', 'forwardPE']),
      pbRatio: raw.priceToBook,
      eps: raw.earningsPerShare,
      roe: raw.returnOnEquity,
      debtToEquity: raw.debtToEquity,
      revenueGrowth: raw.revenueGrowth,
      earningsGrowth: raw.earningsGrowth,
      operatingMargin: raw.operatingMargins,
      netMargin: raw.profitMargins,
    };
    const summary = summarizeCoverage(values, firstPresent(raw, ['sector', 'industry']));
    return { symbol, ok: !raw.error && summary.coverageCount > 0, ...summary, error: typeof raw.error === 'string' ? raw.error.slice(0, 300) : undefined };
  });
  return { provider: 'yfinance', configured: true, required: requiredProvider, ok: symbolResults.every((result) => result.ok), status: symbolResults.every((result) => result.ok) ? 'passed' : 'failed', endpointLabels: ['scripts/yfinance_bridge.py fundamentals-batch'], symbols: symbolResults };
}

async function main(): Promise<void> {
  const providerResults: ProviderResult[] = [];
  for (const provider of providers) {
    if (provider === 'finnhub') providerResults.push(await checkFinnhub());
    if (provider === 'indianapi') providerResults.push(await checkIndianApi());
    if (provider === 'yfinance') providerResults.push(checkYfinance());
  }

  const failures = providerResults.filter((provider) => provider.required && !provider.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    symbols,
    strict,
    requiredProviders: [...required].map((provider) => provider.toLowerCase()),
    secretValuesPrinted: false,
    providers: providerResults,
    summary: {
      configuredProviders: providerResults.filter((provider) => provider.configured).length,
      passedProviders: providerResults.filter((provider) => provider.ok).length,
      requiredFailures: failures.map((provider) => provider.provider),
    },
  };

  const outputDirectory = path.resolve(process.cwd(), 'tmp', 'provider-health');
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(path.join(outputDirectory, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));

  if (strict && failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error), secretValuesPrinted: false }, null, 2));
  process.exitCode = 1;
});
