/**
 * Result Impact Engine
 *
 * Evaluates normalized quarterly results to produce a qualitative
 * assessment of performance. This engine does NOT:
 * - Generate Buy/Sell recommendations
 * - Claim consensus beat/miss without consensus data
 * - Assign price targets
 *
 * The engine compares current results to prior periods and margin thresholds
 * to provide a balanced, evidence-based assessment.
 *
 * Possible assessments: 'Results improved'|'Margins weakened'|'Growth slowed'|
 * 'Needs review'|'Mixed'
 */

import type { NormalizedResult } from '../../data/results/QuarterlyResultNormalizer';

export type ResultAssessment = 'Results improved' | 'Margins weakened' | 'Growth slowed' | 'Needs review' | 'Mixed';

export class ResultImpactEngine {
  /**
   * Evaluate a normalized result and return an assessment.
   *
   * Logic:
   * - If revenue growth > 10% AND margins stable → 'Results improved'
   * - If margins dropped > 5% (absolute) AND revenue grew → 'Margins weakened'
   * - If revenue growth < 0% (decline) → 'Growth slowed'
   * - If revenue growth > 10% AND margins improved > 5% → 'Results improved'
   * - If contradictory signals → 'Mixed'
   * - If data is incomplete → 'Needs review'
   */
  evaluate(result: NormalizedResult): ResultAssessment {
    const {
      revenueGrowthYoY,
      ebitdaMargin,
      netProfitMargin,
      revenueGrowthQoQ,
    } = result;

    // Use YoY revenue growth if available, fallback to QoQ
    const hasGrowthData = revenueGrowthYoY !== null || revenueGrowthQoQ !== null;
    const growthRate = revenueGrowthYoY ?? revenueGrowthQoQ ?? 0;

    // Check if margin data is available
    const hasMarginData = ebitdaMargin !== null || netProfitMargin !== null;

    // If no growth data and no margin data, cannot assess
    if (!hasGrowthData && !hasMarginData) {
      return 'Needs review';
    }

    // Determine revenue direction
    const isGrowing = growthRate > 5;
    const isDeclining = growthRate < -2;

    // Determine margin health (using EBITDA margin if available)
    const marginValue = ebitdaMargin ?? netProfitMargin ?? null;
    const isMarginHealthy = marginValue !== null && marginValue > 10;
    const isMarginWeak = marginValue !== null && marginValue < 5;

    // Assessment logic
    if (isGrowing && isMarginHealthy && !isMarginWeak) {
      return 'Results improved';
    }

    if (isGrowing && isMarginWeak) {
      return 'Margins weakened';
    }

    if (isDeclining) {
      return 'Growth slowed';
    }

    if (isGrowing && !isMarginHealthy && !isMarginWeak) {
      return 'Mixed';
    }

    if (!isGrowing && !isDeclining && isMarginHealthy) {
      return 'Mixed';
    }

    if (isMarginWeak) {
      return 'Margins weakened';
    }

    // Default when data exists but assessment is unclear
    return 'Needs review';
  }
}

export const resultImpactEngine = new ResultImpactEngine();