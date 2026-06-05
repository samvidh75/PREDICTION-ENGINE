/**
 * FinancialCompletenessEngine — Measures how "real" financial inputs are.
 * 
 * TRACK-8A: Tracks coverage across EngineInputs.financials fields.
 * 
 * Classifies each field as: REAL | DERIVED | FALLBACK | MISSING
 * Produces a completeness score (0-100%) per company and per field.
 */

import type { EngineInputs } from '../../stockstory/types';

export type FieldStatus = 'REAL' | 'DERIVED' | 'FALLBACK' | 'MISSING';

export interface FieldAudit {
  field: string;
  status: FieldStatus;
  value: number | null;
  source: string;
  engine: string;
}

export interface CompletenessReport {
  symbol: string;
  fields: FieldAudit[];
  realPct: number;
  derivedPct: number;
  fallbackPct: number;
  missingPct: number;
  completenessScore: number; // 0-100
}

/** Hardcoded / default values that indicate fallback */
const FALLBACK_VALUES = new Set([20, 3, 50, 1.0, 0.12, 0.10, 0.5, 1.5, 0.08, 0.05, 0.35, 0.15]);

// Field → Engine mapping
const FIELD_ENGINE: Record<string, string> = {
  peRatio: 'Valuation', pbRatio: 'Valuation', evEbitda: 'Valuation', fcfYield: 'Valuation',
  roe: 'Quality', roic: 'Quality', grossMargin: 'Quality', operatingMargin: 'Quality',
  debtToEquity: 'Stability', currentRatio: 'Stability',
  revenueGrowth: 'Growth', epsGrowth: 'Growth', fcfGrowth: 'Growth', profitGrowth: 'Growth',
  eps: 'General', dividendYield: 'General', beta: 'Risk', marketCap: 'General',
  freeFloat: 'Risk',
};

export class FinancialCompletenessEngine {
  /** Audit a single EngineInputs snapshot */
  static audit(inputs: EngineInputs, source: string): CompletenessReport {
    const f = inputs.financials as Record<string, number | null>;
    const fields: FieldAudit[] = [];

    for (const [field, value] of Object.entries(f)) {
      const status = this.classify(field, value);
      fields.push({
        field,
        status,
        value,
        source: status === 'REAL' || status === 'DERIVED' ? source : 'fallback',
        engine: FIELD_ENGINE[field] || 'General',
      });
    }

    const total = fields.length || 1;
    const stats = {
      real: fields.filter(x => x.status === 'REAL').length,
      derived: fields.filter(x => x.status === 'DERIVED').length,
      fallback: fields.filter(x => x.status === 'FALLBACK').length,
      missing: fields.filter(x => x.status === 'MISSING').length,
    };

    return {
      symbol: inputs.symbol,
      fields,
      realPct: stats.real / total * 100,
      derivedPct: stats.derived / total * 100,
      fallbackPct: stats.fallback / total * 100,
      missingPct: stats.missing / total * 100,
      // Score weights: real=100%, derived=75%, fallback=25%, missing=0%
      completenessScore: Math.round((stats.real * 100 + stats.derived * 75 + stats.fallback * 25) / total),
    };
  }

  /** Audit multiple companies → aggregate coverage */
  static auditBatch(reports: CompletenessReport[]): Map<string, { real: number; derived: number; fallback: number; missing: number }> {
    const aggregate = new Map<string, { real: number; derived: number; fallback: number; missing: number }>();

    for (const report of reports) {
      for (const field of report.fields) {
        const agg = aggregate.get(field.field) || { real: 0, derived: 0, fallback: 0, missing: 0 };
        if (field.status === 'REAL') agg.real++;
        else if (field.status === 'DERIVED') agg.derived++;
        else if (field.status === 'FALLBACK') agg.fallback++;
        else agg.missing++;
        aggregate.set(field.field, agg);
      }
    }

    return aggregate;
  }

  /** Check if a field uses hardcoded/fallback values */
  private static classify(field: string, value: number | null): FieldStatus {
    if (value === null || value === undefined) return 'MISSING';
    if (FALLBACK_VALUES.has(value)) return 'FALLBACK';
    // Known derived fields
    if (field === 'fcfYield' || field === 'profitGrowth' || field === 'roic') return 'DERIVED';
    return 'REAL';
  }
}
