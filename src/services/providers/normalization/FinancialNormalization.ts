export function finiteNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

const INDIAN_NUMBER_REGEX = /^\(?[₹₨$€£¥]?\s*[\d,]+(?:\.\d+)?\s*(?:Cr(?:ore)?|Lac(?:kh?)?|%)?\s*\)?$/i;
const CRORE_SUFFIX = /cr(?:ore)?$/i;
const LAKH_SUFFIX = /(?:lac(?:kh?)?|lakh?)$/i;
const PERCENT_SUFFIX = /%$/;
const PARENS_NEGATIVE = /^\((.+)\)$/;
const DASH_LIKE = /^[—–-]$/;
const NA_LIKE = /^(n\/?a|n\/?d|n\/?a\/?s|null|undefined)$/i;

export function parseIndianNumber(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s || DASH_LIKE.test(s) || NA_LIKE.test(s)) return null;

  let negative = false;
  const parens = s.match(PARENS_NEGATIVE);
  if (parens) {
    negative = true;
    s = parens[1].trim();
  }

  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1).trim();
  }

  s = s.replace(/[₹₨$€£¥]/g, '').trim();

  let multiplier = 1;
  if (CRORE_SUFFIX.test(s)) {
    multiplier = 10_000_000;
    s = s.replace(CRORE_SUFFIX, '').trim();
  } else if (LAKH_SUFFIX.test(s)) {
    multiplier = 100_000;
    s = s.replace(LAKH_SUFFIX, '').trim();
  }

  const isPercent = PERCENT_SUFFIX.test(s);
  if (isPercent) {
    s = s.replace(PERCENT_SUFFIX, '').trim();
  }

  s = s.replace(/,/g, '');
  if (!s) return null;

  const num = Number(s);
  if (!Number.isFinite(num)) return null;

  const result = num * multiplier;
  return negative ? -result : result;
}

export function parsePercentageFraction(raw: string): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || DASH_LIKE.test(s) || NA_LIKE.test(s)) return null;
  if (!PERCENT_SUFFIX.test(s)) return null;

  const num = parseIndianNumber(s);
  if (num == null) return null;

  return num / 100;
}

export function parseCurrencyToInr(raw: string): number | null {
  return parseIndianNumber(raw);
}

const MONTH_NAMES: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};
const DD_MMM_YYYY = /^(\d{1,2})[\s-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s-](\d{4})$/i;

export function parseDateOrNull(raw: string): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(DD_MMM_YYYY);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = MONTH_NAMES[m[2].toLowerCase()];
    if (month) return `${m[3]}-${month}-${day}`;
  }

  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

const EXCHANGE_SUFFIX = /\.(NS|BO|NSE|BSE)$/i;

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().replace(EXCHANGE_SUFFIX, '').toUpperCase();
}

export function normalizeExchange(exchange: string): string {
  const s = exchange.trim().toLowerCase();
  if (s === 'nse' || s === 'national stock exchange') return 'NSE';
  if (s === 'bse' || s === 'bombay stock exchange') return 'BSE';
  return exchange.trim();
}

function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

export function calculateDerivedRatios(primitives: {
  netProfit?: number | null;
  totalAssets?: number | null;
  equity?: number | null;
  revenue?: number | null;
  operatingProfit?: number | null;
  totalDebt?: number | null;
  ebitda?: number | null;
  marketCap?: number | null;
  freeCashFlow?: number | null;
  eps?: number | null;
  currentAssets?: number | null;
  currentLiabilities?: number | null;
}): {
  roa: number | null;
  roe: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  evEbitda: number | null;
  fcfYield: number | null;
} {
  return {
    roa: safeDiv(primitives.netProfit, primitives.totalAssets),
    roe: safeDiv(primitives.netProfit, primitives.equity),
    grossMargin: null,
    operatingMargin: safeDiv(primitives.operatingProfit, primitives.revenue),
    netMargin: safeDiv(primitives.netProfit, primitives.revenue),
    debtToEquity: safeDiv(primitives.totalDebt, primitives.equity),
    currentRatio: safeDiv(primitives.currentAssets, primitives.currentLiabilities),
    evEbitda: safeDiv(primitives.marketCap, primitives.ebitda),
    fcfYield: safeDiv(primitives.freeCashFlow, primitives.marketCap),
  };
}

const MAX_GROWTH_RATE = 100;

export function calculateGrowthRate(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return null;
  const rate = (current - previous) / Math.abs(previous);
  if (rate > MAX_GROWTH_RATE) return MAX_GROWTH_RATE;
  if (rate < -MAX_GROWTH_RATE) return -MAX_GROWTH_RATE;
  return rate;
}

const URL_PATTERN = /https?:\/\/\S+/g;
const TOKEN_PATTERN = /[A-Za-z0-9+/=]{32,}/g;
const KEY_PATTERN = /[A-Za-z0-9_-]{20,}/g;

export function sanitizeProviderDiagnostic(diag: string): string {
  return diag
    .replace(URL_PATTERN, '[URL]')
    .replace(TOKEN_PATTERN, '[TOKEN]')
    .replace(KEY_PATTERN, '[KEY]');
}
