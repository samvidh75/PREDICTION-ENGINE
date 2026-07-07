// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Philippine EOD candle contract and validator
//
// Typed representation of a single daily price record for an PSE equity.
// Every candle in the system MUST conform to this interface.
// ─────────────────────────────────────────────────────────────────────────────

import type { IndianExchange } from '../symbols/PSESymbol';

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

export interface IndianEodCandle {
  /** Ticker in canonical form (uppercase, no suffix). */
  readonly symbol: string;

  /** Exchange this candle was traded on. */
  readonly exchange: IndianExchange;

  /** Trading date in 'YYYY-MM-DD' format. */
  readonly date: string;

  /** Opening price in INR (adjusted for corporate actions). */
  readonly open: number;

  /** Highest price in INR. */
  readonly high: number;

  /** Lowest price in INR. */
  readonly low: number;

  /** Closing price in INR (adjusted for corporate actions). */
  readonly close: number;

  /** Volume in number of shares. */
  readonly volume: number;

  /** Delivery percentage (0–100) — the share of volume delivered
   *  (dematerialised settlement).  `null` when unknown. */
  readonly deliveryPct: number | null;

  /** Closing price BEFORE any corporate-action adjustment.
   *  Used to reconstruct raw close for dividend/split analysis.
   *  Same as `close` when no adjustment applies. */
  readonly unadjustedClose: number;

  /** Dividend amount in INR per share, if any (0 = no dividend). */
  readonly dividend: number;

  /** Split factor (e.g. 10 for a 1:10 split).  1 = no split. */
  readonly splitFactor: number;
}

// ---------------------------------------------------------------------------
// Quality issue types
// ---------------------------------------------------------------------------

export type EodCandleQualityIssue =
  | { kind: 'missing'; message: string }
  | { kind: 'negative_price'; field: string; value: number }
  | { kind: 'ohlc_mismatch'; message: string }
  | { kind: 'suspicious_change'; field: string; pctChange: number; threshold: number }
  | { kind: 'zero_volume_warning'; message: string }
  | { kind: 'future_date'; message: string }
  | { kind: 'duplicate'; message: string };

// ---------------------------------------------------------------------------
// Quality check result
// ---------------------------------------------------------------------------

export interface EodCandleQuality {
  /** True when the candle passes all checks. */
  valid: boolean;
  /** All issues found (empty array when valid). */
  issues: EodCandleQualityIssue[];
  /** Numeric score 0–100 (100 = perfect quality). */
  score: number;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate a single EOD candle.
 *
 * Checks performed:
 * 1. All required fields present and non-null
 * 2. Open/high/low/close > 0
 * 3. OHLC consistency (high >= open,close,low; low <= open,close)
 * 4. Not a future date
 * 5. Volume >= 0 (0-volume is a warning, not fatal)
 * 6. Symbol non-empty, date parseable
 * 7. Suspicious daily price changes (> 50%)
 * 8. duplicate detection (by symbol+date)
 */
export function validateEodCandle(
  candle: IndianEodCandle,
  seenKeys?: Set<string>,
): EodCandleQuality {
  const issues: EodCandleQualityIssue[] = [];

  // 1 — Required fields present
  if (!candle.symbol || candle.symbol.trim().length === 0) {
    issues.push({ kind: 'missing', message: 'Symbol is empty' });
  }

  if (!candle.date || !/^\d{4}-\d{2}-\d{2}$/.test(candle.date)) {
    issues.push({ kind: 'missing', message: `Invalid or missing date: ${candle.date}` });
  }

  // 2 — Non-negative prices
  const checkPrice = (field: string, value: number) => {
    if (typeof value !== 'number' || isNaN(value)) {
      issues.push({ kind: 'negative_price', field, value });
    } else if (value < 0) {
      issues.push({ kind: 'negative_price', field, value });
    }
  };

  checkPrice('open', candle.open);
  checkPrice('high', candle.high);
  checkPrice('low', candle.low);
  checkPrice('close', candle.close);
  checkPrice('volume', candle.volume);

  // 3 — OHLC consistency (only when prices are sensible numbers)
  const hasPrices = [candle.open, candle.high, candle.low, candle.close]
    .every(v => typeof v === 'number' && !isNaN(v) && v > 0);

  if (hasPrices) {
    if (candle.high < candle.low) {
      issues.push({
        kind: 'ohlc_mismatch',
        message: `High (${candle.high}) < Low (${candle.low})`,
      });
    }
    if (candle.high < candle.open || candle.high < candle.close) {
      issues.push({
        kind: 'ohlc_mismatch',
        message: `High (${candle.high}) is not the period maximum (O:${candle.open} C:${candle.close})`,
      });
    }
    if (candle.low > candle.open || candle.low > candle.close) {
      issues.push({
        kind: 'ohlc_mismatch',
        message: `Low (${candle.low}) is not the period minimum (O:${candle.open} C:${candle.close})`,
      });
    }
  }

  // 4 — Not a future date (allow today)
  if (candle.date) {
    const today = new Date();
    const candleDate = new Date(`${candle.date}T00:00:00.000Z`);
    // Add one day tolerance for UTC edge cases
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 2);

    if (candleDate > tomorrow) {
      issues.push({
        kind: 'future_date',
        message: `Candle date ${candle.date} is in the future`,
      });
    }
  }

  // 5 — Zero volume warning
  if (typeof candle.volume === 'number' && candle.volume === 0) {
    issues.push({
      kind: 'zero_volume_warning',
      message: `Zero volume for ${candle.symbol} on ${candle.date}`,
    });
  }

  // 6 — Suspicious daily change
  if (hasPrices && candle.open > 0) {
    const changePct = Math.abs((candle.close - candle.open) / candle.open * 100);
    if (changePct > 50) {
      issues.push({
        kind: 'suspicious_change',
        field: 'close_vs_open',
        pctChange: changePct,
        threshold: 50,
      });
    }
  }

  // 7 — Duplicate detection
  if (seenKeys && candle.symbol && candle.date) {
    const key = `${candle.symbol}:${candle.date}`;
    if (seenKeys.has(key)) {
      issues.push({
        kind: 'duplicate',
        message: `Duplicate candle for ${key}`,
      });
    }
    seenKeys.add(key);
  }

  // Scoring
  const score = Math.max(0, 100 - issues.length * 20);
  return {
    valid: issues.length === 0,
    issues,
    score,
  };
}

/**
 * Validate a batch of candles.
 * Provides duplicate detection across the entire batch.
 */
export function validateEodCandleBatch(candles: IndianEodCandle[]): EodCandleQuality[] {
  const seenKeys = new Set<string>();
  return candles.map(c => validateEodCandle(c, seenKeys));
}
