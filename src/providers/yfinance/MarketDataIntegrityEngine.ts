/**
 * TRACK-38C — MarketDataIntegrityEngine
 * Data quality scoring and anomaly detection for daily price records.
 * All methods are pure computation — no side effects, no DB writes.
 */

import type { QualityScore, QualityCheck, DailyPriceRecord } from './types';
import { query } from '../../db';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Weighting factors for composite quality score (must sum to 1). */
const WEIGHTS = {
  completeness: 0.35,
  consistency: 0.40,
  freshness: 0.25,
} as const;

/** Maximum acceptable staleness in days before freshness starts decaying. */
const MAX_FRESH_DAYS = 1;

/** Decay factor per day beyond MAX_FRESH_DAYS. */
const FRESHNESS_DECAY = 0.15;

/** Volume anomaly threshold — multiplier over 20-day average. */
const VOLUME_ANOMALY_MULTIPLIER = 3;

/** Split detection threshold — absolute day-over-day price change. */
const SPLIT_PRICE_CHANGE_THRESHOLD = 0.5; // 50 %

/** Dividend anomaly — dividend > this fraction of closing price. */
const DIVIDEND_PRICE_RATIO = 0.1; // 10 %

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtDate = (d: Date): string => d.toISOString().slice(0, 10);

/** Parse a record's trade_date field (canonical column in daily_prices). */
const recordDate = (r: DailyPriceRecord): string => {
  if (typeof r.trade_date === 'string') return r.trade_date.slice(0, 10);
  return fmtDate(r.trade_date as unknown as Date);
};

/** Days between two YYYY-MM-DD strings. */
const daysBetween = (a: string, b: string): number => {
  const da = new Date(a);
  const db = new Date(b);
  return Math.abs((db.getTime() - da.getTime()) / 86_400_000);
};

