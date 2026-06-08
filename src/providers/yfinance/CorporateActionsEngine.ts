/**
 * TRACK-38A — CorporateActionsEngine
 *
 * Stores, retrieves, and validates corporate actions (dividends & splits).
 * Provides adjusted-price continuity checking and action recovery from Yahoo
 * Finance when actions are missing from the database.
 */

import { query } from '../../db';
import { CorporateAction, DailyPriceRecord } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceContinuityResult {
  continuous: boolean;
  breaks: Array<{
    date: string;
    expectedAdjClose: number;
    actualAdjClose: number;
    discrepancy: number;
  }>;
}

export interface RecoveryResult {
  dividendsRecovered: number;
  splitsRecovered: number;
}

// ---------------------------------------------------------------------------
// CorporateActionsEngine
// ---------------------------------------------------------------------------

export class CorporateActionsEngine {
  /**
   * Store dividend records in the corporate_actions table.
   *
   * Uses INSERT OR IGNORE semantics to avoid duplicate entries.
   * Returns the number of rows actually inserted.
   *
   * @param symbol    — Stock symbol (e.g. "RELIANCE.NS").
   * @param dividends — Array of { date, amount } objects.
   * @returns Number of new dividend rows inserted.
   */
  async storeDividends(
    symbol: string,
    dividends: { date: string; amount: number }[],
  ): Promise<number> {
    if (!dividends || dividends.length === 0) return 0;

    let inserted = 0;

    // Insert each dividend individually with conflict handling.
    // Using a loop to ensure row counts are accurate and to avoid
    // complications with multi-row INSERT ... ON CONFLICT across
    // PostgreSQL / SQLite.
    for (const div of dividends) {
      try {
        const result = await query(
          `INSERT INTO corporate_actions (symbol, date, type, value, source)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (symbol, date, type) DO NOTHING`,
          [symbol, div.date, 'dividend', div.amount, 'yfinance'],
        );
        // rowCount may be null on some drivers — default to 0
        inserted += result.rowCount ?? 0;
      } catch {
        // Fallback for drivers that don't support ON CONFLICT (SQLite older versions):
        // try a simple INSERT and swallow duplicate errors.
        try {
          const result = await query(
            `INSERT INTO corporate_actions (symbol, date, type, value, source)
             VALUES ($1, $2, $3, $4, $5)`,
            [symbol, div.date, 'dividend', div.amount, 'yfinance'],
          );
          inserted += result.rowCount ?? 1;
        } catch (innerErr: any) {
          // SQLite "UNIQUE constraint failed" or similar — already exists, skip
          if (
            typeof innerErr?.message === 'string' &&
            /unique|duplicate|already exists/i.test(innerErr.message)
          ) {
            continue;
          }
          throw innerErr;
        }
      }
    }

    return inserted;
  }

  /**
   * Store split records in the corporate_actions table.
   *
   * Uses INSERT OR IGNORE semantics to avoid duplicate entries.
   * Returns the number of rows actually inserted.
   *
   * @param symbol — Stock symbol.
   * @param splits — Array of { date, ratio } objects (e.g. ratio=2 means 2:1 split).
   * @returns Number of new split rows inserted.
   */
  async storeSplits(
    symbol: string,
    splits: { date: string; ratio: number }[],
  ): Promise<number> {
    if (!splits || splits.length === 0) return 0;

    let inserted = 0;

    for (const split of splits) {
      try {
        const result = await query(
          `INSERT INTO corporate_actions (symbol, date, type, value, source)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (symbol, date, type) DO NOTHING`,
          [symbol, split.date, 'split', split.ratio, 'yfinance'],
        );
        inserted += result.rowCount ?? 0;
      } catch {
        try {
          const result = await query(
            `INSERT INTO corporate_actions (symbol, date, type, value, source)
             VALUES ($1, $2, $3, $4, $5)`,
            [symbol, split.date, 'split', split.ratio, 'yfinance'],
          );
          inserted += result.rowCount ?? 1;
        } catch (innerErr: any) {
          if (
            typeof innerErr?.message === 'string' &&
            /unique|duplicate|already exists/i.test(innerErr.message)
          ) {
            continue;
          }
          throw innerErr;
        }
      }
    }

    return inserted;
  }

  /**
   * Retrieve all corporate actions for a symbol ordered by date ascending.
   *
   * @param symbol — Stock symbol.
   * @returns Array of CorporateAction objects.
   */
  async getCorporateActions(symbol: string): Promise<CorporateAction[]> {
    const result = await query(
      `SELECT symbol, date, type, value, source
       FROM corporate_actions
       WHERE symbol = $1
       ORDER BY date ASC`,
      [symbol],
    );

    const rows: any[] = result.rows ?? [];
    return rows.map((row: any): CorporateAction => ({
      symbol: row.symbol,
      date: row.date,
      type: row.type as 'dividend' | 'split',
      value: Number(row.value),
      source: row.source ?? 'unknown',
    }));
  }

