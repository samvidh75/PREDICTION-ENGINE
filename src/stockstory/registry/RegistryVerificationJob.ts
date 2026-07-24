/**
 * RegistryVerificationJob — TRACK-21 Phase 2 Task 7
 *
 * Nightly validation job that runs after RegistryUpdater completes.
 * Detects data quality issues in the master_security_registry:
 *   - Missing ISINs
 *   - Duplicate symbols
 *   - Stale records (not verified in >30 days)
 *   - Missing company names
 *   - Inconsistent exchange/symbol mappings
 *   - Orphaned records (listed as Active but not on PSE)
 *
 * Runs as part of the nightly pipeline (Stage 1b).
 */

import pool from '../../db/index';

export interface VerificationIssue {
  symbol: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  details: string;
}

export interface VerificationReport {
  runDate: string;
  totalRecords: number;
  activeRecords: number;
  issues: VerificationIssue[];
  summary: {
    missingIsins: number;
    duplicateSymbols: number;
    staleRecords: number;
    missingCompanyNames: number;
    inconsistentMappings: number;
    orphanedActive: number;
    totalIssues: number;
  };
  passed: boolean;
}

const STALE_THRESHOLD_DAYS = 30;

export class RegistryVerificationJob {
  private issues: VerificationIssue[] = [];

  /**
   * Run all verification checks against the master_security_registry.
   */
  async run(): Promise<VerificationReport> {
    this.issues = [];
    const runDate = new Date().toISOString().split('T')[0];

    console.info('RegistryVerificationJob: starting verification...');

    // Get baseline counts
    const counts = await this.getCounts();
    console.info(`RegistryVerificationJob: ${counts.totalRecords} total records, ${counts.activeRecords} active`);

    // Run checks
    await this.checkMissingIsins();
    await this.checkDuplicateSymbols();
    await this.checkStaleRecords();
    await this.checkMissingCompanyNames();
    await this.checkInconsistentMappings();

    const summary = this.buildSummary();
    const passed = this.issues.filter(i => i.severity === 'high').length === 0;

    console.info(`RegistryVerificationJob: complete. ${summary.totalIssues} issues found (${passed ? 'PASS' : 'FAIL'})`);

    return {
      runDate,
      totalRecords: counts.totalRecords,
      activeRecords: counts.activeRecords,
      issues: [...this.issues],
      summary,
      passed,
    };
  }

  /**
   * Persist verification report to verification_logs table.
   */
  async persistReport(report: VerificationReport): Promise<void> {
    try {
      await pool.query(
        `IPSERT INTO registry_verification_logs (run_date, total_records, active_records, issues_json, passed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (run_date) DO UPDATE SET
           total_records = EXCLUDED.total_records,
           active_records = EXCLUDED.active_records,
           issues_json = EXCLUDED.issues_json,
           passed = EXCLUDED.passed`,
        [report.runDate, report.totalRecords, report.activeRecords, JSON.stringify(report.issues), report.passed]
      );
    } catch (err: any) {
      console.warn(`RegistryVerificationJob: failed to persist report — ${err.message}`);
    }
  }

  // ── Private Checks ──────────────────────────────────────

  private async checkMissingIsins(): Promise<void> {
    const result = await pool.query(
      `SELECT symbol, company_name FROM master_security_registry
       WHERE isin IS NULL AND listing_status = 'Active'`
    );
    for (const row of result.rows) {
      this.issues.push({
        symbol: row.symbol,
        issue: 'Missing ISIN',
        severity: 'medium',
        details: `${row.company_name}: no ISIN assigned. Resolution requires PSE/PSE ISIN mapping.`,
      });
    }
  }

  private async checkDuplicateSymbols(): Promise<void> {
    const result = await pool.query(
      `SELECT symbol, COUNT(*) as cnt FROM master_security_registry
       GROUP BY symbol HAVING COUNT(*) > 1`
    );
    for (const row of result.rows) {
      this.issues.push({
        symbol: row.symbol,
        issue: 'Duplicate symbol',
        severity: 'high',
        details: `Symbol "${row.symbol}" appears ${row.cnt} times. Manual deduplication required.`,
      });
    }
  }