/** Generate list of calendar dates between start and end inclusive. */
const dateRange = (start: string, end: string): string[] => {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  const cur = new Date(s);
  while (cur <= e) {
    out.push(fmtDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

// ---------------------------------------------------------------------------
// MarketDataIntegrityEngine
// ---------------------------------------------------------------------------

export class MarketDataIntegrityEngine {
  // ---- scoreDataQuality ---------------------------------------------------

  /**
   * Compute a composite quality score (0-100) for a set of daily price records.
   *
   * - completeness: percentage of expected trading days with data.
   * - consistency: passes sanity checks (no negatives, high >= low, etc.).
   * - freshness: how recent the latest data point is.
   * - overallScore: weighted average of the three sub-scores.
   */
  scoreDataQuality(
    symbol: string,
    records: DailyPriceRecord[],
    expectedStartDate?: string,
  ): QualityScore {
    const checks: QualityCheck[] = [];
    const now = new Date();
    const nowISO = fmtDate(now);

    // --- completeness ------------------------------------------------------
    const sorted = [...records].sort(
      (a, b) => recordDate(a).localeCompare(recordDate(b)),
    );
    const seenDates = new Set(sorted.map(recordDate));

    let completeness = 100;
    if (sorted.length > 1) {
      const first = recordDate(sorted[0]);
      const start = expectedStartDate ?? first;
      const allDates = dateRange(start, fmtDate(now));
      const expectedCount = allDates.length || 1;
      const presentCount = allDates.filter((d) => seenDates.has(d)).length;
      completeness = Math.round((presentCount / expectedCount) * 100);
    }

    checks.push({
      symbol,
      date: nowISO,
      check: 'completeness',
      passed: completeness >= 90,
      detail: `Completeness: ${completeness}% (${seenDates.size} dates)`,
    });

    // --- consistency -------------------------------------------------------
    let consistencyChecks = 0;
    let consistencyPassed = 0;
    const negativeFields: string[] = [];
    const negativeDates: string[] = [];
    const hlViolationDates: string[] = [];

    for (const r of sorted) {
      const d = recordDate(r);
      // Check for negative prices
      for (const f of ['open', 'high', 'low', 'close'] as const) {
        consistencyChecks++;
        if (r[f] < 0) {
          if (!negativeFields.includes(f)) negativeFields.push(f);
          if (!negativeDates.includes(d)) negativeDates.push(d);
        } else {
          consistencyPassed++;
        }
      }
      // Check high >= low
      consistencyChecks++;
      if (r.high >= r.low) {
        consistencyPassed++;
      } else {
        hlViolationDates.push(d);
      }
      // Check high >= open, high >= close
      consistencyChecks++;
      if (r.high >= r.open && r.high >= r.close) {
        consistencyPassed++;
      }
      // Check low <= open, low <= close
      consistencyChecks++;
      if (r.low <= r.open && r.low <= r.close) {
        consistencyPassed++;
      }
      // Check volume >= 0
      consistencyChecks++;
      if (r.volume >= 0) {
        consistencyPassed++;
      }
    }

    const consistency =
      consistencyChecks > 0
        ? Math.round((consistencyPassed / consistencyChecks) * 100)
        : 100;

    checks.push({
      symbol,
      date: nowISO,
      check: 'consistency',
      passed: consistency >= 95,
      detail: `Consistency: ${consistency}% (${consistencyPassed}/${consistencyChecks} checks passed)`,
    });

    // --- freshness ---------------------------------------------------------
    let freshness = 100;
    if (sorted.length > 0) {
      const latest = recordDate(sorted[sorted.length - 1]);
      const ageDays = daysBetween(latest, fmtDate(now));
      if (ageDays <= MAX_FRESH_DAYS) {
        freshness = 100;
      } else {
        freshness = Math.max(
          0,
          Math.round(100 - (ageDays - MAX_FRESH_DAYS) * FRESHNESS_DECAY * 100),
        );
      }
    } else {
      freshness = 0;
    }

    checks.push({
      symbol,
      date: nowISO,
      check: 'freshness',
      passed: freshness >= 70,
      detail: `Freshness: ${freshness}% (latest record age: ${sorted.length > 0 ? daysBetween(recordDate(sorted[sorted.length - 1]), nowISO) : 'N/A'} days)`,
    });

    // --- overallScore ------------------------------------------------------
    const overallScore = Math.round(
      completeness * WEIGHTS.completeness +
        consistency * WEIGHTS.consistency +
        freshness * WEIGHTS.freshness,
    );

    return {
      symbol,
      overallScore,
      completeness,
      consistency,
      freshness,
      checks,
    };
  }

  // ---- detectMissingCandles -----------------------------------------------

  /**
   * Find calendar dates between the earliest record and latest record (or
   * expectedStartDate if provided) that have no row.
   */
  detectMissingCandles(
    records: DailyPriceRecord[],
    expectedStartDate?: string,
  ): { missingDates: string[]; gapCount: number } {
    if (records.length < 2) return { missingDates: [], gapCount: 0 };

    const sorted = [...records].sort(
      (a, b) => recordDate(a).localeCompare(recordDate(b)),
    );
    const start = expectedStartDate ?? recordDate(sorted[0]);
    const end = recordDate(sorted[sorted.length - 1]);
    const seen = new Set(sorted.map(recordDate));

    const allDates = dateRange(start, end);
    const missingDates = allDates.filter((d) => !seen.has(d));

    // Count contiguous gap blocks.
    let gapCount = 0;
    let inGap = false;
    for (const d of allDates) {
      if (!seen.has(d)) {
        if (!inGap) {
          gapCount++;
          inGap = true;
        }
      } else {
        inGap = false;
      }
    }

    return { missingDates, gapCount };
  }

  // ---- detectDuplicateCandles ---------------------------------------------

  /**
   * Find dates that appear more than once in the record set.
   */
  detectDuplicateCandles(
    records: DailyPriceRecord[],
  ): { duplicateDates: string[]; duplicateCount: number } {
    const dateCount = new Map<string, number>();
    for (const r of records) {
      const d = recordDate(r);
      dateCount.set(d, (dateCount.get(d) ?? 0) + 1);
    }

    const duplicateDates: string[] = [];
    let duplicateCount = 0;
    for (const [date, count] of dateCount) {
      if (count > 1) {
        duplicateDates.push(date);
        duplicateCount += count - 1; // extra copies beyond the first
      }
    }

    duplicateDates.sort();
    return { duplicateDates, duplicateCount };
  }

  // ---- detectNegativePrices -----------------------------------------------

  /**
   * Find any records where open, high, low, or close is negative.
   */
  detectNegativePrices(
    records: DailyPriceRecord[],
  ): { symbol: string; fields: string[]; dates: string[] } {
    const fieldsSet = new Set<string>();
    const datesSet = new Set<string>();
    const sym = records.length > 0 ? records[0].symbol : '';

    for (const r of records) {
      const d = recordDate(r);
      for (const f of ['open', 'high', 'low', 'close'] as const) {
        if (r[f] < 0) {
          fieldsSet.add(f);
          datesSet.add(d);
        }
      }
    }

    return {
      symbol: sym,
      fields: [...fieldsSet].sort(),
      dates: [...datesSet].sort(),
    };
  }

  // ---- detectVolumeAnomalies ----------------------------------------------

  /**
   * Flag dates where volume exceeds 3× the 20-day moving average.
   * Uses at minimum 5 records before computing the average.
   */
  detectVolumeAnomalies(
    records: DailyPriceRecord[],
  ): { symbol: string; anomalyDates: string[] } {
    const sorted = [...records].sort(
      (a, b) => recordDate(a).localeCompare(recordDate(b)),
    );
    const sym = sorted.length > 0 ? sorted[0].symbol : '';
    const anomalyDates: string[] = [];

    for (let i = 0; i < sorted.length; i++) {
      // Compute 20-day average from the preceding records (or as many as available).
      const windowStart = Math.max(0, i - 20);
      const window = sorted.slice(windowStart, i);
      if (window.length < 5) continue; // not enough history to judge

      const avgVolume =
        window.reduce((sum, r) => sum + r.volume, 0) / window.length;
      if (avgVolume <= 0) continue;

      if (sorted[i].volume > avgVolume * VOLUME_ANOMALY_MULTIPLIER) {
        anomalyDates.push(recordDate(sorted[i]));
      }
    }

    return { symbol: sym, anomalyDates };
  }

  // ---- detectSplitAnomalies -----------------------------------------------

  /**
   * Detect potential stock split dates: a day-over-day absolute price change
   * exceeding 50 % (either direction). Compares adjusted close values.
   */
  detectSplitAnomalies(
    records: DailyPriceRecord[],
  ): { symbol: string; anomalyDates: string[] } {
    const sorted = [...records].sort(
      (a, b) => recordDate(a).localeCompare(recordDate(b)),
    );
    const sym = sorted.length > 0 ? sorted[0].symbol : '';
    const anomalyDates: string[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prevClose = sorted[i - 1].adjusted_close;
      const curClose = sorted[i].adjusted_close;

      if (prevClose <= 0 || curClose <= 0) continue;

      const pctChange = Math.abs((curClose - prevClose) / prevClose);
      if (pctChange > SPLIT_PRICE_CHANGE_THRESHOLD) {
        anomalyDates.push(recordDate(sorted[i]));
      }
    }

    return { symbol: sym, anomalyDates };
  }

  // ---- detectDividendAnomalies --------------------------------------------

  /**
   * Flag dates where the dividend field exceeds 10 % of the closing price,
   * which likely indicates a data error or corporate action anomaly.
   */
  detectDividendAnomalies(
    records: DailyPriceRecord[],
  ): { symbol: string; anomalyDates: string[] } {
    const sym = records.length > 0 ? records[0].symbol : '';
    const anomalyDates: string[] = [];

    for (const r of records) {
      if (r.dividends <= 0 || r.close <= 0) continue;
      if (r.dividends > r.close * DIVIDEND_PRICE_RATIO) {
        anomalyDates.push(recordDate(r));
      }
    }

    anomalyDates.sort();
    return { symbol: sym, anomalyDates };
  }

  // ---- runFullQualityCheck ------------------------------------------------

  /**
   * Run all quality checks for a symbol by fetching its recent data from the
   * database, scoring it, and running anomaly detectors. Returns a composite
   * QualityScore enriched with anomaly findings.
   */
  async runFullQualityCheck(
    symbol: string,
    lookbackDays: number = 60,
  ): Promise<QualityScore> {
    const end = fmtDate(new Date());
    const start = fmtDate(
      new Date(Date.now() - (lookbackDays - 1) * 86_400_000),
    );

    const result = await query(
      `SELECT * FROM daily_prices
       WHERE symbol = $1 AND trade_date >= $2 AND trade_date <= $3
       ORDER BY trade_date`,
      [symbol, start, end],
    );

    const rows = result?.rows ?? [];
    const records: DailyPriceRecord[] = rows.map((r: any) => ({
      symbol: r.symbol,
      trade_date: r.trade_date instanceof Date ? fmtDate(r.trade_date) : String(r.trade_date).slice(0, 10),
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      adjusted_close: Number(r.adjusted_close ?? r.close),
      volume: Number(r.volume),
      dividends: Number(r.dividends ?? 0),
      stock_splits: Number(r.stock_splits ?? 0),
      source: r.source ?? 'unknown',
      quality_score: Number(r.quality_score ?? 1),
      ingested_at: r.ingested_at ?? new Date().toISOString(),
    }));

    const score = this.scoreDataQuality(symbol, records, start);

    // Append anomaly findings as additional checks.
    const missing = this.detectMissingCandles(records, start);
    const duplicates = this.detectDuplicateCandles(records);
    const negPrices = this.detectNegativePrices(records);
    const volAnoms = this.detectVolumeAnomalies(records);
    const splitAnoms = this.detectSplitAnomalies(records);
    const divAnoms = this.detectDividendAnomalies(records);

    const nowISO = fmtDate(new Date());

    score.checks.push({
      symbol,
      date: nowISO,
      check: 'missing_candles',
      passed: missing.gapCount === 0,
      detail: `Missing candles: ${missing.gapCount} gap(s), ${missing.missingDates.length} date(s)`,
    });

    score.checks.push({
      symbol,
      date: nowISO,
      check: 'duplicates',
      passed: duplicates.duplicateCount === 0,
      detail: `Duplicates: ${duplicates.duplicateCount} extra row(s) across ${duplicates.duplicateDates.length} date(s)`,
    });

    score.checks.push({
      symbol,
      date: nowISO,
      check: 'negative_prices',
      passed: negPrices.fields.length === 0,
      detail: `Negative prices: ${negPrices.fields.join(', ') || 'none'}`,
    });

    score.checks.push({
      symbol,
      date: nowISO,
      check: 'volume_anomalies',
      passed: volAnoms.anomalyDates.length === 0,
      detail: `Volume anomalies: ${volAnoms.anomalyDates.length} date(s)`,
    });

    score.checks.push({
      symbol,
      date: nowISO,
      check: 'split_anomalies',
      passed: splitAnoms.anomalyDates.length === 0,
      detail: `Split anomalies: ${splitAnoms.anomalyDates.length} date(s)`,
    });

    score.checks.push({
      symbol,
      date: nowISO,
      check: 'dividend_anomalies',
      passed: divAnoms.anomalyDates.length === 0,
      detail: `Dividend anomalies: ${divAnoms.anomalyDates.length} date(s)`,
    });

    // Recompute overallScore incorporating anomaly checks.
    // Since QualityCheck no longer carries a numeric score, compute sub-scores inline.
    const anomalyScoreMissing = missing.gapCount === 0 ? 100 : Math.max(0, 100 - missing.gapCount * 5);
    const anomalyScoreDup = duplicates.duplicateCount === 0 ? 100 : Math.max(0, 100 - duplicates.duplicateCount * 10);
    const anomalyScoreNeg = negPrices.fields.length === 0 ? 100 : 0;
    const anomalyScoreVol = volAnoms.anomalyDates.length === 0 ? 100 : Math.max(0, 100 - volAnoms.anomalyDates.length * 2);
    const anomalyScoreSplit = splitAnoms.anomalyDates.length === 0 ? 100 : Math.max(0, 100 - splitAnoms.anomalyDates.length * 10);
    const anomalyScoreDiv = divAnoms.anomalyDates.length === 0 ? 100 : Math.max(0, 100 - divAnoms.anomalyDates.length * 5);

    const avgAnomalyScore =
      (anomalyScoreMissing + anomalyScoreDup + anomalyScoreNeg +
       anomalyScoreVol + anomalyScoreSplit + anomalyScoreDiv) /
      6;

    score.overallScore = Math.round(
      (score.completeness * 0.3 +
        score.consistency * 0.35 +
        score.freshness * 0.2 +
        avgAnomalyScore * 0.15),
    );

    return score;
  }
}

export default MarketDataIntegrityEngine;