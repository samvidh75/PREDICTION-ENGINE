import type { PriceCandle, PriceTimeframe } from "./dataAdapterTypes";

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9&.-]{0,24}$/;

export function canonicalNow(): string {
  return new Date().toISOString();
}

export function normalizeAdapterSymbol(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toUpperCase().replace(/^(PSE|NSE|BSE):/i, "").replace(/\.(NS|NSE|BO|BSE)$/i, "");
  return SYMBOL_PATTERN.test(cleaned) ? cleaned : null;
}

export function normalizeNullableString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/\s+/g, " ");
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeFiniteNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const parsed = Number(raw.replace(/[₹,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeNonNegativeNumber(raw: unknown): number | null {
  const value = normalizeFiniteNumber(raw);
  return value !== null && value >= 0 ? value : null;
}

export function normalizePositiveNumber(raw: unknown): number | null {
  const value = normalizeFiniteNumber(raw);
  return value !== null && value > 0 ? value : null;
}

export function normalizeIsoTimestamp(raw: unknown): string | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  const parsed = new Date(raw.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizeSafeUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function dedupeBy<T>(records: readonly T[], keyFor: (record: T) => string | null): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const record of records) {
    const key = keyFor(record);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }
  return output;
}

export function normalizePriceCandle(raw: Partial<PriceCandle>, fallbackTimeframe: PriceTimeframe): PriceCandle | null {
  const symbol = normalizeAdapterSymbol(raw.symbol);
  const timestamp = normalizeIsoTimestamp(raw.timestamp);
  const open = normalizePositiveNumber(raw.open);
  const high = normalizePositiveNumber(raw.high);
  const low = normalizePositiveNumber(raw.low);
  const close = normalizePositiveNumber(raw.close);
  if (!symbol || !timestamp || open === null || high === null || low === null || close === null || high < low) return null;
  return {
    symbol,
    timeframe: raw.timeframe ?? fallbackTimeframe,
    timestamp,
    open,
    high,
    low,
    close,
    volume: normalizeNonNegativeNumber(raw.volume),
    vwap: normalizeNonNegativeNumber(raw.vwap),
    deliveryVolume: normalizeNonNegativeNumber(raw.deliveryVolume),
    deliveryPercent: normalizeNonNegativeNumber(raw.deliveryPercent),
    adjustedClose: normalizePositiveNumber(raw.adjustedClose),
  };
}
