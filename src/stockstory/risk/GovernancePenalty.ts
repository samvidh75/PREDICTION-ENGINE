/**
 * Governance Penalty
 * 
 * Applies penalty for governance red flags.
 * Currently a placeholder — data sources not yet available.
 * Penalty: up to -5 points from health score.
 */

import { createPenalty, type Penalty } from '../scoring/PenaltyScorer';
import type { EngineInputs } from '../types';

export function evaluateGovernancePenalty(_inputs: EngineInputs): Penalty[] {
  // Placeholder — governance data sources (related-party transactions,
  // promoter pledges, auditor changes) not yet integrated.
  // Returns empty until data pipeline is ready.
  return [];
}
