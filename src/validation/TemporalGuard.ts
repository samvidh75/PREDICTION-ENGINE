/**
 * TRACK-64 AGENT A — TemporalGuard
 * 
 * Production-grade temporal integrity enforcement.
 * Replaces/extends TemporalIntegrityValidator.ts with:
 * - INSERT-time gating (prevents future-dated data entering the system)
 * - Pipeline integration hooks
 * - Automated validation test interface
 * 
 * Goal: 0 look-ahead violations.
 */
// ── Types ──────────────────────────────────────────────────────────

/** Minimum interface for a SQLite connection — works with better-sqlite3 and pool wrappers */
export interface SqliteConnection {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): { changes: number };
    get(...params: unknown[]): unknown;
  };
  exec(sql: string): void;
}

export interface TemporalViolation {
  table: string;
  column: string;
  symbol: string;
  snapshotDate: string;
  referenceDate: string;
  deltaDays: number;
  severity: 'BLOCK' | 'WARN';
  message: string;
}

export interface TemporalGuardResult {
  allowed: boolean;
  violations: TemporalViolation[];
  summary: string;
}

export interface FactorInput {
  symbol: string;
  tradeDate: string;
  qualityFactor: number;
  valueFactor: number;
  growthFactor: number;
  momentumFactor: number;
  riskFactor: number;
  sectorStrengthFactor: number;
  factorScore: number;
}

export interface FinancialInput {
  symbol: string;
  periodEnd: string;
  peRatio: number | null;
  roe: number | null;
  roce: number | null;
  [key: string]: unknown;
}

// ── Core Guard ─────────────────────────────────────────────────────

export class TemporalGuard {
  /**
   * Maximum allowed look-ahead in days before BLOCK.
   * 0 = no future-dated data allowed at all.
   */
  private static MAX_LOOK_AHEAD_DAYS = 0;

  /**
   * Guard a factor snapshot BEFORE insert.
   * Returns { allowed: false } if tradeDate is in the future relative to referenceDate.
   */
  static guardFactorInsert(
    factor: FactorInput,
    referenceDate: string
  ): TemporalGuardResult {
    const violations: TemporalViolation[] = [];
    const refDate = new Date(referenceDate);
    const snapDate = new Date(factor.tradeDate);

    if (isNaN(snapDate.getTime())) {
      violations.push({
        table: 'factor_snapshots',
        column: 'trade_date',
        symbol: factor.symbol,
        snapshotDate: factor.tradeDate,
        referenceDate,
        deltaDays: 0,
        severity: 'WARN',
        message: `Invalid trade_date "${factor.tradeDate}" for ${factor.symbol}`,
      });
    } else if (snapDate > refDate) {
      const deltaDays = Math.ceil(
        (snapDate.getTime() - refDate.getTime()) / 86_400_000
      );
      const severity = deltaDays > TemporalGuard.MAX_LOOK_AHEAD_DAYS ? 'BLOCK' : 'WARN';
      violations.push({
        table: 'factor_snapshots',
        column: 'trade_date',
        symbol: factor.symbol,
        snapshotDate: factor.tradeDate,
        referenceDate,
        deltaDays,
        severity,
        message: `Factor snapshot for ${factor.symbol} is ${deltaDays}d in the future (date: ${factor.tradeDate}, reference: ${referenceDate})`,
      });
    }

    const blocked = violations.some((v) => v.severity === 'BLOCK');
    return {
      allowed: !blocked,
      violations,
      summary: blocked
        ? `BLOCKED: ${violations.length} temporal violation(s)`
        : `PASS: factor_snapshots for ${factor.symbol} is temporally valid`,
    };
  }

  /**
   * Guard a financial snapshot BEFORE insert.
   */
  static guardFinancialInsert(
    financial: FinancialInput,
    referenceDate: string
  ): TemporalGuardResult {
    const violations: TemporalViolation[] = [];
    const refDate = new Date(referenceDate);
    const periodEnd = new Date(financial.periodEnd);

    if (!isNaN(periodEnd.getTime()) && periodEnd > refDate) {
      const deltaDays = Math.ceil(
        (periodEnd.getTime() - refDate.getTime()) / 86_400_000
      );
      violations.push({
        table: 'financial_snapshots',
        column: 'period_end',
        symbol: financial.symbol,
        snapshotDate: financial.periodEnd,
        referenceDate,
        deltaDays,
        severity: 'BLOCK',
        message: `Financial snapshot for ${financial.symbol} has period_end ${financial.periodEnd} which is ${deltaDays}d in the future`,
      });
    }

    const blocked = violations.some((v) => v.severity === 'BLOCK');
    return {
      allowed: !blocked,
      violations,
      summary: blocked
        ? `BLOCKED: financial snapshot for ${financial.symbol} is future-dated`
        : `PASS: financial_snapshots for ${financial.symbol} is temporally valid`,
    };
  }

