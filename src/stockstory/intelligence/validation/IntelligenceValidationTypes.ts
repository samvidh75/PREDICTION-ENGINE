/**
 * Lensory Intelligence Validation Types
 * Part 8 — Intelligence Validation, Market Reality Calibration, Analyst-Grade QA
 *
 * Defines all validation result types for checking intelligence outputs
 * against ground truth, compliance rules, and internal consistency.
 */

// ─── Validation Result Types ───────────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationStatus = 'pass' | 'fail' | 'pass_with_limitations' | 'needs_review';

export interface ValidationIssue {
  /** Unique issue identifier */
  id: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Module or engine that produced the issue */
  module: string;
  /** Symbol/company this issue relates to (if applicable) */
  symbol?: string;
  /** Human-readable description of the issue */
  reason: string;
  /** Suggested remediation */
  recommendedFix: string;
  /** Evidence IDs that support this finding (optional) */
  evidenceIds?: string[];
  /** Timestamp of when the issue was detected */
  detectedAt: string;
}

export interface ValidationResult {
  /** Overall pass/fail status */
  status: ValidationStatus;
  /** Module name being validated */
  module: string;
  /** Symbol being validated (if applicable) */
  symbol?: string;
  /** List of all issues found */
  issues: ValidationIssue[];
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Number of info items */
  infoCount: number;
  /** Whether validation passed (no errors) */
  passed: boolean;
  /** Total checks performed */
  totalChecks: number;
  /** Duration of validation in ms */
  durationMs: number;
}

export interface ValidationRunSummary {
  /** Timestamp of the run */
  runAt: string;
  /** Total symbols validated */
  totalSymbols: number;
  /** Symbols that passed */
  passedSymbols: number;
  /** Symbols that failed */
  failedSymbols: number;
  /** Symbols with warnings only */
  warningSymbols: number;
  /** Per-module breakdown */
  moduleResults: Record<string, {
    passed: number;
    failed: number;
    warnings: number;
  }>;
  /** All individual results */
  results: ValidationResult[];
  /** Overall status */
  status: ValidationStatus;
  /** Total errors across all symbols */
  totalErrors: number;
  /** Total warnings across all symbols */
  totalWarnings: number;
}

// ─── Validation Rule Types ─────────────────────────────────────────────────

export interface ValidationRule {
  /** Rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Description of what this rule checks */
  description: string;
  /** Rule category */
  category: ValidationCategory;
  /** Severity if this rule is violated */
  severity: ValidationSeverity;
  /** Whether this rule is enabled */
  enabled: boolean;
}

export type ValidationCategory =
  | 'hallucination'
  | 'compliance'
  | 'consistency'
  | 'ranking'
  | 'scoring'
  | 'language'
  | 'data_integrity'
  | 'sector_calibration'
  | 'risk_calibration'
  | 'market_reality';

// ─── Market Reality Types ───────────────────────────────────────────────────

export interface MarketRealityCheck {
  /** Field being checked */
  field: string;
  /** Expected value or range */
  expected: unknown;
  /** Actual value found */
  actual: unknown;
  /** Whether the check passed */
  passed: boolean;
  /** Source of the expected value (DB, API, etc.) */
  source: string;
}

export interface MarketRealityResult {
  /** Symbol checked */
  symbol: string;
  /** Whether the symbol exists in the real universe */
  symbolExists: boolean;
  /** Market cap validation */
  marketCapValid: boolean;
  /** Sector classification validation */
  sectorValid: boolean;
  /** All individual reality checks */
  checks: MarketRealityCheck[];
  /** Overall status */
  status: ValidationStatus;
}

// ─── Research Consistency Types ────────────────────────────────────────────

export interface ConsistencyCheck {
  /** Check identifier */
  id: string;
  /** Type of consistency being checked */
  type: 'thesis_vs_risk' | 'valuation_vs_quality' | 'momentum_vs_quality' |
       'conviction_vs_confidence' | 'peer_claim_vs_data' | 'earnings_claim_vs_metrics' |
       'risk_claim_vs_radar' | 'dividend_vs_trap' | 'momentum_vs_data' |
       'governance_vs_evidence' | 'sector_vs_scoring';
  /** Whether the check passed */
  passed: boolean;
  /** Detailed explanation */
  explanation: string;
}

export interface ResearchConsistencyResult {
  /** Symbol checked */
  symbol: string;
  /** All consistency checks */
  checks: ConsistencyCheck[];
  /** Number of failed checks */
  failedCount: number;
  /** Overall consistency status */
  status: ValidationStatus;
}

// ─── Ranking Sanity Types ──────────────────────────────────────────────────

export interface RankingSanityIssue {
  /** Type of ranking issue */
  type: 'severe_risk_top' | 'low_confidence_top' | 'value_trap_quality' |
        'high_debt_leader' | 'missing_data_conviction' | 'momentum_quality' |
        'dividend_trap_stability' | 'scanner_mismatch';
  /** Symbol with the issue */
  symbol: string;
  /** Rank position */
  rank: number;
  /** Category the symbol is ranked in */
  category: string;
  /** Explanation of the issue */
  explanation: string;
}

export interface RankingSanityResult {
  /** Ranking category checked */
  category: string;
  /** Total symbols ranked */
  totalRanked: number;
  /** Issues found */
  issues: RankingSanityIssue[];
  /** Whether rankings pass sanity check */
  passed: boolean;
  /** Status */
  status: ValidationStatus;
}

// ─── Forbidden Language Types ──────────────────────────────────────────────

export const FORBIDDEN_INVESTMENT_PHRASES = [
  'Buy now', 'Strong Buy', 'Sell immediately', 'sure shot',
  'multibagger', 'guaranteed return', 'risk-free', 'profit assured',
  'must buy', 'must sell', 'target guaranteed',
] as const;

export const FORBIDDEN_BACKEND_PHRASES = [
  'provider', 'API key', 'backend', 'ingestion', 'refresh job',
  'diagnostics', 'coverage', 'freshness', 'source pending',
  'source verified', 'cache miss', 'cache hit', 'GPU',
  'Ollama', 'SGLang', 'Qdrant', 'CUDA', 'vLLM',
] as const;

export const ALLOWED_USER_LANGUAGE = [
  'Research', 'Thesis', 'Conviction', 'Risk', 'Compare',
  'Track', 'Review', 'Methodology', 'What changed', 'Why it matters',
  'Before you invest', 'High conviction', 'Watch', 'Risk rising',
  'Thesis improving', 'Needs review', 'Avoid for now',
  'Insufficient information', 'Research basis', 'Factor drivers',
  'Risk to review', 'Valuation context', 'Peer context',
  'Opportunity class', 'Risk radar', 'Thesis state',
] as const;

// ─── Confidence Types ──────────────────────────────────────────────────────

export interface ConfidenceValidation {
  /** Whether confidence label is present */
  hasLabel: boolean;
  /** Whether confidence level matches evidence density */
  levelMatchesEvidence: boolean;
  /** Whether low confidence is properly communicated */
  lowConfidenceHandled: boolean;
  /** Confidence score (0-100) */
  score: number;
  /** Evidence count supporting this confidence */
  evidenceCount: number;
}

// ─── Composable Validator Interface ────────────────────────────────────────

export interface IValidator {
  /** Unique validator ID */
  readonly id: string;
  /** Validator name */
  readonly name: string;
  /** Validate a specific symbol */
  validate(symbol: string, data: unknown): Promise<ValidationResult>;
  /** Validate multiple symbols */
  validateBatch(symbols: string[], data?: unknown[]): Promise<ValidationRunSummary>;
}