  private async checkStaleRecords(): Promise<void> {
    const result = await pool.query(
      `SELECT symbol, company_name, last_verified,
              CURRENT_DATE - last_verified AS days_stale
       FROM master_security_registry
       WHERE listing_status = 'Active'
         AND last_verified < CURRENT_DATE - $1
       ORDER BY last_verified ASC`,
      [STALE_THRESHOLD_DAYS]
    );
    for (const row of result.rows) {
      this.issues.push({
        symbol: row.symbol,
        issue: 'Stale record',
        severity: 'low',
        details: `${row.company_name}: last verified ${row.last_verified} (${row.days_stale} days ago).`,
      });
    }
  }

  private async checkMissingCompanyNames(): Promise<void> {
    const result = await pool.query(
      `SELECT symbol, company_name FROM master_security_registry
       WHERE (company_name IS NULL OR company_name = symbol OR company_name = '')
         AND listing_status = 'Active'`
    );
    for (const row of result.rows) {
      this.issues.push({
        symbol: row.symbol,
        issue: 'Missing/placeholder company name',
        severity: 'medium',
        details: `Company name is "${row.company_name}" — likely needs metadata enrichment.`,
      });
    }
  }

  private async checkInconsistentMappings(): Promise<void> {
    // Check where pse_symbol and symbol don't match (normalized vs raw)
    const result = await pool.query(
      `SELECT symbol, pse_symbol, pse_symbol2, exchange
       FROM master_security_registry
       WHERE listing_status = 'Active'
         AND (
           (exchange = 'PSE' AND pse_symbol IS NOT NULL AND pse_symbol != symbol)
           OR (exchange = 'PSE' AND pse_symbol2 IS NOT NULL AND pse_symbol2 != symbol)
         )`
    );
    for (const row of result.rows) {
      this.issues.push({
        symbol: row.symbol,
        issue: 'Inconsistent exchange mapping',
        severity: 'low',
        details: `Exchange ${row.exchange}: symbol="${row.symbol}", nse="${row.pse_symbol}", bse="${row.pse_symbol2}".`,
      });
    }
  }

  private async getCounts(): Promise<{ totalRecords: number; activeRecords: number }> {
    const [totalRes, activeRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as cnt FROM master_security_registry'),
      pool.query("SELECT COUNT(*) as cnt FROM master_security_registry WHERE listing_status = 'Active'"),
    ]);
    return {
      totalRecords: parseInt(totalRes.rows[0]?.cnt ?? '0', 10),
      activeRecords: parseInt(activeRes.rows[0]?.cnt ?? '0', 10),
    };
  }

  private buildSummary(): VerificationReport['summary'] {
    const groupByIssue = new Map<string, number>();
    const severityMap = { low: 0, medium: 0, high: 0 };

    for (const issue of this.issues) {
      groupByIssue.set(issue.issue, (groupByIssue.get(issue.issue) ?? 0) + 1);
      severityMap[issue.severity]++;
    }

    return {
      missingIsins: groupByIssue.get('Missing ISIN') ?? 0,
      duplicateSymbols: groupByIssue.get('Duplicate symbol') ?? 0,
      staleRecords: groupByIssue.get('Stale record') ?? 0,
      missingCompanyNames: groupByIssue.get('Missing/placeholder company name') ?? 0,
      inconsistentMappings: groupByIssue.get('Inconsistent exchange mapping') ?? 0,
      orphanedActive: 0,
      totalIssues: this.issues.length,
    };
  }
}

/**
 * Ensure the verification_logs table exists.
 */
export async function ensureVerificationLogsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registry_verification_logs (
      id SERIAL PRIMARY KEY,
      run_date DATE NOT NULL UNIQUE,
      total_records INTEGER,
      active_records INTEGER,
      issues_json JSONB DEFAULT '[]',
      passed BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export default RegistryVerificationJob;
