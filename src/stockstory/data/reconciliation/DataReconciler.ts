/**
 * Data Reconciler
 *
 * Orchestrates reconciliation checks across data sources.
 * Detects conflicts and prefers newer data when policy allows.
 */

import type {
  ReconciliationResult,
  ReconciliationCheck,
  ConflictRecord,
  ConflictCategory,
  ConflictSeverity,
} from './ReconciliationTypes';

export class DataReconciler {
  private conflicts: ConflictRecord[] = [];
  private checks: ReconciliationCheck[] = [];

  /**
   * Run all registered reconciliation checks.
   * Returns a ReconciliationResult with pass/fail status.
   */
  reconcile(): ReconciliationResult {
    const passedChecks = this.checks.filter(c => c.passed).length;
    const failedChecks = this.checks.filter(c => !c.passed).length;
    const conflictsBySeverity = { info: 0, warning: 0, error: 0 };

    for (const c of this.conflicts) {
      conflictsBySeverity[c.severity]++;
    }

    return {
      totalChecks: this.checks.length,
      passedChecks,
      failedChecks,
      totalConflicts: this.conflicts.length,
      conflictsBySeverity,
      checks: [...this.checks],
      conflicts: [...this.conflicts],
    };
  }

  /**
   * When two values conflict, prefer the newer one if policy allows.
   * Returns the preferred value and whether a conflict was detected.
   */
  prefersNewerData(newValue: number | null, oldValue: number | null, newDate: string, oldDate: string): {
    preferred: number | null;
    conflict: boolean;
  } {
    if (newValue === oldValue) return { preferred: newValue, conflict: false };
    if (newValue === null) return { preferred: oldValue, conflict: false };
    if (oldValue === null) return { preferred: newValue, conflict: false };

    const conflict = Math.abs((newValue - oldValue) / Math.max(Math.abs(oldValue), 1)) > 0.01;
    if (conflict && newDate >= oldDate) {
      return { preferred: newValue, conflict: true };
    }
    return { preferred: newValue, conflict };
  }

  /**
   * Add a reconciliation check
   */
  addCheck(check: ReconciliationCheck): void {
    this.checks.push(check);
  }

  /**
   * Record a conflict
   */
  recordConflict(conflict: ConflictRecord): void {
    this.conflicts.push(conflict);
  }

  /**
   * Clear all conflicts and checks
   */
  reset(): void {
    this.conflicts = [];
    this.checks = [];
  }

  /**
   * Get unresolved conflicts for a symbol
   */
  getConflictsBySymbol(symbol: string): ConflictRecord[] {
    return this.conflicts.filter(
      c => c.symbol === symbol.toUpperCase() && c.resolvedAt === null
    );
  }

  /**
   * Mark a conflict as resolved
   */
  resolveConflict(conflictId: string, resolution: string): void {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (conflict) {
      conflict.resolvedAt = new Date().toISOString();
      conflict.resolution = resolution;
    }
  }
}

export const dataReconciler = new DataReconciler();
