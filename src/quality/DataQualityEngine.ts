/**
 * DataQualityEngine — TRACK-21 Phase 6 Task 16
 *
 * Validates data entering the Lensory pipeline before it reaches
 * the FactorEngine and ranking system.
 *
 * Checks:
 *   - NaN detection
 *   - Infinity detection
 *   - Null explosions (all critical fields null)
 *   - Snapshot staleness
 *   - Outlier fundamentals (physically impossible values)
 *   - Invalid factor scores (out of 0-100 range)
 */

export interface DQEIssue {
  symbol: string;
  stage: string;
  field: string;
  value: any;
  issue: string;
  severity: 'warning' | 'error' | 'critical';
  action: 'flag' | 'replace_with_null' | 'exclude_symbol' | 'abort_pipeline';
}

export interface DQEValidationResult {
  symbol: string;
  passed: boolean;
  issues: DQEIssue[];
  severity: 'clean' | 'warning' | 'error' | 'critical';
}

export interface DQEReport {
  runDate: string;
  totalSymbols: number;
  clean: number;
  warnings: number;
  errors: number;
  critical: number;
  excluded: string[];
  passed: boolean;
  totalChecks: number;
  issues: number;
  criticalIssues: number;
}

/** Outlier ranges for fundamental fields. */
const OUTLIER_RANGES: Record<string, [number, number]> = {
  peRatio: [0.1, 5000],
  pbRatio: [0.01, 100],
  roe: [-5, 5],
  roa: [-1, 1],
  debtToEquity: [-100, 100],
  grossMargin: [-1, 1],
  operatingMargin: [-1, 1],
  revenueGrowth: [-1, 50],
  profitGrowth: [-1, 50],
  currentRatio: [0.01, 100],
  marketCap: [1e6, 1e14],
  evEbitda: [0.1, 5000],
  beta: [-5, 5],
  dividendYield: [0, 0.50],
  epsGrowth: [-10, 10],
  fcfGrowth: [-10, 10],
};

const CRITICAL_FIELDS = ['peRatio', 'roe', 'debtToEquity'];
const STALE_THRESHOLD_DAYS = 180;

export class DataQualityEngine {
  private results: DQEValidationResult[] = [];

  /**
   * Validate a single symbol's financial data snapshot.
   */
  validate(
    symbol: string,
    financials: Record<string, any>,
    periodEnd?: string,
    factorScores?: Record<string, number>,
  ): DQEValidationResult {
    const issues: DQEIssue[] = [];

    // Stage 1: NaN Scan
    for (const [field, value] of Object.entries(financials)) {
      if (typeof value === 'number' && isNaN(value)) {
        issues.push({
          symbol, stage: 'NaN', field, value,
          issue: `NaN in ${field}`,
          severity: 'critical',
          action: 'exclude_symbol',
        });
      }
    }

    // Stage 2: Infinity Scan
    for (const [field, value] of Object.entries(financials)) {
      if (typeof value === 'number' && !isFinite(value)) {
        issues.push({
          symbol, stage: 'Infinity', field, value,
          issue: `Infinity in ${field}`,
          severity: 'critical',
          action: 'replace_with_null',
        });
      }
    }

    // Stage 3: Null Explosion
    const criticalNullCount = CRITICAL_FIELDS.filter(f => financials[f] === null || financials[f] === undefined).length;
    if (criticalNullCount === CRITICAL_FIELDS.length) {
      issues.push({
        symbol, stage: 'NullExplosion', field: 'ALL_CRITICAL',
        value: null,
        issue: 'All critical fields null — likely provider failure',
        severity: 'warning',
        action: 'flag',
      });
    }

    // Stage 4: Staleness
    if (periodEnd) {
      const ageDays = (Date.now() - new Date(periodEnd).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > STALE_THRESHOLD_DAYS) {
        issues.push({
          symbol, stage: 'Staleness', field: 'periodEnd',
          value: periodEnd,
          issue: `Snapshot is ${ageDays.toFixed(0)} days old (threshold: ${STALE_THRESHOLD_DAYS})`,
          severity: 'warning',
          action: 'flag',
        });
      }
    }

    // Stage 5: Outlier Detection
    for (const [field, value] of Object.entries(financials)) {
      if (typeof value !== 'number' || value === null) continue;
      const range = OUTLIER_RANGES[field];
      if (range && (value < range[0] || value > range[1])) {
        issues.push({
          symbol, stage: 'Outlier', field, value,
          issue: `${field} = ${value} outside range [${range[0]}, ${range[1]}]`,
          severity: 'error',
          action: 'replace_with_null',
        });
      }
    }

    // Stage 6: Factor Range Check
    if (factorScores) {
      for (const [name, value] of Object.entries(factorScores)) {
        if (!isFinite(value) || isNaN(value) || value < 0 || value > 100) {
          issues.push({
            symbol, stage: 'FactorRange', field: name, value,
            issue: `Factor ${name} = ${value} is out of [0, 100] range`,
            severity: 'critical',
            action: 'exclude_symbol',
          });
        }
      }
    }

    // Determine severity
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasError = issues.some(i => i.severity === 'error');
    const severity = hasCritical ? 'critical' : hasError ? 'error' : issues.length > 0 ? 'warning' : 'clean';

    const result: DQEValidationResult = {
      symbol,
      passed: !hasCritical,
      issues,
      severity,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Validate a batch of symbols.
   */
  validateBatch(
    data: Array<{ symbol: string; financials: Record<string, any>; periodEnd?: string; factorScores?: Record<string, number> }>,
  ): DQEValidationResult[] {
    for (const entry of data) {
      this.validate(entry.symbol, entry.financials, entry.periodEnd, entry.factorScores);
    }
    return [...this.results];
  }

  /**
   * Generate a summary report.
   */
  generateReport(): DQEReport {
    const clean = this.results.filter(r => r.severity === 'clean').length;
    const warnings = this.results.filter(r => r.severity === 'warning').length;
    const errors = this.results.filter(r => r.severity === 'error').length;
    const critical = this.results.filter(r => r.severity === 'critical').length;
    const excluded = this.results.filter(r => !r.passed).map(r => r.symbol);

    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalIssues = this.results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'critical').length, 0);

    // Pipeline passes if < 5% of symbols have critical issues
    const criticalPercent = this.results.length > 0 ? (critical / this.results.length) * 100 : 0;
    const passed = criticalPercent < 5;

    return {
      runDate: new Date().toISOString().split('T')[0],
      totalSymbols: this.results.length,
      clean,
      warnings,
      errors,
      critical,
      excluded,
      passed,
      totalChecks: this.results.length,
      issues: totalIssues,
      criticalIssues,
    };
  }

  /**
   * Get all validation results.
   */
  getResults(): DQEValidationResult[] {
    return [...this.results];
  }

  /**
   * Reset accumulated results.
   */
  reset(): void {
    this.results = [];
  }
}

export default DataQualityEngine;