  /**
   * Validate adjusted-price continuity for a symbol.
   *
   * For each pair of consecutive daily records, computes the **expected**
   * adjusted close of the later record based on corporate actions and the
   * previous record's close, then compares it against the actual adj_close.
   *
   * The expected value is calculated as:
   *   expected_adj_close = (prev.close * cumulative_split_ratio) - cumulative_dividends
   *
   * Discrepancies larger than a small tolerance (0.01) are recorded as breaks.
   *
   * @param symbol  — Stock symbol.
   * @param records — Array of DailyPriceRecord sorted by date ASC.
   * @returns Object with `continuous` flag and `breaks` array.
   */
  async validateAdjustedPriceContinuity(
    symbol: string,
    records: DailyPriceRecord[],
  ): Promise<PriceContinuityResult> {
    const breaks: PriceContinuityResult['breaks'] = [];
    const TOLERANCE = 0.01;

    if (records.length < 2) {
      return { continuous: true, breaks: [] };
    }

    // Sort by date ascending to guarantee correct ordering
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    // Gather all corporate actions for this symbol (needed for split/dividend adjustments)
    const actions = await this.getCorporateActions(symbol);
    const actionMap = new Map<string, CorporateAction[]>();
    for (const action of actions) {
      const existing = actionMap.get(action.date) || [];
      existing.push(action);
      actionMap.set(action.date, existing);
    }

    // Cumulative split ratio starts at 1.0
    let cumulativeSplitRatio = 1.0;

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      // Apply any corporate actions on current.date (actions typically apply
      // before the next trading day, so we process actions on the current bar's date).
      const dateActions = actionMap.get(current.date) ?? [];
      for (const action of dateActions) {
        if (action.type === 'split') {
          cumulativeSplitRatio *= action.value;
        }
      }

      // The expected adjusted close for the *next* bar is:
      //   next.close * cumulativeSplitRatio - dividends_on_next_date
      //
      // Actually: adj_close should already incorporate splits and dividends.
      // We verify that next.adj_close ≈ next.close * cumulativeSplitRatio - dividends.
      //
      // Dividends on the next bar's date reduce adj_close.
      const nextDateActions = actionMap.get(next.date) ?? [];
      const nextDividends = nextDateActions
        .filter((a) => a.type === 'dividend')
        .reduce((sum, a) => sum + a.value, 0);

      const expectedAdjClose =
        next.close * cumulativeSplitRatio - nextDividends;

      const actualAdjClose = next.adj_close;

      const discrepancy = Math.abs(expectedAdjClose - actualAdjClose);

      if (discrepancy > TOLERANCE) {
        breaks.push({
          date: next.date,
          expectedAdjClose: parseFloat(expectedAdjClose.toFixed(6)),
          actualAdjClose: parseFloat(actualAdjClose.toFixed(6)),
          discrepancy: parseFloat(discrepancy.toFixed(6)),
        });
      }
    }

    return {
      continuous: breaks.length === 0,
      breaks,
    };
  }

  /**
   * Recover missing corporate actions by fetching them from Yahoo Finance
   * and storing any that are not already present.
   *
   * Dynamically imports yfinance to avoid a hard dependency at the module
   * level (allows the module to be loaded even when yfinance is unavailable).
   *
   * @param symbol — Stock symbol (Yahoo Finance format, e.g. "RELIANCE.NS").
   * @returns Counts of recovered dividends and splits.
   */
  async recoverMissingActions(symbol: string): Promise<RecoveryResult> {
    const result: RecoveryResult = { dividendsRecovered: 0, splitsRecovered: 0 };

    try {
      // Dynamic import — yfinance is an ESM package
      const yfModule = await import('yfinance');
      const yf = yfModule.default ?? yfModule;

      const ticker = (yf as any).Ticker(symbol);

      // Fetch dividends
      let dividends: { date: string; amount: number }[] = [];
      try {
        const divData = await ticker.dividends;
        if (divData && typeof divData === 'object') {
          // yfinance returns dividends as an object/map of date → amount
          dividends = Object.entries(divData).map(([date, amount]) => ({
            date: date.slice(0, 10), // normalise to YYYY-MM-DD
            amount: Number(amount),
          }));
        }
      } catch {
        // Dividends fetch failed — continue with an empty array
      }

      // Fetch splits
      let splits: { date: string; ratio: number }[] = [];
      try {
        const splitData = await ticker.splits;
        if (splitData && typeof splitData === 'object') {
          splits = Object.entries(splitData).map(([date, ratio]) => ({
            date: date.slice(0, 10),
            ratio: Number(ratio),
          }));
        }
      } catch {
        // Splits fetch failed — continue with an empty array
      }

      // Store only new ones
      if (dividends.length > 0) {
        result.dividendsRecovered = await this.storeDividends(symbol, dividends);
      }
      if (splits.length > 0) {
        result.splitsRecovered = await this.storeSplits(symbol, splits);
      }
    } catch (err: any) {
      // If yfinance itself isn't available, return zeroes silently.
      // The caller can decide whether to escalate.
      console.warn(
        `[CorporateActionsEngine] recoverMissingActions failed for ${symbol}: ${err?.message ?? err}`,
      );
    }

    return result;
  }
}

export default CorporateActionsEngine;