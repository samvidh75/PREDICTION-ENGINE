export const BACKEND_VOCABULARY_PATTERNS = [
  /IndianAPI/i,
  /Yahoo/i,
  /Jugaad/i,
  /NSEPython/i,
  /Upstox/i,
  /Screener/i,
  /Finnhub/i,
  /provider health/i,
  /provider status/i,
  /Provider Health/i,
  /Provider Status/i,
  /coverage/i,
  /freshness/i,
  /source pending/i,
  /source verified/i,
  /Source pending/i,
  /Source verified/i,
  /manual CSV/i,
  /Manual CSV/i,
  /lineage/i,
  /migration/i,
  /backfill/i,
  /diagnostics/i,
  /data operations/i,
  /Data Operations/i,
  /quote unavailable/i,
  /history unavailable/i,
  /API unavailable/i,
  /symbol gaps/i,
  /verify:data/i,
  /production verification/i,
  /production diagnostics/i,
] as const;

export const FORBIDDEN_TRADING_PATTERNS = [
  /Buy Stock/i,
  /Sell Stock/i,
  /Strong Buy/i,
  /Strong Sell/i,
  /Try Pro/i,
  /Unlock Pro/i,
  /Trade now/i,
  /30 days free/i,
  /sure shot/i,
  /multibagger/i,
  /guaranteed/i,
  /Guaranteed/i,
  /Top picks/i,
  /AI picks/i,
  /Profit/i,
] as const;

export const BACKEND_PROVIDER_NAMES = [
  /IndianAPI/i,
  /Yahoo/i,
  /Jugaad/i,
  /NSEPython/i,
  /Upstox/i,
  /Screener/i,
  /Finnhub/i,
] as const;

export function hasBackendVocabulary(text: string): string | null {
  for (const pattern of BACKEND_VOCABULARY_PATTERNS) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

export function hasForbiddenTradingLanguage(text: string): string | null {
  for (const pattern of FORBIDDEN_TRADING_PATTERNS) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

export function hasBackendProviderNames(text: string): string | null {
  for (const pattern of BACKEND_PROVIDER_NAMES) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

export function hasRenderGarbage(text: string): string | null {
  if (/\bundefined\b/.test(text)) return "undefined";
  if (/\bnull\b/.test(text)) return "null";
  if (/\bNaN\b/.test(text)) return "NaN";
  if (/\[object Object\]/.test(text)) return "[object Object]";
  if (/\bInfinity\b/.test(text)) return "Infinity";
  return null;
}
