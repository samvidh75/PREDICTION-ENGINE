/**
 * Reconciliation Types
 *
 * Types for detecting and tracking data conflicts across sources.
 */

export type ConflictSeverity = 'info' | 'warning' | 'error';
export type ConflictCategory =
  | 'identity_mismatch'
  | 'sector_mismatch'
  | 'financial_value_mismatch'
  | 'date_mismatch'
  | 'duplicate_symbol'
  | 'corporate_action_mismatch'
  | 'shareholding_period_mismatch'
  | 'document_duplicate'
  | 'stale_value';

export interface ConflictRecord {
  id: string;
  symbol: string;
  category: ConflictCategory;
  field: string;
  leftValue: string | null;
  rightValue: string | null;
  leftSource: string;
  rightSource: string;
  severity: ConflictSeverity;
  description: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
}

export interface ReconciliationCheck {
  checkId: string;
  checkName: string;
  category: ConflictCategory;
  passed: boolean;
  conflictsFound: number;
  description: string;
}

export interface ReconciliationResult {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  totalConflicts: number;
  conflictsBySeverity: Record<ConflictSeverity, number>;
  checks: ReconciliationCheck[];
  conflicts: ConflictRecord[];
}
