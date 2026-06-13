import { FinancialData } from '../FinancialProvider';

export interface QualityGateResult {
  passed: boolean;
  failures: string[];
  warnings: string[];
  fieldCompleteness: number;
  fieldAccuracy: number;
}

export const QUALITY_GATE_THRESHOLDS = {
  minFieldCompleteness: 0.7,
  minFieldConfidence: 0.3,
  maxNullRatioFields: 0.3,
  reasonable: {
    minPE: 0,
    maxPE: 10000,
    minPB: 0,
    maxPB: 100,
    minMarketCap: 10000000,
    maxDebtToEquity: 100,
    minEPS: -10000,
    maxEPS: 100000,
  },
} as const;

const REQUIRED_SCORING_FIELDS = new Set([
  'peRatio',
  'pbRatio',
  'roa',
  'roe',
  'roic',
  'evEbitda',
  'debtToEquity',
  'marketCap',
  'eps',
  'dividendYield',
  'beta',
  'revenueGrowth',
  'profitGrowth',
  'epsGrowth',
  'fcfGrowth',
  'grossMargin',
  'operatingMargin',
  'currentRatio',
  'fcfYield',
]);

const ALL_EXPECTED_FIELDS = [
  'peRatio',
  'pbRatio',
  'roe',
  'roic',
  'evEbitda',
  'debtToEquity',
  'marketCap',
  'eps',
  'dividendYield',
  'beta',
  'revenueGrowth',
  'profitGrowth',
  'epsGrowth',
  'fcfGrowth',
  'grossMargin',
  'operatingMargin',
  'currentRatio',
  'fcfYield',
  'roa',
  'netMargin',
  'freeFloat',
];

const REASONABLE_RANGES: Record<string, [number, number]> = {
  peRatio: [QUALITY_GATE_THRESHOLDS.reasonable.minPE, QUALITY_GATE_THRESHOLDS.reasonable.maxPE],
  pbRatio: [QUALITY_GATE_THRESHOLDS.reasonable.minPB, QUALITY_GATE_THRESHOLDS.reasonable.maxPB],
  marketCap: [QUALITY_GATE_THRESHOLDS.reasonable.minMarketCap, Infinity],
  debtToEquity: [0, QUALITY_GATE_THRESHOLDS.reasonable.maxDebtToEquity],
  eps: [QUALITY_GATE_THRESHOLDS.reasonable.minEPS, QUALITY_GATE_THRESHOLDS.reasonable.maxEPS],
};

function isPopulated(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return false;
  return true;
}

export class AuthorizedProviderQualityGate {
  static validateFinancialData(data: FinancialData): QualityGateResult {
    const failures: string[] = [];
    const warnings: string[] = [];
    const record = data as Record<string, unknown>;

    // Check 1: Required scoring fields are all present
    for (const field of REQUIRED_SCORING_FIELDS) {
      if (!isPopulated(record[field])) {
        failures.push(`Missing required scoring field: ${field}`);
      }
    }

    // Check 2: No null/undefined/NaN/Infinity for expected fields
    for (const field of ALL_EXPECTED_FIELDS) {
      const value = record[field];
      if (value !== undefined && value !== null) {
        if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          failures.push(`Invalid value in ${field}: ${value}`);
        }
      }
    }

    // Check 3: Reasonable ranges
    for (const [field, [min, max]] of Object.entries(REASONABLE_RANGES)) {
      const value = record[field];
      if (typeof value === 'number' && isFinite(value)) {
        if (value < min) {
          failures.push(`${field}=${value} below reasonable minimum ${min}`);
        }
        if (value > max) {
          failures.push(`${field}=${value} above reasonable maximum ${max}`);
        }
      }
    }

    // Check 4: Confidence scores from _sources metadata
    const sources = record._sources as Record<string, string> | undefined;
    if (sources && typeof sources === 'object') {
      const confidences = record._fieldConfidence as Record<string, number> | undefined;
      if (confidences && typeof confidences === 'object') {
        for (const [field, confidence] of Object.entries(confidences)) {
          if (typeof confidence === 'number' && confidence <= QUALITY_GATE_THRESHOLDS.minFieldConfidence) {
            warnings.push(`Low confidence for ${field}: ${confidence}`);
          }
        }
      }
    }

    // Check 5: Field completeness >= 70%
    const expectedCount = ALL_EXPECTED_FIELDS.length;
    const populatedCount = ALL_EXPECTED_FIELDS.filter((f) => isPopulated(record[f])).length;
    const fieldCompleteness = expectedCount > 0 ? populatedCount / expectedCount : 0;

    if (fieldCompleteness < QUALITY_GATE_THRESHOLDS.minFieldCompleteness) {
      failures.push(
        `Field completeness ${(fieldCompleteness * 100).toFixed(0)}% below threshold ${QUALITY_GATE_THRESHOLDS.minFieldCompleteness * 100}%`,
      );
    }

    // Field accuracy — ratio of populated fields to total expected
    const fieldAccuracy = expectedCount > 0 ? populatedCount / expectedCount : 0;

    return {
      passed: failures.length === 0,
      failures,
      warnings,
      fieldCompleteness,
      fieldAccuracy,
    };
  }

  static crossValidate(
    primary: FinancialData,
    secondary: FinancialData,
    tolerance: number,
  ): QualityGateResult {
    const failures: string[] = [];
    const warnings: string[] = [];

    const primaryRecord = primary as Record<string, unknown>;
    const secondaryRecord = secondary as Record<string, unknown>;

    const allFields = new Set([
      ...Object.keys(primaryRecord),
      ...Object.keys(secondaryRecord),
    ]);

    let comparedCount = 0;
    let matchedCount = 0;

    for (const field of allFields) {
      if (field.startsWith('_') || field === 'symbol' || field === 'periodEnd') continue;

      const pVal = primaryRecord[field];
      const sVal = secondaryRecord[field];

      if (!isPopulated(pVal) || !isPopulated(sVal)) continue;

      comparedCount++;

      if (typeof pVal === 'number' && typeof sVal === 'number') {
        const diff = Math.abs(pVal - sVal);
        const maxAbs = Math.max(Math.abs(pVal), Math.abs(sVal));
        const relativeDiff = maxAbs > 0 ? diff / maxAbs : diff;

        if (relativeDiff > tolerance) {
          warnings.push(
            `${field} differs: primary=${pVal}, secondary=${sVal} (relative diff=${relativeDiff.toFixed(4)})`,
          );
        } else {
          matchedCount++;
        }
      } else {
        if (String(pVal) !== String(sVal)) {
          warnings.push(`${field} differs: primary=${String(pVal)}, secondary=${String(sVal)}`);
        } else {
          matchedCount++;
        }
      }
    }

    const fieldAccuracy = comparedCount > 0 ? matchedCount / comparedCount : 1;

    return {
      passed: warnings.length === 0,
      failures,
      warnings,
      fieldCompleteness: comparedCount > 0 ? matchedCount / comparedCount : 0,
      fieldAccuracy,
    };
  }
}
