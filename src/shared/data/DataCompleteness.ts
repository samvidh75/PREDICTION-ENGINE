/**
 * TRACK-P2 — Data Completeness Engine
 * 
 * Assesses how complete a dataset is and what impact missing fields have.
 * Critical missing inputs can force availability to 'partial' or 'unavailable'.
 */

import type { DataCompleteness, DataAvailability, CompletenessInput } from './AnalyticalResponse';

// ---------------------------------------------------------------------------
// Assess Completeness
// ---------------------------------------------------------------------------

/**
 * Assess completeness of a dataset.
 * 
 * - requiredFields: all fields expected to be present
 * - values: actual data map (field name → value or null/undefined)
 * - criticalFields: subset of required fields that MUST be present; a single
 *   missing critical field can force availability to 'partial' or 'unavailable'
 * - neutralizedFields: fields that had null values replaced with neutral defaults
 * 
 * Returns:
 * - completeness score (0-100)
 * - missing field names
 * - neutralized field names
 * - confidence impact (how much to reduce confidence)
 * - availability recommendation
 */
export function assessCompleteness(input: CompletenessInput): {
  completeness: DataCompleteness;
  availabilityRecommendation: DataAvailability;
} {
  const {
    requiredFields,
    values,
    criticalFields = [],
    neutralizedFields: inputNeutralized = [],
  } = input;

  const missingFields: string[] = [];
  const neutralizedFields: string[] = [...inputNeutralized];
  let availableCount = 0;

  for (const field of requiredFields) {
    const val = values[field];
    // null, undefined, or empty string = missing
    if (val === null || val === undefined || val === '') {
      missingFields.push(field);
    } else {
      availableCount++;
    }
  }

  // Compute completeness score
  const total = requiredFields.length;
  const score = total > 0 ? Math.round((availableCount / total) * 100) : 100;

  // Count critical missing fields
  const missingCritical = criticalFields.filter(f => missingFields.includes(f));
  const criticalCount = criticalFields.length;
  const availableCritical = criticalCount - missingCritical.length;

  // Determine confidence impact (0-100)
  // Missing optional fields: 5% each
  // Missing critical fields: 15% each
  // Neutralized fields: 3% each
  const optionalMissing = missingFields.filter(f => !criticalFields.includes(f));
  let confidenceImpact = Math.min(100,
    optionalMissing.length * 5 +
    missingCritical.length * 15 +
    neutralizedFields.length * 3
  );

  // Determine availability recommendation
  let availabilityRecommendation: DataAvailability = 'available';

  if (total === 0) {
    availabilityRecommendation = 'unavailable';
    confidenceImpact = 100;
  } else if (missingCritical.length > 0) {
    // If any critical field is missing, mark as partial
    availabilityRecommendation = 'partial';
  }
  // If ALL critical fields are missing, mark as unavailable
  if (criticalCount > 0 && availableCritical === 0) {
    availabilityRecommendation = 'unavailable';
    confidenceImpact = 100;
  }
  // If more than 50% of all required fields are missing
  if (total > 0 && availableCount / total < 0.5) {
    availabilityRecommendation = 'unavailable';
    if (confidenceImpact < 80) confidenceImpact = 80;
  }

  return {
    completeness: {
      score,
      requiredFields: total,
      availableFields: availableCount,
      missingFields,
      neutralizedFields,
      confidenceImpact,
    },
    availabilityRecommendation,
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
