/**
 * Research Consistency Validator
 * Phase 4 — Detects internal contradictions in research theses,
 * ensures claims are internally consistent and logically sound.
 */
import { BaseValidator } from './IntelligenceValidationRunner';
import type { ValidationIssue, ConsistencyCheck } from './IntelligenceValidationTypes';

type ContradictionPattern = {
  id: string;
  fields: [string, string];
  /** If field1 is high and field2 is low/negative, that's a contradiction */
  invertSecond?: boolean;
  label: string;
  severity: 'error' | 'warning';
};

const CONTRADICTION_PATTERNS: ContradictionPattern[] = [
  {
    id: 'thesis-vs-risk',
    fields: ['convictionLevel', 'riskLevel'],
    label: 'High conviction + high risk — contradictory thesis',
    severity: 'error',
  },
  {
    id: 'valuation-vs-quality',
    fields: ['valuationExpensive', 'qualityScore'],
    invertSecond: true,
    label: 'Expensive valuation + low quality — value trap signal',
    severity: 'warning',
  },
  {
    id: 'momentum-vs-quality',
    fields: ['momentumScore', 'qualityScore'],
    label: 'High momentum + low quality — speculative rally risk',
    severity: 'warning',
  },
  {
    id: 'growth-vs-profitability',
    fields: ['revenueGrowth', 'profitMargin'],
    label: 'High growth + declining margin — scaling concern',
    severity: 'warning',
  },
  {
    id: 'debt-vs-quality',
    fields: ['debtToEquity', 'qualityScore'],
    label: 'High debt + high quality rating — debt needs explicit note',
    severity: 'warning',
  },
  {
    id: 'pe-vs-growth',
    fields: ['peRatio', 'epsGrowth'],
    label: 'High PE + low EPS growth — expensive for growth rate',
    severity: 'warning',
  },
  {
    id: 'promoter-low',
    fields: ['promoterHolding', 'qualityScore'],
    label: 'Low promoter holding + high quality — needs governance note',
    severity: 'warning',
  },
];

export class ResearchConsistencyValidator extends BaseValidator {
  readonly id = 'research-consistency';
  readonly name = 'Research Consistency Validator';

  protected async runChecks(
    symbol: string,
    data: unknown,
  ): Promise<{ issues: ValidationIssue[]; totalChecks: number }> {
    const payload = data as Record<string, number | undefined> || {};
    const issues: ValidationIssue[] = [];

    let totalChecks = 0;

    for (const pattern of CONTRADICTION_PATTERNS) {
      totalChecks++;
      const v1 = payload[pattern.fields[0]];
      const v2 = payload[pattern.fields[1]];
      if (v1 == null || v2 == null) continue;

      const isContradiction = pattern.invertSecond
        ? (v1 > 0.6 && v2 < 0.4)
        : (v1 > 0.6 && v2 > 0.6);

      if (isContradiction) {
        issues.push({
          id: `${this.id}-${pattern.id}-${symbol}`,
          severity: pattern.severity,
          module: this.id,
          symbol,
          reason: `${pattern.label} (${pattern.fields[0]}=${v1}, ${pattern.fields[1]}=${v2})`,
          recommendedFix: `Add explicit commentary explaining why ${pattern.fields[0]} and ${pattern.fields[1]} both appear elevated`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Additional check: conviction without evidence
    totalChecks++;
    const conviction = payload.convictionLevel as number | undefined;
    const evidenceCount = payload.evidenceCount as number | undefined;
    if (conviction != null && conviction > 0.6 && evidenceCount != null && evidenceCount < 3) {
      issues.push({
        id: `${this.id}-thin-evidence-${symbol}`,
        severity: 'warning',
        module: this.id,
        symbol,
        reason: `High conviction (${conviction}) backed by only ${evidenceCount} evidence points`,
        recommendedFix: 'Reduce conviction or gather more evidence before asserting high conviction',
        detectedAt: new Date().toISOString(),
      });
    }

    return { issues, totalChecks };
  }

  /**
   * Run a structured consistency check and return detailed results.
   */
  runStructuredChecks(symbol: string, data: Record<string, number>): ConsistencyCheck[] {
    const checks: ConsistencyCheck[] = [];

    for (const pattern of CONTRADICTION_PATTERNS) {
      const v1 = data[pattern.fields[0]];
      const v2 = data[pattern.fields[1]];
      if (v1 == null || v2 == null) continue;

      const isContradiction = pattern.invertSecond
        ? (v1 > 0.6 && v2 < 0.4)
        : (v1 > 0.6 && v2 > 0.6);

      checks.push({
        id: pattern.id,
        type: pattern.id as ConsistencyCheck['type'],
        passed: !isContradiction,
        explanation: isContradiction
          ? `${pattern.label} (${pattern.fields[0]}=${v1}, ${pattern.fields[1]}=${v2})`
          : 'No contradiction detected',
      });
    }

    return checks;
  }
}
