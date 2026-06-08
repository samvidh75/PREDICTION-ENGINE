/**
 * TRACK-38B — DailyMarketUpdater
 * Post-market-close ingestion pipeline.
 * Fetches latest candles, fills gaps, upserts into daily_prices.
 * Fully idempotent — safe to run multiple times per day.
 */

import yf from 'yfinance';
import { query } from '../../db';
import { IndianSymbolMapper } from './IndianSymbolMapper';
import type { DailyPriceRecord } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How many trading days back to fetch per symbol per run. */
const DEFAULT_FETCH_DAYS = 5;

/** How many calendar days back to scan for missing data. */
const DEFAULT_LOOKBACK_DAYS = 30;

/** Universe names recognised by IndianSymbolMapper. */
type UniverseKey = 'NIFTY50' | 'NIFTY100' | 'NIFTY500';

/** Result shape returned by updateDatabase. */
interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
}

/** Result shape returned by runDailyUpdate. */
interface DailyUpdateResult {
  symbolsProcessed: number;
  recordsInserted: number;
  gapsDetected: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date as YYYY-MM-DD in local time. */
const fmtDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Add (or subtract) calendar days from a YYYY-MM-DD string. */
const addDays = (dateStr: string, n: number): string => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
};

/** Return a list of calendar dates between start and end (inclusive). */
const dateRange = (start: string, end: string): string[] => {
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
};

// ---------------------------------------------------------------------------
// DailyMarketUpdater
// ---------------------------------------------------------------------------

export class DailyMarketUpdater {

  // ---- detectMissingDays --------------------------------------------------

  /**
   * Query the database for gaps in daily_prices for a given symbol over the
   * last `lookbackDays` calendar days. Returns date strings (YYYY-MM-DD) that
   * have no row. Excludes weekends and public holidays? We keep it simple:
   * every calendar day is compared; the caller should understand that
   * Saturdays/Sundays will naturally be "missing" in most markets.
   */
  async detectMissingDays(
    symbol: string,
    lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
  ): Promise<string[]> {
    const end = fmtDate(new Date());
    const start = addDays(end, -(lookbackDays - 1));

    const result = await query(
      `SELECT DISTINCT date
       FROM daily_prices
       WHERE symbol = $1
         AND date >= $2
         AND date <= $3
       ORDER BY date`,
      [symbol, start, end],
    );

    const existing = new Set<string>(
      (result.rows ?? []).map((r: any) =>
        r.date instanceof Date ? fmtDate(r.date) : String(r.date).slice(0, 10),
      ),
    );

    const allDates = dateRange(start, end);
    return allDates.filter((d) => !existing.has(d));
  }

  // ---- fetchLatestCandles -------------------------------------------------

  /**
   * Fetch the last `DEFAULT_FETCH_DAYS` trading days of OHLCV data for every
   * symbol in the list. Uses yfinance's download which returns a MultiIndex
   * DataFrame-like structure. Symbols are passed as-is (already mapped).
   */
  async fetchLatestCandles(symbols: string[]): Promise<DailyPriceRecord[]> {
    if (symbols.length === 0) return [];

    const records: DailyPriceRecord[] = [];
    const now = new Date().toISOString();

    // yfinance download returns an object keyed by symbol → array of rows.
    // The exact shape depends on yfinance@0.1.3 — we handle it defensively.
    const yahooSymbols = symbols.map((s) => IndianSymbolMapper.toYahooSymbol(s));
    const data: any = await (yf as any).download(yahooSymbols, {
      period: '5d',
      interval: '1d',
    });

    for (const sym of symbols) {
      const ySym = IndianSymbolMapper.toYahooSymbol(sym);
      const rows: any[] = data?.[ySym] ?? data?.ticker?.[ySym] ?? [];

      for (const row of rows) {
        // yfinance@0.1.3 sometimes returns Date objects, sometimes strings
        const dateStr =
          row.Date instanceof Date
            ? fmtDate(row.Date)
            : typeof row.Date === 'string'
              ? row.Date.slice(0, 10)
              : row.date instanceof Date
                ? fmtDate(row.date)
                : String(row.date ?? row.Date ?? '').slice(0, 10);

        if (!dateStr || dateStr.length < 10) continue;

        records.push({
          symbol: sym,
          date: dateStr,
          open: Number(row.Open ?? row.open ?? 0),
          high: Number(row.High ?? row.high ?? 0),
          low: Number(row.Low ?? row.low ?? 0),
          close: Number(row.Close ?? row.close ?? 0),
          adj_close: Number(row['Adj Close'] ?? row.adj_close ?? row.close ?? 0),
          volume: Number(row.Volume ?? row.volume ?? 0),
          dividends: Number(row.Dividends ?? row.dividends ?? 0),
          stock_splits: Number(row['Stock Splits'] ?? row.stock_splits ?? 0),
          source: 'yfinance',
          quality_score: 1,
          ingested_at: now,
        });
      }
    }

    return records;
  }

