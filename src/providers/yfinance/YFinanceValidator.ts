/**
 * YFinanceValidator.ts
 * Validates data coming from Yahoo Finance before DB insertion.
 * Ensures data integrity, detects gaps, duplicates, and validates corporate actions.
 */

import { DailyPriceRecord } from './types';

// ---------------------------------------------------------------------------
// Validation result types
// ---------------------------------------------------------------------------

export interface RowValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BatchValidationResult {
  valid: DailyPriceRecord[];
  rejected: number;
  errors: string[];
}

export interface GapDetectionResult {
  symbol: string;
  missingDates: string[];
}

export interface DuplicateDetectionResult {
  symbol: string;
  duplicateDates: string[];
}

export interface CorporateActionValidationResult {
  valid: boolean;
  type: 'dividend' | 'split' | null;
  value: number;
  date: string;
}

// ---------------------------------------------------------------------------
// Known Indian market holidays (approximate, covers major holidays)
// ---------------------------------------------------------------------------

const INDIAN_MARKET_HOLIDAYS: Set<string> = new Set([
  // Republic Day
  '01-26',
  // Maharashtra Day
  '05-01',
  // Independence Day
  '08-15',
  // Gandhi Jayanti
  '10-02',
  // Diwali (varies – using approximate common dates)
  // We handle these with a broader approach: detect missing clusters
  // during multi-day market closures.
]);

/**
 * Check if a given date is a known fixed-date Indian market holiday.
 * NOTE: Floating holidays (Diwali, Holi, Eid, etc.) require an external
 * calendar feed for perfect accuracy. This provides rough filtering.
 */