  /**
   * Guard quality_registry.data_date relative to prediction_date.
   * This is the primary look-ahead leakage vector identified in TRACK-60/64.
   */
  static guardQualityAgainstPrediction(
    qualityDate: string | null,
    predictionDate: string,
    symbol: string
  ): TemporalGuardResult {
    const violations: TemporalViolation[] = [];

    if (!qualityDate) {
      return { allowed: true, violations: [], summary: 'PASS: no quality date to check' };
    }

    const qDate = new Date(qualityDate);
    const pDate = new Date(predictionDate);

    if (isNaN(qDate.getTime()) || isNaN(pDate.getTime())) {
      violations.push({
        table: 'quality_registry',
        column: 'data_date',
        symbol,
        snapshotDate: qualityDate,
        referenceDate: predictionDate,
        deltaDays: 0,
        severity: 'WARN',
        message: `Invalid date comparison: quality=${qualityDate}, prediction=${predictionDate}`,
      });
    } else if (qDate > pDate) {
      const deltaDays = Math.ceil(
        (qDate.getTime() - pDate.getTime()) / 86_400_000
      );
      violations.push({
        table: 'quality_registry',
        column: 'data_date',
        symbol,
        snapshotDate: qualityDate,
        referenceDate: predictionDate,
        deltaDays,
        severity: 'BLOCK',
        message: `Quality data for ${symbol} (${qualityDate}) is ${deltaDays}d AFTER prediction date (${predictionDate}) — LOOK-AHEAD LEAKAGE`,
      });
    }

    const blocked = violations.some((v) => v.severity === 'BLOCK');
    return {
      allowed: !blocked,
      violations,
      summary: blocked
        ? `BLOCKED: quality_registry has future-dated data for ${symbol}`
        : `PASS: quality date <= prediction date for ${symbol}`,
    };
  }

  /**
   * Bulk audit: scan the database for existing look-ahead violations.
   * Used by automated validation tests.
   */
  static auditDatabase(db: SqliteConnection): {
    totalViolations: number;
    byTable: Record<string, number>;
    worstOffenders: Array<{ symbol: string; deltaDays: number }>;
  } {
    const violations: Array<{ table: string; symbol: string; deltaDays: number }> = [];

    // Check quality_registry vs prediction_registry
    try {
      const rows = db
        .prepare(
          `SELECT p.symbol, q.data_date, p.prediction_date,
                  CAST(julianday(q.data_date) - julianday(p.prediction_date) AS INTEGER) as delta
           FROM prediction_registry p
           JOIN quality_registry q ON p.symbol = q.symbol
           WHERE q.data_date > p.prediction_date`
        )
        .all() as Array<{ symbol: string; delta: number }>;

      for (const row of rows) {
        violations.push({ table: 'quality_registry', symbol: row.symbol, deltaDays: row.delta });
      }
    } catch {
      // Tables may not exist
    }

    // Check factor_snapshots vs prediction_registry
    try {
      const rows = db
        .prepare(
          `SELECT p.symbol, f.trade_date, p.prediction_date,
                  CAST(julianday(f.trade_date) - julianday(p.prediction_date) AS INTEGER) as delta
           FROM prediction_registry p
           JOIN factor_snapshots f ON p.symbol = f.symbol AND f.trade_date > p.prediction_date`
        )
        .all() as Array<{ symbol: string; delta: number }>;

      for (const row of rows) {
        violations.push({ table: 'factor_snapshots', symbol: row.symbol, deltaDays: row.delta });
      }
    } catch {
      // Tables may not exist
    }

    const byTable: Record<string, number> = {};
    for (const v of violations) {
      byTable[v.table] = (byTable[v.table] || 0) + 1;
    }

    const worst = violations
      .sort((a, b) => b.deltaDays - a.deltaDays)
      .slice(0, 10)
      .map((v) => ({ symbol: v.symbol, deltaDays: v.deltaDays }));

    return {
      totalViolations: violations.length,
      byTable,
      worstOffenders: worst,
    };
  }

  /**
   * Purge future-dated rows from a specific table.
   * ONLY call after verifying these rows are truly erroneous.
   */
  static purgeFutureRows(
    db: SqliteConnection,
    table: string,
    dateColumn: string,
    referenceDate: string
  ): { deleted: number; errors: string[] } {
    const errors: string[] = [];
    let deleted = 0;
    try {
      const result = db
        .prepare(`DELETE FROM [${table}] WHERE ${dateColumn} > ?`)
        .run(referenceDate);
      deleted = result.changes;
    } catch (e: unknown) {
      errors.push(`Failed to purge ${table}: ${(e as Error).message}`);
    }
    return { deleted, errors };
  }

  /**
   * Prevent INSERT of future-dated rows with a SQLite trigger.
   * Creates a trigger that raises an error on INSERT/UPDATE with future dates.
   */
  static installTrigger(
    db: SqliteConnection,
    table: string,
    dateColumn: string
  ): void {
    const triggerName = `temporal_guard_${table}_${dateColumn}`;

    // Drop existing trigger if any
    db.exec(`DROP TRIGGER IF EXISTS ${triggerName}`);

    // Create new trigger
    db.exec(`
      CREATE TRIGGER ${triggerName}
      BEFORE INSERT ON [${table}]
      FOR EACH ROW
      BEGIN
        SELECT CASE
          WHEN NEW.${dateColumn} > datetime('now') THEN
            RAISE(ABORT, 'TemporalGuard: Cannot INSERT future-dated row into ${table}.${dateColumn} = ' || NEW.${dateColumn})
        END;
      END;
    `);

    // Also guard UPDATE
    const updateTriggerName = `temporal_guard_${table}_${dateColumn}_update`;
    db.exec(`DROP TRIGGER IF EXISTS ${updateTriggerName}`);
    db.exec(`
      CREATE TRIGGER ${updateTriggerName}
      BEFORE UPDATE ON [${table}]
      FOR EACH ROW
      BEGIN
        SELECT CASE
          WHEN NEW.${dateColumn} > datetime('now') THEN
            RAISE(ABORT, 'TemporalGuard: Cannot UPDATE to future-dated row in ${table}.${dateColumn} = ' || NEW.${dateColumn})
        END;
      END;
    `);
  }
}

export default TemporalGuard;
