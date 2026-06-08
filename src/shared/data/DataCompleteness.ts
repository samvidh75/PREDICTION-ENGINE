/**
 * TRACK-P2 — Data Completeness Engine
 * 
 * Assesses how complete a dataset is and what impact missing fields have.
 * Critical missing inputs can force availability to 'partial' or 'unavailable'.
 */

import type { DataCompleteness, DataAvailability, CompletenessInput } from './AnalyticalResponse';

// ---------------------------------------------------------------------------
// Assess Completeness — overloaded for flexible usage
// ---------------------------------------------------------------------------

/**
 * Primary: full input object.
 */
export function assessCompleteness(input: CompletenessInput): DataCompleteness;

/**
 * Convenience: (requiredFields: string[], availableFields: string[], neutralizedFields?: string[]).
 */
export function assessCompleteness(
  requiredFields: string[],
  availableFields: string[],
  neutralizedFields?: string[]
): DataCompleteness;

/**
 * Convenience: (requiredFields: string[], values: Record<string, any>, criticalFields?: string[]).
 */
export function assessCompleteness(
  requiredFields: string[],
  values: Record<string, number | string | null | undefined>,
  criticalFields?: string[]
): DataCompleteness;

export function assessCompleteness(
  arg1: CompletenessInput | string[],
  arg2?: string[] | Record<string, number | string | null | undefined>,
  arg3?: string[]
): DataCompleteness {
  let requiredFields: string[];
  let values: Record<string, number | string | null | undefined>;
  let criticalFields: string[] = [];
  let neutralizedFields: string[] = [];

  // Detect which overload was used
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    // Overload: (requiredFields, availableFields, neutralizedFields?)
    requiredFields = arg1;
    const availableFields = arg2;
    neutralizedFields = arg3 ?? [];
    values = {};
    for (const f of requiredFields) {
      values[f] = availableFields.includes(f) ? 1 : null;
    }
  } else if (Array.isArray(arg1) && typeof arg2 === 'object' && arg2 !== null && !Array.isArray(arg2)) {
    // Overload: (requiredFields, values, criticalFields?)
    requiredFields = arg1;
    values = arg2;
    criticalFields = arg3 ?? [];
  } else if (typeof arg1 === 'object' && !Array.isArray(arg1)) {
    // Overload: CompletenessInput
    requiredFields = arg1.requiredFields;
    values = arg1.values;
    criticalFields = arg1.criticalFields ?? [];
    neutralizedFields = arg1.neutralizedFields ?? [];
  } else {
    // Fallback
    requiredFields = Array.isArray(arg1) ? arg1 : [];
    values = {};
  }

  const missingFields: string[] = [];
  let availableCount = 0;

  for (const field of requiredFields) {
    const val = values[field];
    if (val === null || val === undefined || val === '') {
      missingFields.push(field);
    } else {
      availableCount++;
    }
  }

  const total = requiredFields.length;
  const score = total > 0 ? Math.round((availableCount / total) * 100) : 100;

  // Count critical missing fields
  const missingCritical = criticalFields.filter(f => missingFields.includes(f));
  const criticalCount = criticalFields.length;
  const availableCritical = criticalCount - missingCritical.length;

  // Determine confidence impact (0-100)
  const optionalMissing = missingFields.filter(f => !criticalFields.includes(f));
  let confidenceImpact = Math.min(100,
    optionalMissing.length * 5 +
    missingCritical.length * 15 +
    neutralizedFields.length * 3
  );

  // Availability recommendation
  let availabilityRecommendation: DataAvailability = 'available';

  if (total === 0) {
    availabilityRecommendation = 'unavailable';
    confidenceImpact = 100;
  } else if (missingCritical.length > 0) {
    availabilityRecommendation = 'partial';
  }
  if (criticalCount > 0 && availableCritical === 0) {
    availabilityRecommendation = 'unavailable';
    confidenceImpact = 100;
  }
  if (total > 0 && availableCount / total < 0.5) {
    availabilityRecommendation = 'unavailable';
    if (confidenceImpact < 80) confidenceImpact = 80;
  }

  return {
    score,
    requiredFields: total,
    availableFields: availableCount,
    missingFields,
    neutralizedFields,
    confidenceImpact,
  };
}

/**
 * Quick check: does this dataset have all critical fields?
 */
export function hasAllCriticalFields(
  requiredFields: string[],
  criticalFields: string[],
  values: Record<string, number | string | null | undefined>
): boolean {
  for (const field of criticalFields) {
    const val = values[field];
    if (val === null || val === undefined || val === '') {
      return false;
    }
  }
  return true;
}

/**
 * Check which critical fields are missing.
 */
export function getMissingCriticalFields(
  criticalFields: string[],
  values: Record<string, number | string | null | undefined>
): string[] {
  return criticalFields.filter(f => {
    const val = values[f];
    return val === null || val === undefined || val === '';
  });
}
