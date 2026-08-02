/**
 * Volatility Penalty
 * 
 * Applies penalty for extreme volatility.
 * Penalty: up to -8 points from health score.
 */

import { createPenalty, type Penalty } from '../scoring/PenaltyScorer';
import type { EngineInputs } from '../types';

export function evaluateVolatilityPenalty(inputs: EngineInputs): Penalty[] {
  const penalties: Penalty[] = [];
  if (!inputs?.features) return penalties;
  const { features, financials } = inputs;

  if (features.volatility !== null && features.volatility > 0.50) {
    penalties.push(
      createPenalty(
        'VOL_EXTREME',
        `Annualised volatility (${(features.volatility * 100).toFixed(0)}%) exceeds 50% — extreme price swings`,
        8,
        'volatility'
      )
    );
  } else if (features.volatility !== null && features.volatility > 0.40 && financials?.beta !== null && financials.beta > 1.8) {
    penalties.push(
      createPenalty(
        'VOL_HIGH_BETA',
        `High volatility (${(features.volatility * 100).toFixed(0)}%) combined with elevated beta (${financials.beta.toFixed(1)})`,
        5,
        'volatility'
      )
    );
  }

  return penalties;
}
