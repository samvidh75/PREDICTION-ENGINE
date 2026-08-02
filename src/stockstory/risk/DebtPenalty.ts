/**
 * Debt Penalty
 * 
 * Applies penalty when debt stress detected.
 * Penalty: up to -10 points from health score.
 */

import { createPenalty, type Penalty } from '../scoring/PenaltyScorer';
import type { EngineInputs } from '../types';
import { getSectorProfile } from '../SectorAdapter';

export function evaluateDebtPenalty(inputs: EngineInputs): Penalty[] {
  const penalties: Penalty[] = [];
  if (!inputs?.financials) return penalties;
  const { financials, sector } = inputs;
  const profile = getSectorProfile(sector?.name ?? 'General');

  if (financials.debtToEquity !== null) {
    const dte = financials.debtToEquity;

    if (dte > profile.deExtreme) {
      penalties.push(
        createPenalty(
          'DEBT_EXTREME',
          `Debt/Equity (${dte.toFixed(1)}) far exceeds ${profile.name} sector extreme threshold (${profile.deExtreme})`,
          10,
          'debt'
        )
      );
    } else if (dte > profile.deElevated && financials.currentRatio !== null && financials.currentRatio < 1.0) {
      penalties.push(
        createPenalty(
          'DEBT_LIQUIDITY_STRESS',
          `Elevated D/E (${dte.toFixed(1)}) combined with tight liquidity (CR: ${financials.currentRatio.toFixed(1)})`,
          8,
          'debt'
        )
      );
    }
  }

  return penalties;
}
