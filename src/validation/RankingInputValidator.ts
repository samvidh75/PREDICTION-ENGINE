/**
 * RankingInputValidator — TRACK-35 Group B
 * Validates every symbol before ranking: minimum fields, confidence, freshness, sector.
 * Status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MISCONFIGURED'
 */
import pool from '../db/index';

export interface ValidationFailure {
  check: string;
  detail: string;
}

export interface ValidationResult {
  symbol: string;
  valid: boolean;
  failures: ValidationFailure[];
}

export interface BatchValidationResult {
  total: number;
  valid: number;
  invalid: number;
  failed: ValidationResult[];
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MISCONFIGURED';
}

export class RankingInputValidator {
  async validateSymbol(symbol: string): Promise<ValidationResult> {
    const failures: ValidationFailure[] = [];

    try {
      await pool.query('SELECT 1');
    } catch {
      failures.push({ check: 'DATABASE', detail: 'Cannot connect to database' });
      return { symbol, valid: false, failures };
    }

    // Check 1: Minimum engine scores (>= 3 non-null)
    try {
      const r = await pool.query(
        `SELECT growth_score, quality_score, value_score, momentum_score, risk_score
         FROM factor_snapshots WHERE symbol = $1 ORDER BY snapshot_date DESC LIMIT 1`,
        [symbol]
      );
      if (r.rows.length === 0) {
        failures.push({ check: 'minimumFieldCount', detail: 'No factor_snapshot found for symbol' });
      } else {
        const row = r.rows[0];
        const nonNull = [row.growth_score, row.quality_score, row.value_score, row.momentum_score, row.risk_score]
          .filter(v => v !== null && v !== undefined).length;
        if (nonNull < 3) {
          failures.push({ check: 'minimumFieldCount', detail: `Only ${nonNull}/5 engine scores available (need >= 3)` });
        }
      }
    } catch {
      failures.push({ check: 'minimumFieldCount', detail: 'Failed to query factor_snapshots' });
    }

    // Check 2: Minimum confidence
    try {
      const r = await pool.query(
        `SELECT confidence_score FROM factor_snapshots WHERE symbol = $1 ORDER BY snapshot_date DESC LIMIT 1`,
        [symbol]
      );
      if (r.rows.length > 0) {
        const conf = parseFloat(r.rows[0].confidence_score ?? 0);
        if (conf < 20) {
          failures.push({ check: 'minimumConfidence', detail: `Confidence score ${conf} < required 20` });
        }
      }
    } catch {}

    // Check 3: Provider freshness (financial data < 90 days)
    try {
      const r = await pool.query(
        `SELECT MAX(period_end) as latest FROM financial_snapshots WHERE symbol = $1`,
        [symbol]
      );
      if (r.rows.length > 0 && r.rows[0].latest) {
        const daysSince = Math.floor((Date.now() - new Date(r.rows[0].latest).getTime()) / 86400000);
        if (daysSince > 90) {
          failures.push({ check: 'providerFreshness', detail: `Financial data ${daysSince} days old (max 90)` });
        }
      } else {
        failures.push({ check: 'providerFreshness', detail: 'No financial snapshot data for symbol' });
      }
    } catch {}

    // Check 4: Sector completeness
    try {
      const r = await pool.query(
        `SELECT sector FROM master_security_registry WHERE symbol = $1`,
        [symbol]
      );
      if (r.rows.length === 0 || !r.rows[0].sector) {
        failures.push({ check: 'sectorCompleteness', detail: 'Symbol has no sector assignment' });
      }
    } catch {}

    return { symbol, valid: failures.length === 0, failures };
  }

  async validateBatch(symbols: string[]): Promise<BatchValidationResult> {
    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch {}

    if (!dbOk) {
      return {
        total: symbols.length,
        valid: 0,
        invalid: symbols.length,
        failed: symbols.map(s => ({ symbol: s, valid: false, failures: [{ check: 'DATABASE', detail: 'Database unavailable' }] })),
        status: 'OFFLINE',
      };
    }

    const failed: ValidationResult[] = [];
    let validCount = 0;

    for (const symbol of symbols) {
      const result = await this.validateSymbol(symbol);
      if (!result.valid) {
        failed.push(result);
      } else {
        validCount++;
      }
    }

    return {
      total: symbols.length,
      valid: validCount,
      invalid: failed.length,
      failed,
      status: validCount / symbols.length > 0.7 ? 'ONLINE' : 'DEGRADED',
    };
  }
}

let _instance: RankingInputValidator | null = null;
export function getRankingInputValidator(): RankingInputValidator {
  if (!_instance) _instance = new RankingInputValidator();
  return _instance;
}
export const rankingInputValidator = new Proxy({} as RankingInputValidator, {
  get: (_, prop) => (getRankingInputValidator() as any)[prop],
});
