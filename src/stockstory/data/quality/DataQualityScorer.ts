/**
 * Data Quality Scorer
 *
 * Computes quality scores across dimensions:
 * - Completeness: What % of fields are populated
 * - Freshness: How recently was data updated
 * - Accuracy: Do values pass validation rules
 * - Consistency: Are values consistent across sources
 * - Coverage: Does the data exist for all expected symbols
 */

import type {
  QualityScore,
  QualityDimension,
  QualityTier,
  FieldQuality,
} from './QualityTypes';

export interface QualityEvaluation {
  /** Object being evaluated (e.g., stock symbol, company name) */
  subject: Record<string, unknown>;

  /** Required field names */
  requiredFields?: string[];

  /** Optional field names (others are ignored) */
  optionalFields?: string[];

  /** For freshness: when this data was last updated */
  lastUpdated?: string;

  /** For accuracy: validation functions per field */
  validators?: Record<string, (value: unknown) => boolean>;

  /** For consistency: values from other sources to compare against */
  crossSourceValues?: Record<string, unknown[]>;
}

const TIER_THRESHOLDS: Array<{ tier: QualityTier; min: number }> = [
  { tier: 'A', min: 90 },
  { tier: 'B', min: 75 },
  { tier: 'C', min: 60 },
  { tier: 'D', min: 40 },
  { tier: 'F', min: 0 },
];

export function scoreTier(score: number): QualityTier {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return 'F';
}

export class DataQualityScorer {
  evaluate(eval_: QualityEvaluation): QualityScore {
    const fields = this.evaluateFields(eval_);
    const dimensions: Record<QualityDimension, number> = {
      completeness: this.scoreCompleteness(fields, eval_),
      freshness: this.scoreFreshness(eval_),
      accuracy: this.scoreAccuracy(fields, eval_),
      consistency: this.scoreConsistency(eval_),
      coverage: this.scoreCoverage(fields),
    };

    const dimensionWeight: Record<QualityDimension, number> = {
      completeness: 0.30,
      freshness: 0.20,
      accuracy: 0.20,
      consistency: 0.15,
      coverage: 0.15,
    };

    const weightedScore = Object.entries(dimensions).reduce(
      (sum, [dim, score]) => sum + score * (dimensionWeight[dim as QualityDimension] ?? 0),
      0
    );

    const issues = this.collectIssues(fields, eval_);
    const score = Math.round(weightedScore);

    return {
      score,
      tier: scoreTier(score),
      dimensions,
      fields,
      issueCount: issues.length,
      issues,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private evaluateFields(eval_: QualityEvaluation): FieldQuality[] {
    const allFieldNames = new Set<string>();
    for (const key of Object.keys(eval_.subject)) allFieldNames.add(key);
    if (eval_.requiredFields) {
      for (const f of eval_.requiredFields) allFieldNames.add(f);
    }

    const required = new Set(eval_.requiredFields ?? []);
    const fields: FieldQuality[] = [];

    for (const fieldName of allFieldNames) {
      const value = eval_.subject[fieldName];
      const isRequired = required.has(fieldName);
      const hasValue = value !== null && value !== undefined && value !== '';
      const issues: string[] = [];

      if (isRequired && !hasValue) {
        issues.push(`Required field "${fieldName}" is missing`);
      }

      // Validate if validator exists
      if (hasValue && eval_.validators?.[fieldName]) {
        try {
          if (!eval_.validators[fieldName](value)) {
            issues.push(`Field "${fieldName}" failed validation`);
          }
        } catch {
          issues.push(`Field "${fieldName}" validation error`);
        }
      }

      const completeness = hasValue ? 1.0 : 0.0;

      fields.push({
        field: fieldName,
        completeness,
        isRequired,
        hasValidValue: hasValue && issues.length === 0,
        issues,
      });
    }

    return fields;
  }

  private scoreCompleteness(fields: FieldQuality[], eval_: QualityEvaluation): number {
    if (fields.length === 0) return 100;
    const requiredFields = fields.filter(f => f.isRequired);
    if (requiredFields.length === 0) {
      const filled = fields.filter(f => f.completeness > 0).length;
      return Math.round((filled / fields.length) * 100);
    }
    const complete = requiredFields.filter(f => f.completeness > 0).length;
    return Math.round((complete / requiredFields.length) * 100);
  }

  private scoreFreshness(eval_: QualityEvaluation): number {
    if (!eval_.lastUpdated) return 0;
    const ageMs = Date.now() - new Date(eval_.lastUpdated).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays < 0) return 100; // future date? treat as fresh
    if (ageDays <= 1) return 100;
    if (ageDays <= 7) return 90;
    if (ageDays <= 30) return 70;
    if (ageDays <= 90) return 50;
    if (ageDays <= 365) return 30;
    return 10;
  }

  private scoreAccuracy(fields: FieldQuality[], _eval_: QualityEvaluation): number {
    const validatedFields = fields.filter(f => f.isRequired);
    if (validatedFields.length === 0) return 100;
    const accurate = validatedFields.filter(f => f.hasValidValue).length;
    return Math.round((accurate / validatedFields.length) * 100);
  }

  private scoreConsistency(eval_: QualityEvaluation): number {
    if (!eval_.crossSourceValues || Object.keys(eval_.crossSourceValues).length === 0) {
      return 100; // No cross-source data to compare — assume consistent
    }
    let consistent = 0;
    let total = 0;
    for (const values of Object.values(eval_.crossSourceValues)) {
      if (values.length < 2) { total++; consistent++; continue; }
      total++;
      const unique = new Set(values.map(v => JSON.stringify(v)));
      if (unique.size === 1) consistent++;
    }
    return Math.round((consistent / total) * 100);
  }

  private scoreCoverage(fields: FieldQuality[]): number {
    if (fields.length === 0) return 100;
    const filled = fields.filter(f => f.completeness > 0).length;
    return Math.round((filled / fields.length) * 100);
  }

  private collectIssues(fields: FieldQuality[], eval_: QualityEvaluation): string[] {
    const issues: string[] = [];
    for (const f of fields) {
      issues.push(...f.issues);
    }
    // Freshness issue
    if (eval_.lastUpdated) {
      const ageDays = (Date.now() - new Date(eval_.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 90) {
        issues.push(`Data is stale: last updated ${Math.round(ageDays)} days ago`);
      }
    }
    return issues;
  }
}

export const dataQualityScorer = new DataQualityScorer();
