/**
 * Public Intelligence Policy — canonical mapping for all public-facing
 * labels, stances, and confidence display rules.
 *
 * This is the single source of truth for how scores are presented to users.
 * No frontend component should define its own label mapping.
 */

// ── Healthometer labels (canonical 7-state system) ──
export type HealthometerDisplayLabel =
  | 'Very healthy'
  | 'Healthy'
  | 'Stable'
  | 'Needs review'
  | 'Risk rising'
  | 'Fragile'
  | 'Not enough information';

// ── Public research stances (prediction engine context) ──
export type PublicResearchStance =
  | 'Strong research context'
  | 'Research context'
  | 'Limited research context'
  | 'Partial research context'
  | 'Not enough information';

// ── Confidence display levels ──
export type DisplayConfidence = 'high' | 'medium' | 'low' | 'partial';

// ── Policy: when each system outranks the other ──
//
// Healthometer = company condition / quality-risk-health context.
//   - SHOWN: as primary health indicator on stock detail, compare, and summary cards.
//   - OUTRANKS: Prediction Engine for overall company health narrative.
//
// Prediction Engine = research opportunity / conviction context.
//   - SHOWN: as supplementary context in thesis tab, rankings, scanner.
//   - DOES NOT: imply future returns, advice, or investment recommendation.

// ── Thresholds for public research stance ──
export function mapScoreToPublicStance(
  score: number | null,
  activeDimensions: number,
  totalDimensions: number,
): PublicResearchStance {
  if (score === null || activeDimensions < 2) return 'Not enough information';
  const ratio = activeDimensions / Math.max(totalDimensions, 1);
  if (score >= 70 && ratio >= 0.6) return 'Strong research context';
  if (score >= 50 && ratio >= 0.4) return 'Research context';
  if (ratio >= 0.3) return 'Limited research context';
  return 'Partial research context';
}

// ── Confidence display rules ──
export function computeDisplayConfidence(
  activeFactors: number,
  plannedFactors: number,
  hasPrice: boolean,
): DisplayConfidence {
  if (!hasPrice) return 'partial';
  const ratio = activeFactors / Math.max(plannedFactors, 1);
  if (ratio >= 0.7 && activeFactors >= 5) return 'high';
  if (ratio >= 0.4 && activeFactors >= 3) return 'medium';
  if (activeFactors >= 1) return 'low';
  return 'partial';
}

// ── When to suppress Invest prominence ──
export function shouldSuppressInvest(
  healthometerLabel: HealthometerDisplayLabel | null,
  researchStance: PublicResearchStance,
): boolean {
  if (!healthometerLabel) return true;
  if (healthometerLabel === 'Not enough information') return true;
  if (researchStance === 'Not enough information') return true;
  return false;
}

// ── When to show Compare/Track instead of Invest ──
export function preferredAction(
  healthometerLabel: HealthometerDisplayLabel | null,
  researchStance: PublicResearchStance,
): 'invest' | 'compare' | 'track' {
  if (!healthometerLabel || healthometerLabel === 'Not enough information') return 'track';
  if (researchStance === 'Not enough information' || researchStance === 'Partial research context') return 'compare';
  return 'invest';
}
