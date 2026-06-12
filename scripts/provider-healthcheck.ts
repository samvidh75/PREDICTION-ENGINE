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

function finiteNumber(value: unknown): number | null {
  return finite(value) ? Number(value) : null;
}

function sanitize(value: unknown): string {
  return String(value)
    .replace(/token=[^&\s]+/gi, 'token=<redacted>')
    .replace(/X-Api-Key\s*[:=]\s*[^\s]+/gi, 'X-Api-Key=<redacted>')
    .replace(/FINNHUB_(?:API_)?KEY=[^\s]+/gi, 'FINNHUB_KEY=<redacted>')
    .replace(/INDIANAPI_KEY=[^\s]+/gi, 'INDIANAPI_KEY=<redacted>');
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
    return { status: 0, ok: false, data: null, error: `${label}: ${sanitize(error instanceof Error ? error.message : String(error))}` };
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

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function collectScalars(value: unknown, output = new Map<string, unknown>()): Map<string, unknown> {
  if (Array.isArray(value)) {
    for (const item of value) collectScalars(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  const record = value as Record<string, unknown>;
  const label = typeof record.key === 'string' ? record.key : typeof record.name === 'string' ? record.name : null;
  const labelledValue = record.value ?? record.val ?? record.data;
  if (label && labelledValue !== undefined && labelledValue !== null && typeof labelledValue !== 'object') {
    output.set(normalizeKey(label), labelledValue);
  }
  for (const [key, nested] of Object.entries(record)) {
    if (nested !== null && nested !== undefined && typeof nested !== 'object') {
      if (!output.has(normalizeKey(key))) output.set(normalizeKey(key), nested);
    } else {
      collectScalars(nested, output);
    }
  }
  return output;
}

function firstDeep(value: unknown, aliases: string[]): unknown {
  const scalars = collectScalars(value);
  for (const alias of aliases) {
    const found = scalars.get(normalizeKey(alias));
    if (found !== null && found !== undefined && found !== '') return found;
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
    const metricValues = getObject(getObject(metric.data).metric);
    const profileValues = getObject(profile.data);
    const values = {
      marketCap: firstPresent(profileValues, ['marketCapitalization', 'marketCap']) ?? firstPresent(metricValues, ['marketCapitalization']),
      peRatio: firstPresent(metricValues, ['peBasicExclExtraTTM', 'peNormalizedAnnual', 'peTTM']),
      pbRatio: firstPresent(metricValues, ['pbAnnual', 'pbQuarterly', 'priceToBookPerShareTTM']),
      eps: firstPresent(metricValues, ['epsBasicExclExtraItemsTTM', 'epsNormalizedAnnual', 'epsTTM']),
      roe: firstPresent(metricValues, ['roeTTM', 'roeRfy', 'roeAnnual']),
      debtToEquity: firstPresent(metricValues, ['totalDebtOverTotalEquityTTM', 'totalDebtOverTotalEquityQuarterly', 'totalDebtOverTotalEquityAnnual']),
      revenueGrowth: firstPresent(metricValues, ['revenueGrowthTTMYoy', 'revenueGrowth3Y', 'revenueGrowth5Y']),
      earningsGrowth: firstPresent(metricValues, ['netIncomeGrowthTTMYoy', 'netIncomeGrowth3Y', 'epsGrowthTTMYoy', 'epsGrowth3Y', 'epsGrowth5Y']),
      operatingMargin: firstPresent(metricValues, ['operatingMarginTTM', 'operatingMarginAnnual']),
      netMargin: firstPresent(metricValues, ['netProfitMarginTTM', 'netProfitMarginAnnual']),
    };
    const warnings: string[] = [];
    if (metric.status === 401 || profile.status === 401) warnings.push('Finnhub authentication failed (401). Rotate FINNHUB_KEY or FINNHUB_API_KEY.');
    if (!metric.ok) warnings.push(`stock/metric HTTP ${metric.status}`);
    if (!profile.ok) warnings.push(`stock/profile2 HTTP ${profile.status}`);
    const summary = summarizeCoverage(values, firstPresent(profileValues, ['finnhubIndustry', 'gicSector', 'sector']), warnings);
    if (strict && summary.coveragePercent < 70) warnings.push(`fundamental coverage ${summary.coveragePercent}% < 70%`);
    const ok = metric.ok && summary.coverageCount > 0 && (!strict || summary.coveragePercent >= 70);
    symbolResults.push({ symbol, ok, httpStatus: metric.status, ...summary, error: metric.error ?? profile.error });
  }
  const ok = symbolResults.every((result) => result.ok);
  return { provider: 'finnhub', configured: true, required: requiredProvider, ok, status: ok ? 'passed' : 'failed', endpointLabels: ['stock/metric', 'stock/profile2'], symbols: symbolResults };
}

async function checkIndianApi(): Promise<ProviderResult> {
  const token = process.env.INDIANAPI_KEY;
  const requiredProvider = required.has('indianapi');
  if (!token) {
    return { provider: 'indianapi', configured: false, required: requiredProvider, ok: false, status: 'not-configured', endpointLabels: ['stock'], symbols: [], error: 'Set INDIANAPI_KEY.' };
  }
  const symbolResults: SymbolResult[] = [];
  for (const symbol of symbols) {
    const headers = { 'X-Api-Key': token, Accept: 'application/json' };
    const stock = await fetchJson('IndianAPI stock', `https://stock.indianapi.in/stock?name=${encodeURIComponent(symbol)}`, { headers });
    const stockValues = getObject(stock.data);
    const currentPrice = getObject(stockValues.currentPrice);
    const values = {
      marketCap: firstDeep(stockValues, ['marketCap', 'market_cap', 'marketCapitalization']),
      peRatio: firstDeep(stockValues, ['pe', 'peRatio', 'priceToEarnings', 'priceEarningsRatio']),
      pbRatio: firstDeep(stockValues, ['pb', 'pbRatio', 'priceToBook', 'priceBookRatio']),
      eps: firstDeep(stockValues, ['eps', 'earningsPerShare']),
      roe: firstDeep(stockValues, ['roe', 'returnOnEquity']),
      debtToEquity: firstDeep(stockValues, ['debtToEquity', 'debt_equity', 'deRatio']),
      revenueGrowth: firstDeep(stockValues, ['revenueGrowth', 'salesGrowth']),
      earningsGrowth: firstDeep(stockValues, ['earningsGrowth', 'profitGrowth', 'netProfitGrowth']),
      operatingMargin: firstDeep(stockValues, ['operatingMargin', 'operatingProfitMargin', 'opm']),
      netMargin: firstDeep(stockValues, ['netMargin', 'netProfitMargin', 'npm']),
    };
    const price = finiteNumber(firstPresent(currentPrice, ['NSE', 'BSE'])) ?? finiteNumber(firstDeep(stockValues, ['price', 'currentPrice']));
    const sector = firstPresent(stockValues, ['industry', 'sector']) ?? firstDeep(stockValues, ['mgSector', 'sector', 'industry']);
    const warnings: string[] = [];
    if (!stock.ok) warnings.push(`stock HTTP ${stock.status}`);
    const summary = summarizeCoverage(values, sector, warnings);
    if (summary.coveragePercent < 70) warnings.push(`fundamental coverage is partial (${summary.coveragePercent}%); use as quote/metadata fallback unless reviewed`);
    if (price === null || price <= 0) warnings.push('quote price missing or invalid');
    if (!summary.sectorAvailable) warnings.push('sector metadata missing');
    const ok = stock.ok && price !== null && price > 0;
    symbolResults.push({ symbol, ok, httpStatus: stock.status, ...summary, error: stock.error });
  }
  const ok = symbolResults.every((result) => result.ok);
  return { provider: 'indianapi', configured: true, required: requiredProvider, ok, status: ok ? 'passed' : 'failed', endpointLabels: ['stock'], symbols: symbolResults };
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
    return { provider: 'yfinance', configured: true, required: requiredProvider, ok: false, status: 'failed', endpointLabels: ['scripts/yfinance_bridge.py fundamentals-batch'], symbols: [], error: sanitize((result.stderr || result.stdout || 'yfinance bridge failed').trim().slice(0, 500)) };
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
      eps: firstPresent(raw, ['trailingEps', 'earningsPerShare']),
      roe: raw.returnOnEquity,
      debtToEquity: raw.debtToEquity,
      revenueGrowth: raw.revenueGrowth,
      earningsGrowth: raw.earningsGrowth,
      operatingMargin: raw.operatingMargins,
      netMargin: raw.profitMargins,
    };
    const summary = summarizeCoverage(values, firstPresent(raw, ['sector', 'industry']));
    const warnings = [...summary.warnings];
    if (Array.isArray(raw.warnings)) warnings.push(...raw.warnings.map((warning) => sanitize(warning)));
    if (strict && summary.coveragePercent < 40) warnings.push(`fundamental coverage ${summary.coveragePercent}% < 40%`);
    const ok = !raw.error && summary.coverageCount > 0 && (!strict || summary.coveragePercent >= 40);
    return { symbol, ok, ...summary, warnings, error: typeof raw.error === 'string' ? sanitize(raw.error.slice(0, 300)) : undefined };
  });
  const ok = symbolResults.every((item) => item.ok);
  return { provider: 'yfinance', configured: true, required: requiredProvider, ok, status: ok ? 'passed' : 'failed', endpointLabels: ['scripts/yfinance_bridge.py fundamentals-batch'], symbols: symbolResults };
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
    requiredProviders: [...required],
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
  console.error(JSON.stringify({ error: sanitize(error instanceof Error ? error.message : String(error)), secretValuesPrinted: false }, null, 2));
  process.exitCode = 1;
});