function isIndianMarketHoliday(date: Date): boolean {
  const mmdd = date.toISOString().slice(5, 10); // "MM-DD"
  if (INDIAN_MARKET_HOLIDAYS.has(mmdd)) return true;

  const dayOfWeek = date.getDay();
  // Saturday (6) and Sunday (0) — Indian markets are closed
  if (dayOfWeek === 0 || dayOfWeek === 6) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return false;
  // Ensure the parsed date components match (rejects Feb 30, etc.)
  const [y, m, day] = dateStr.split('-').map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

// ---------------------------------------------------------------------------
// YFinanceValidator
// ---------------------------------------------------------------------------

export class YFinanceValidator {
  /**
   * Validate a single raw row from Yahoo Finance historical data.
   * Checks:
   *  - date is a valid YYYY-MM-DD string
   *  - open, high, low, close are numbers > 0
   *  - high >= low
   *  - close between high and low (inclusive, with small float tolerance)
   *  - volume >= 0
   *  - adj_close > 0 if present
   */
  validateHistoricalRow(row: any, symbol: string): RowValidationResult {
    const errors: string[] = [];

    // --- date validation ---
    if (!row || typeof row !== 'object') {
      return { valid: false, errors: ['Row is not an object'] };
    }

    const dateVal = row.Date ?? row.date;
    if (typeof dateVal !== 'string' || !isValidDateString(dateVal)) {
      errors.push(`Invalid or missing date: "${dateVal}"`);
    }

    // --- numeric fields ---
    const open = Number(row.Open ?? row.open);
    const high = Number(row.High ?? row.high);
    const low = Number(row.Low ?? row.low);
    const close = Number(row.Close ?? row.close);
    const volume = Number(row.Volume ?? row.volume);
    const adjClose = Number(row['Adj Close'] ?? row.adj_close ?? row.adjClose);

    if (isNaN(open) || open <= 0) {
      errors.push(`Open must be a positive number, got: ${row.Open ?? row.open}`);
    }
    if (isNaN(high) || high <= 0) {
      errors.push(`High must be a positive number, got: ${row.High ?? row.high}`);
    }
    if (isNaN(low) || low <= 0) {
      errors.push(`Low must be a positive number, got: ${row.Low ?? row.low}`);
    }
    if (isNaN(close) || close <= 0) {
      errors.push(`Close must be a positive number, got: ${row.Close ?? row.close}`);
    }
    if (isNaN(volume) || volume < 0) {
      errors.push(`Volume must be a non-negative number, got: ${row.Volume ?? row.volume}`);
    }

    // --- relational checks (only if base values are valid) ---
    if (!isNaN(high) && !isNaN(low) && high < low) {
      errors.push(`High (${high}) is less than Low (${low})`);
    }

    if (!isNaN(close) && !isNaN(high) && !isNaN(low)) {
      // Allow tiny float tolerance outside range due to data inconsistencies
      const tolerance = 0.001;
      if (close > high + tolerance) {
        errors.push(`Close (${close}) is above High (${high})`);
      }
      if (close < low - tolerance) {
        errors.push(`Close (${close}) is below Low (${low})`);
      }
    }

    if (!isNaN(adjClose) && adjClose <= 0) {
      errors.push(`Adj Close must be > 0 if present, got: ${adjClose}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a batch of raw rows and return only valid DailyPriceRecords.
   * Maps raw YahooFinance fields to the DailyPriceRecord shape.
   */
  validateBatch(rows: any[], symbol: string): BatchValidationResult {
    const valid: DailyPriceRecord[] = [];
    let rejected = 0;
    const errors: string[] = [];

    if (!Array.isArray(rows)) {
      return { valid, rejected: 0, errors: ['Input is not an array'] };
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const result = this.validateHistoricalRow(row, symbol);

      if (!result.valid) {
        rejected++;
        errors.push(`Row ${i}: ${result.errors.join('; ')}`);
        continue;
      }

      // Map to DailyPriceRecord
      const dateVal = (row.Date ?? row.date) as string;
      valid.push({
        symbol,
        date: dateVal,
        open: Number(row.Open ?? row.open),
        high: Number(row.High ?? row.high),
        low: Number(row.Low ?? row.low),
        close: Number(row.Close ?? row.close),
        adj_close: Number(row['Adj Close'] ?? row.adj_close ?? row.adjClose ?? 0),
        volume: Number(row.Volume ?? row.volume),
        dividends: Number(row.Dividends ?? row.dividends ?? 0),
        stock_splits: Number(row['Stock Splits'] ?? row.stock_splits ?? row.stockSplits ?? 0),
        source: 'yfinance',
        quality_score: 100, // base score; callers may adjust
        ingested_at: new Date().toISOString(),
      });
    }

    return { valid, rejected, errors };
  }

  /**
   * Detect missing trading days in a sequence of DailyPriceRecords.
   * Trading days are Mon–Fri excluding approximate Indian holidays.
   * Records are sorted by date before analysis.
   */
  detectGaps(records: DailyPriceRecord[]): GapDetectionResult {
    const symbol = records.length > 0 ? records[0].symbol : '';
    const missingDates: string[] = [];

    if (records.length < 2) {
      return { symbol, missingDates };
    }

    // Sort by date ascending
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    const startDate = new Date(sorted[0].date + 'T00:00:00');
    const endDate = new Date(sorted[sorted.length - 1].date + 'T00:00:00');

    // Build a Set of existing dates for O(1) lookup
    const existingDates = new Set(sorted.map((r) => r.date));

    // Iterate day by day over the range
    const current = new Date(startDate);
    while (current <= endDate) {
      // Skip weekends and Indian holidays
      if (!isIndianMarketHoliday(current)) {
        const dateStr = current.toISOString().slice(0, 10);
        if (!existingDates.has(dateStr)) {
          missingDates.push(dateStr);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return { symbol, missingDates };
  }

  /**
   * Detect duplicate dates in a list of DailyPriceRecords.
   */
  detectDuplicates(records: DailyPriceRecord[]): DuplicateDetectionResult {
    const symbol = records.length > 0 ? records[0].symbol : '';
    const seen = new Map<string, number>();
    const duplicateDates: string[] = [];

    for (const record of records) {
      const count = seen.get(record.date) || 0;
      seen.set(record.date, count + 1);
    }

    for (const [date, count] of seen) {
      if (count > 1) {
        duplicateDates.push(date);
      }
    }

    return { symbol, duplicateDates };
  }

  /**
   * Validate a corporate action (dividend or split) from Yahoo Finance.
   * Determines type, validates value, and returns a clean result.
   */
  validateCorporateAction(action: any): CorporateActionValidationResult {
    const fallback: CorporateActionValidationResult = {
      valid: false,
      type: null,
      value: 0,
      date: '',
    };

    if (!action || typeof action !== 'object') {
      return fallback;
    }

    // Extract date
    const dateVal = action.Date ?? action.date ?? '';
    if (typeof dateVal !== 'string' || !isValidDateString(dateVal)) {
      return fallback;
    }

    // Check for dividend
    const divAmount = Number(action.Dividends ?? action.dividends ?? action.amount);
    if (!isNaN(divAmount) && divAmount > 0) {
      return {
        valid: true,
        type: 'dividend' as const,
        value: divAmount,
        date: dateVal,
      };
    }

    // Check for stock split
    const splitVal = action['Stock Splits'] ?? action.stock_splits ?? action.stockSplits;
    const splitNum = Number(splitVal);
    if (!isNaN(splitNum) && splitNum > 0 && splitNum !== 1) {
      return {
        valid: true,
        type: 'split' as const,
        value: splitNum,
        date: dateVal,
      };
    }

    // If neither dividend nor split is present/positive
    if (!isNaN(divAmount) && divAmount === 0 && !isNaN(splitNum) && splitNum === 0) {
      // Both are 0 - this row has no corporate action
      return fallback;
    }

    return fallback;
  }
}