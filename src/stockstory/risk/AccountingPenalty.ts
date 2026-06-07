/**
 * Accounting Penalty
 * 
 * Applies penalty when accounting anomalies detected.
 * Penalty: up to -15 points from health score.
 */

import { createPenalty, type Penalty } from '../scoring/PenaltyScorer';
import type { EngineInputs } from '../types';

export function evaluateAccountingPenalty(inputs: EngineInputs): Penalty[] {
  const penalties: Penalty[] = [];
  if (!inputs?.financials) return penalties;
  const { financials } = inputs;

  // Revenue-EPS divergence (EPS outpacing revenue by >20%)
  if (financials.revenueGrowth !== null && financials.epsGrowth !== null) {
    const divergence = financials.epsGrowth - financials.revenueGrowth;
    if (divergence > 0.25) {
      penalties.push(
        createPenalty(
          'ACC_DIVERGENCE_HIGH',
          `EPS growth (${(financials.epsGrowth * 100).toFixed(1)}%) significantly exceeds revenue growth (${(financials.revenueGrowth * 100).toFixed(1)}%) — possible accrual inflation`,
          15,
          'accounting'
        )
      );
    } else if (divergence > 0.15) {
      penalties.push(
        createPenalty(
          'ACC_DIVERGENCE_MODERATE',
          `EPS growth exceeds revenue growth by ${(divergence * 100).toFixed(0)}%`,
          8,
          'accounting'
        )
      );
    }
  }

  // Negative FCF despite positive earnings
  if (financials.fcfYield !== null && financials.fcfYield < -0.05 && financials.epsGrowth !== null && financials.epsGrowth > 0.05) {
    penalties.push(
      createPenalty(
        'ACC_NEGATIVE_FCF',
        'Negative free cash flow yield despite positive earnings growth',
        12,
        'accounting'
      )
    );
  }

  // Negative operating margin
  if (financials.operatingMargin !== null && financials.operatingMargin < 0) {
    penalties.push(
      createPenalty(
        'ACC_NEGATIVE_OM',
        'Negative operating margin indicates core business losses',
        10,
        'accounting'
      )
    );
  }

  return penalties;
}
