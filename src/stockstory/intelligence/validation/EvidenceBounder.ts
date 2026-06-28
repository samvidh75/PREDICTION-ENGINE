/**
 * Evidence Bounder
 * Phase 8 — Ensures every claim/scoring decision is traceable to
 * specific evidence, with staleness, diversity, and coverage checks.
 */
import { DEFAULT_CALIBRATION, type EvidenceCalibration } from '../calibration/CalibrationTypes';
import type { ValidationIssue } from '../validation/IntelligenceValidationTypes';

interface EvidencePoint {
  id: string;
  source: string;
  type: string;
  date: string;
  ageDays: number;
  relevanceScore?: number;
}

interface EvidenceBoundingResult {
  symbol: string;
  totalEvidence: number;
  uniqueSources: number;
  stalePoints: number;
  staleEvidence: EvidencePoint[];
  hasEnoughEvidence: boolean;
  hasSourceDiversity: boolean;
  issues: ValidationIssue[];
  passed: boolean;
}

export class EvidenceBounder {
  private config: EvidenceCalibration;

  constructor(config?: EvidenceCalibration) {
    this.config = config ?? DEFAULT_CALIBRATION.evidence;
  }

  /**
   * Bound a set of evidence points used for a symbol's claims.
   */
  bound(symbol: string, evidence: EvidencePoint[]): EvidenceBoundingResult {
    const issues: ValidationIssue[] = [];

    // Check evidence quantity
    const hasEnoughEvidence = evidence.length >= this.config.minEvidenceForConviction;
    if (!hasEnoughEvidence) {
      issues.push({
        id: `evidence-thin-${symbol}`,
        severity: 'warning',
        module: 'evidence-bounder',
        symbol,
        reason: `Only ${evidence.length} evidence points (minimum ${this.config.minEvidenceForConviction} for conviction)`,
        recommendedFix: 'Gather more data points or reduce conviction to match evidence density',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check source diversity
    const sources = new Set(evidence.map(e => e.source));
    const hasSourceDiversity = sources.size >= this.config.minUniqueSources;
    if (!hasSourceDiversity) {
      issues.push({
        id: `evidence-source-${symbol}`,
        severity: 'warning',
        module: 'evidence-bounder',
        symbol,
        reason: `Only ${sources.size} unique sources (minimum ${this.config.minUniqueSources})`,
        recommendedFix: 'Diversify data sources to avoid single-source dependency',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check staleness
    const staleEvidence = evidence.filter(e => e.ageDays > this.config.maxEvidenceAgeDays);
    if (staleEvidence.length > 0) {
      issues.push({
        id: `evidence-stale-${symbol}`,
        severity: staleEvidence.length > evidence.length * 0.5 ? 'error' : 'warning',
        module: 'evidence-bounder',
        symbol,
        reason: `${staleEvidence.length}/${evidence.length} evidence points exceed ${this.config.maxEvidenceAgeDays} day staleness limit`,
        recommendedFix: 'Refresh data from recent quarters; mark stale data explicitly',
        detectedAt: new Date().toISOString(),
      });
    }

    // Check for zero-evidence claims
    if (evidence.length === 0) {
      issues.push({
        id: `evidence-none-${symbol}`,
        severity: 'error',
        module: 'evidence-bounder',
        symbol,
        reason: 'No evidence found for claims about this symbol',
        recommendedFix: 'Flag this output as "insufficient data" until evidence is available',
        detectedAt: new Date().toISOString(),
      });
    }

    return {
      symbol,
      totalEvidence: evidence.length,
      uniqueSources: sources.size,
      stalePoints: staleEvidence.length,
      staleEvidence,
      hasEnoughEvidence,
      hasSourceDiversity,
      issues,
      passed: issues.filter(i => i.severity === 'error').length === 0,
    };
  }
}

export type { EvidencePoint, EvidenceBoundingResult };