  // ---- updateDatabase -----------------------------------------------------

  /**
   * Upsert records into daily_prices. Uses ON CONFLICT DO UPDATE so repeated
   * runs are idempotent — no duplicate rows are ever created.
   */
  async updateDatabase(records: DailyPriceRecord[]): Promise<UpsertResult> {
    if (records.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    // We process in small batches to avoid giant parameterised queries.
    const BATCH = 100;
    for (let i = 0; i < records.length; i += BATCH) {
      const chunk = records.slice(i, i + BATCH);

      // Build a multi-row INSERT … ON CONFLICT upsert.
      // Columns match DailyPriceRecord.
      const placeholders: string[] = [];
      const values: any[] = [];
      let idx = 0;

      for (const r of chunk) {
        placeholders.push(
          `(${idx + 1}, ${idx + 2}, ${idx + 3}, ${idx + 4}, ${idx + 5}, ${idx + 6}, ${idx + 7}, ${idx + 8}, ${idx + 9}, ${idx + 10}, ${idx + 11}, ${idx + 12}, ${idx + 13})`,
        );
        values.push(
          r.symbol,
          r.date,
          r.open,
          r.high,
          r.low,
          r.close,
          r.adj_close,
          r.volume,
          r.dividends,
          r.stock_splits,
          r.source,
          r.quality_score,
          r.ingested_at,
        );
        idx += 13;
      }

      const sql = `
        INSERT INTO daily_prices
          (symbol, date, open, high, low, close, adj_close, volume,
           dividends, stock_splits, source, quality_score, ingested_at)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (symbol, date)
        DO UPDATE SET
          open        = EXCLUDED.open,
          high        = EXCLUDED.high,
          low         = EXCLUDED.low,
          close       = EXCLUDED.close,
          adj_close   = EXCLUDED.adj_close,
          volume      = EXCLUDED.volume,
          dividends   = EXCLUDED.dividends,
          stock_splits= EXCLUDED.stock_splits,
          source      = EXCLUDED.source,
          quality_score = EXCLUDED.quality_score,
          ingested_at = EXCLUDED.ingested_at
      `;

      try {
        const res = await query(sql, values);
        // rowCount is number of rows affected. In an upsert each row counts once,
        // but we don't easily distinguish insert vs update without RETURNING.
        // We approximate: if no prior row for that (symbol,date) it's an insert.
        // We'll run a lightweight check.
        const rowCount = res?.rowCount ?? chunk.length;
        // Approximation: if ON CONFLICT didn't fire for a row it was inserted.
        // Since we can't easily tell, we'll treat all as inserted for the report.
        // More accurate: run a SELECT count before upsert for each chunk.
        const symbolsInChunk = [...new Set(chunk.map((r) => r.symbol))];
        const datesInChunk = [...new Set(chunk.map((r) => r.date))];

        const preResult = await query(
          `SELECT COUNT(*) as cnt FROM daily_prices
           WHERE symbol = ANY($1) AND date = ANY($2)`,
          [symbolsInChunk, datesInChunk],
        );
        const preCount = parseInt(String(preResult?.rows?.[0]?.cnt ?? 0), 10);

        // After upsert, every row exists. inserted = new rows.
        const afterCount = chunk.length;
        inserted += afterCount - Math.min(preCount, afterCount);
        // The rest were updated (already existed).
        const chunkUpdated = Math.min(preCount, afterCount);
        updated += chunkUpdated;
      } catch (err: any) {
        // If the ON CONFLICT clause isn't supported (SQLite fallback without
        // the unique index), fall back to individual upsert logic.
        skipped += await this._fallbackUpsert(chunk, inserted, updated);
      }
    }

    return { inserted, updated, skipped };
  }

  /** Row-by-row fallback for databases without ON CONFLICT support. */
  private async _fallbackUpsert(
    chunk: DailyPriceRecord[],
    _ins: number,
    _upd: number,
  ): Promise<number> {
    let skipped = 0;
    for (const r of chunk) {
      try {
        const exists = await query(
          `SELECT 1 FROM daily_prices WHERE symbol = $1 AND date = $2`,
          [r.symbol, r.date],
        );
        if ((exists?.rows?.length ?? 0) > 0) {
          await query(
            `UPDATE daily_prices
             SET open=$1, high=$2, low=$3, close=$4, adj_close=$5,
                 volume=$6, dividends=$7, stock_splits=$8, source=$9,
                 quality_score=$10, ingested_at=$11
             WHERE symbol=$12 AND date=$13`,
            [
              r.open, r.high, r.low, r.close, r.adj_close,
              r.volume, r.dividends, r.stock_splits, r.source,
              r.quality_score, r.ingested_at,
              r.symbol, r.date,
            ],
          );
        } else {
          await query(
            `INSERT INTO daily_prices
               (symbol, date, open, high, low, close, adj_close,
                volume, dividends, stock_splits, source, quality_score, ingested_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
              r.symbol, r.date, r.open, r.high, r.low, r.close,
              r.adj_close, r.volume, r.dividends, r.stock_splits,
              r.source, r.quality_score, r.ingested_at,
            ],
          );
        }
      } catch {
        skipped++;
      }
    }
    return skipped;
  }

  // ---- validateContinuity -------------------------------------------------

  /**
   * Check whether the latest 30 calendar days have any gaps in daily_prices
   * for the given symbol. Returns the list of gap dates and the most recent
   * date that *does* exist.
   */
  async validateContinuity(
    symbol: string,
  ): Promise<{ continuous: boolean; gaps: string[]; lastDate: string | null }> {
    const end = fmtDate(new Date());
    const start = addDays(end, -29);

    const result = await query(
      `SELECT date FROM daily_prices
       WHERE symbol = $1 AND date >= $2 AND date <= $3
       ORDER BY date`,
      [symbol, start, end],
    );

    const existing = new Set<string>(
      (result.rows ?? []).map((r: any) =>
        r.date instanceof Date ? fmtDate(r.date) : String(r.date).slice(0, 10),
      ),
    );

    const allDates = dateRange(start, end);
    const gaps = allDates.filter((d) => !existing.has(d));

    const datesArr = [...existing].sort();
    const lastDate = datesArr.length > 0 ? datesArr[datesArr.length - 1] : null;

    return {
      continuous: gaps.length === 0,
      gaps,
      lastDate,
    };
  }

  // ---- runDailyUpdate -----------------------------------------------------

  /**
   * Main entry point. Fetches symbols for the given universe (or NIFTY50
   * by default), pulls latest candles, upserts them, and reports gaps found.
   * Fully idempotent — duplicate runs won't create duplicate rows.
   */
  async runDailyUpdate(
    universe: UniverseKey = 'NIFTY50',
  ): Promise<DailyUpdateResult> {
    const t0 = Date.now();

    // 1. Resolve symbols for the universe.
    const symbols = IndianSymbolMapper.getUniverse(universe);
    const yahooSymbols = symbols.map((s: string) => IndianSymbolMapper.toYahooSymbol(s));

    // 2. Fetch latest candles.
    const records = await this.fetchLatestCandles(symbols);

    // 3. Upsert into DB.
    const upsertResult = await this.updateDatabase(records);

    // 4. Check gaps across the universe.
    let gapsDetected = 0;
    for (const sym of symbols) {
      const { gaps } = await this.validateContinuity(sym);
      gapsDetected += gaps.length;
    }

    const durationMs = Date.now() - t0;

    return {
      symbolsProcessed: symbols.length,
      recordsInserted: upsertResult.inserted,
      gapsDetected,
      durationMs,
    };
  }
}

export default DailyMarketUpdater;
