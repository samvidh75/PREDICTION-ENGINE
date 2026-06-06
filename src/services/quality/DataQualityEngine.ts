import type { EngineInputs } from '../../stockstory/types';

export interface DataQualityIssue {
  field: string;
  code: 'missing' | 'non_finite' | 'stale' | 'outlier';
  severity: 'warning' | 'error';
  message: string;
}

export interface DataQualityResult {
  symbol: string;
  score: number;
  issues: DataQualityIssue[];
  isUsable: boolean;
}

export class DataQualityEngine {
  evaluate(inputs: EngineInputs, now = new Date()): DataQualityResult {
    const issues: DataQualityIssue[] = [];
    const financials = inputs.financials as Record<string, unknown>;
    const features = inputs.features as Record<string, unknown>;

    for (const [field, value] of Object.entries({ ...financials, ...features })) {
      if (value === null || value === undefined) {
        issues.push({ field, code: 'missing', severity: 'warning', message: `${field} is missing` });
      } else if (typeof value === 'number' && !Number.isFinite(value)) {
        issues.push({ field, code: 'non_finite', severity: 'error', message: `${field} is not finite` });
      }
    }

    const tradeDate = new Date(inputs.tradeDate);
    if (Number.isFinite(tradeDate.getTime())) {
      const ageDays = (now.getTime() - tradeDate.getTime()) / 86_400_000;
      if (ageDays > 7) issues.push({ field: 'tradeDate', code: 'stale', severity: 'error', message: `snapshot is ${Math.floor(ageDays)} days old` });
      else if (ageDays > 2) issues.push({ field: 'tradeDate', code: 'stale', severity: 'warning', message: `snapshot is ${Math.floor(ageDays)} days old` });
    }

    const bounded: Array<[string, number | null]> = [
      ['roa', inputs.financials.roa], ['roe', inputs.financials.roe], ['roic', inputs.financials.roic],
      ['revenueGrowth', inputs.financials.revenueGrowth], ['profitGrowth', inputs.financials.profitGrowth],
      ['grossMargin', inputs.financials.grossMargin], ['operatingMargin', inputs.financials.operatingMargin],
    ];
    for (const [field, value] of bounded) {
      if (value !== null && Math.abs(value) > 10) issues.push({ field, code: 'outlier', severity: 'warning', message: `${field} appears extreme` });
    }

    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.length - errors;
    const score = Math.max(0, Math.round(100 - errors * 20 - warnings * 3));
    return { symbol: inputs.symbol, score, issues, isUsable: errors === 0 };
  }
}

export default DataQualityEngine;
