import { describe, it, expect, beforeEach } from 'vitest';
import { TemporalGuard } from '../TemporalGuard';
import type { SqliteConnection, FactorInput, FinancialInput } from '../TemporalGuard';

function makeMockDb() {
  const tracker = { executed: [] as string[], ran: [] as unknown[][] };
  const db: SqliteConnection = {
    prepare(sql: string) {
      tracker.executed.push(sql);
      return {
        all(...params: unknown[]) { tracker.ran.push(params); return []; },
        run(...params: unknown[]) { tracker.ran.push(params); return { changes: params[0] === '2026-07-01' ? 5 : 0 }; },
        get(...params: unknown[]) { tracker.ran.push(params); return null; },
      };
    },
    exec(sql: string) { tracker.executed.push(sql); },
  };
  return { db, tracker } as const;
}

describe('TemporalGuard', () => {
  describe('guardFactorInsert', () => {
    const futureFactor: FactorInput = {
      symbol: 'TEST', tradeDate: '2026-07-01',
      qualityFactor: 60, valueFactor: 50, growthFactor: 55,
      momentumFactor: 45, riskFactor: 40, sectorStrengthFactor: 50, factorScore: 52,
    };
    const pastFactor: FactorInput = { ...futureFactor, tradeDate: '2026-01-01' };
    const todayFactor: FactorInput = { ...futureFactor, tradeDate: '2026-06-27' };

    it('blocks future-dated tradeDate', () => {
      const result = TemporalGuard.guardFactorInsert(futureFactor, '2026-06-27');
      expect(result.allowed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('BLOCK');
      expect(result.violations[0].deltaDays).toBeGreaterThan(0);
      expect(result.summary).toContain('BLOCKED');
    });

    it('allows past-dated tradeDate', () => {
      const result = TemporalGuard.guardFactorInsert(pastFactor, '2026-06-27');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.summary).toContain('PASS');
    });

    it('allows same-day tradeDate', () => {
      const result = TemporalGuard.guardFactorInsert(todayFactor, '2026-06-27');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('warns on invalid tradeDate', () => {
      const invalid = { ...futureFactor, tradeDate: '' };
      const result = TemporalGuard.guardFactorInsert(invalid, '2026-06-27');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('WARN');
      expect(result.summary).toContain('PASS');
    });

    it('warns on clearly invalid date string', () => {
      const invalid = { ...futureFactor, tradeDate: 'not-a-date' };
      const result = TemporalGuard.guardFactorInsert(invalid, '2026-06-27');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('WARN');
    });

    it('blocks factor far in the future with BLOCK severity', () => {
      const farFuture = { ...futureFactor, tradeDate: '2027-01-01' };
      const result = TemporalGuard.guardFactorInsert(farFuture, '2026-06-27');
      expect(result.allowed).toBe(false);
      expect(result.violations[0].severity).toBe('BLOCK');
      expect(result.violations[0].deltaDays).toBeGreaterThan(100);
    });
  });

  describe('guardFinancialInsert', () => {
    const futureFinancial: FinancialInput = {
      symbol: 'TEST', periodEnd: '2026-08-15', peRatio: 18, roe: 0.15, roce: 0.12,
    };
    const pastFinancial: FinancialInput = { ...futureFinancial, periodEnd: '2026-03-31' };
    const todayFinancial: FinancialInput = { ...futureFinancial, periodEnd: '2026-06-27' };

    it('blocks future-dated periodEnd', () => {
      const result = TemporalGuard.guardFinancialInsert(futureFinancial, '2026-06-27');
      expect(result.allowed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('BLOCK');
      expect(result.summary).toContain('BLOCKED');
    });

    it('allows past-dated periodEnd', () => {
      const result = TemporalGuard.guardFinancialInsert(pastFinancial, '2026-06-27');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.summary).toContain('PASS');
    });

    it('allows same-day periodEnd', () => {
      const result = TemporalGuard.guardFinancialInsert(todayFinancial, '2026-06-27');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('allows invalid periodEnd (isNaN) — no violation', () => {
      const invalid = { ...futureFinancial, periodEnd: 'invalid-date' };
      const result = TemporalGuard.guardFinancialInsert(invalid, '2026-06-27');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('blocks financial snapshot far in the future', () => {
      const farFuture = { ...futureFinancial, periodEnd: '2027-06-01' };
      const result = TemporalGuard.guardFinancialInsert(farFuture, '2026-06-27');
      expect(result.allowed).toBe(false);
      expect(result.violations[0].deltaDays).toBeGreaterThan(300);
    });
  });

  describe('guardQualityAgainstPrediction', () => {
    it('allows when qualityDate is null', () => {
      const result = TemporalGuard.guardQualityAgainstPrediction(null, '2026-06-27', 'TEST');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.summary).toContain('PASS');
    });

    it('allows when qualityDate <= predictionDate', () => {
      const result = TemporalGuard.guardQualityAgainstPrediction('2026-06-01', '2026-06-27', 'TEST');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.summary).toContain('PASS');
    });

    it('blocks when qualityDate > predictionDate (look-ahead leakage)', () => {
      const result = TemporalGuard.guardQualityAgainstPrediction('2026-07-01', '2026-06-27', 'TEST');
      expect(result.allowed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('BLOCK');
      expect(result.violations[0].message).toContain('LOOK-AHEAD LEAKAGE');
    });

    it('warns on invalid dates', () => {
      const result = TemporalGuard.guardQualityAgainstPrediction('invalid', '2026-06-27', 'TEST');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('WARN');
    });

    it('blocks when quality is significantly ahead', () => {
      const result = TemporalGuard.guardQualityAgainstPrediction('2027-01-01', '2026-06-27', 'TEST');
      expect(result.allowed).toBe(false);
      expect(result.violations[0].deltaDays).toBeGreaterThan(100);
    });

    it('handles same date quality and prediction', () => {
      const result = TemporalGuard.guardQualityAgainstPrediction('2026-06-27', '2026-06-27', 'TEST');
      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('auditDatabase', () => {
    it('returns zero violations for empty database', () => {
      const { db } = makeMockDb();
      const result = TemporalGuard.auditDatabase(db);
      expect(result.totalViolations).toBe(0);
      expect(result.byTable).toEqual({});
      expect(result.worstOffenders).toEqual([]);
    });

    it('handles database query errors gracefully', () => {
      const brokenDb: SqliteConnection = {
        prepare() { throw new Error('no such table'); },
        exec() {},
      };
      const result = TemporalGuard.auditDatabase(brokenDb);
      expect(result.totalViolations).toBe(0);
    });

    it('returns violations when rows exist', () => {
      const db: SqliteConnection = {
        prepare(sql: string) {
          return {
            all(...params: unknown[]) {
              if (sql.includes('quality_registry')) {
                return [{ symbol: 'TEST', delta: 5 }, { symbol: 'VIOLATION', delta: 30 }];
              }
              if (sql.includes('factor_snapshots')) {
                return [{ symbol: 'BADCO', delta: 10 }];
              }
              return [];
            },
            run() { return { changes: 0 }; },
            get() { return null; },
          };
        },
        exec() {},
      };
      const result = TemporalGuard.auditDatabase(db);
      expect(result.totalViolations).toBe(3);
      expect(result.byTable).toEqual({ quality_registry: 2, factor_snapshots: 1 });
      expect(result.worstOffenders[0].symbol).toBe('VIOLATION');
      expect(result.worstOffenders[0].deltaDays).toBe(30);
    });

    it('limits worst offenders to 10', () => {
      const manyRows = Array.from({ length: 20 }, (_, i) => ({ symbol: `S${i}`, delta: i }));
      let callCount = 0;
      const db: SqliteConnection = {
        prepare() {
          callCount++;
          return { all() { return callCount === 1 ? manyRows : []; }, run() { return { changes: 0 }; }, get() { return null; } };
        },
        exec() {},
      };
      const result = TemporalGuard.auditDatabase(db);
      expect(result.worstOffenders.length).toBe(10);
    });
  });

  describe('purgeFutureRows', () => {
    it('deletes future rows and returns count', () => {
      const { db } = makeMockDb();
      const result = TemporalGuard.purgeFutureRows(db, 'factor_snapshots', 'trade_date', '2026-06-27');
      expect(result.deleted).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('handles database errors gracefully', () => {
      const errorDb: SqliteConnection = {
        prepare() { throw new Error('permission denied'); },
        exec() {},
      };
      const result = TemporalGuard.purgeFutureRows(errorDb, 'factor_snapshots', 'trade_date', '2026-06-27');
      expect(result.deleted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('permission denied');
    });

    it('reports deleted count when rows purged', () => {
      const db: SqliteConnection = {
        prepare(sql: string) {
          return { all() { return []; }, run(...params: unknown[]) { return { changes: 5 }; }, get() { return null; } };
        },
        exec() {},
      };
      const result = TemporalGuard.purgeFutureRows(db, 'financial_snapshots', 'period_end', '2026-07-01');
      expect(result.deleted).toBe(5);
    });
  });

  describe('installTrigger', () => {
    it('creates INSERT and UPDATE triggers', () => {
      const executed: string[] = [];
      const db: SqliteConnection = {
        prepare() { return { all() { return []; }, run() { return { changes: 0 }; }, get() { return null; } }; },
        exec(sql: string) { executed.push(sql); },
      };
      TemporalGuard.installTrigger(db, 'factor_snapshots', 'trade_date');
      const insertTriggers = executed.filter(s => s.includes('CREATE TRIGGER') && s.includes('INSERT'));
      const updateTriggers = executed.filter(s => s.includes('CREATE TRIGGER') && s.includes('UPDATE'));
      const dropTriggers = executed.filter(s => s.includes('DROP TRIGGER'));
      expect(insertTriggers).toHaveLength(1);
      expect(updateTriggers).toHaveLength(1);
      expect(dropTriggers).toHaveLength(2);
      expect(insertTriggers[0]).toContain('trade_date');
      expect(insertTriggers[0]).toContain('RAISE(ABORT');
    });

    it('drops existing triggers before creating new ones', () => {
      const executed: string[] = [];
      const db: SqliteConnection = {
        prepare() { return { all() { return []; }, run() { return { changes: 0 }; }, get() { return null; } }; },
        exec(sql: string) { executed.push(sql); },
      };
      TemporalGuard.installTrigger(db, 'test_table', 'test_date');
      const dropStmts = executed.filter(s => s.startsWith('DROP TRIGGER'));
      expect(dropStmts).toHaveLength(2);
      expect(dropStmts[0]).toContain('test_table_test_date');
    });
  });
});
