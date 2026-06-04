/**
 * Engine 2: Quality Engine
 * Weight: 25%
 * 
 * Inputs: ROE, ROIC, Gross Margin, Operating Margin, Efficiency
 * 
 * Evaluates business quality through profitability and capital efficiency.
 * Scores are normalized 0-100 where higher = better quality.
 */

import { EngineInputs, QualityEngineOutput, clampScore, weightedAverage } from '../types';

export class QualityEngine {
  evaluate(inputs: EngineInputs): QualityEngineOutput {
    const { financials, factors } = inputs;

    // ── Sub-score 1: ROE (Return on Equity) ─────────────────────────
    let roeNormalized = 50;
    if (financials.roe !== null) {
      const roe = financials.roe;
      if (roe >= 0.25) roeNormalized = 95;       // 25%+ exceptional
      else if (roe >= 0.20) roeNormalized = 85;  // 20-25% excellent
      else if (roe >= 0.15) roeNormalized = 75;  // 15-20% strong
      else if (roe >= 0.10) roeNormalized = 60;  // 10-15% good
      else if (roe >= 0.05) roeNormalized = 45;  // 5-10% average
      else if (roe >= 0) roeNormalized = 30;     // 0-5% weak
      else roeNormalized = 10;                    // negative
    }

    // ── Sub-score 2: ROIC (Return on Invested Capital) ──────────────
    let roicNormalized = 50;
    if (financials.roic !== null) {
      const roic = financials.roic;
      if (roic >= 0.20) roicNormalized = 95;
      else if (roic >= 0.15) roicNormalized = 80;
      else if (roic >= 0.10) roicNormalized = 65;
      else if (roic >= 0.05) roicNormalized = 50;
      else if (roic >= 0) roicNormalized = 35;
      else roicNormalized = 10;
    }

    // ── Sub-score 3: Gross Margin ───────────────────────────────────
    let grossMarginScore = 50;
    if (financials.grossMargin !== null) {
      const gm = financials.grossMargin;
      if (gm >= 0.60) grossMarginScore = 95;       // 60%+ premium pricing
      else if (gm >= 0.45) grossMarginScore = 80;   // 45-60% strong moat
      else if (gm >= 0.30) grossMarginScore = 65;   // 30-45% healthy
      else if (gm >= 0.20) grossMarginScore = 50;   // 20-30% average
      else if (gm >= 0.10) grossMarginScore = 35;   // 10-20% thin
      else grossMarginScore = 20;                    // <10% commodity
    }

    // ── Sub-score 4: Operating Margin ───────────────────────────────
    let operatingMarginScore = 50;
    if (financials.operatingMargin !== null) {
      const om = financials.operatingMargin;
      if (om >= 0.30) operatingMarginScore = 95;
      else if (om >= 0.20) operatingMarginScore = 80;
      else if (om >= 0.15) operatingMarginScore = 65;
      else if (om >= 0.10) operatingMarginScore = 50;
      else if (om >= 0.05) operatingMarginScore = 35;
      else operatingMarginScore = 20;
    }

    // ── Sub-score 5: Efficiency Score ───────────────────────────────
    // Combines asset turnover proxy (derived from margins & ROE relationship)
    // and operational efficiency signals from factor engine
    const qualityFactorScore = factors.qualityFactor;
    const hasEfficiencyData = financials.roe !== null && financials.grossMargin !== null;

    let efficiencyScore = 50;
    if (hasEfficiencyData) {
      // If ROE is high relative to margins, suggests strong asset efficiency
      const roe = financials.roe!;
      const gm = financials.grossMargin!;
      const efficiencyRatio = gm > 0 ? Math.min(roe / gm, 2.0) : 0;
      efficiencyScore = clampScore(efficiencyRatio * 40 + 30 + (qualityFactorScore - 50) * 0.2);
    } else {
      efficiencyScore = clampScore(40 + (qualityFactorScore - 50) * 0.5);
    }

    // ── Composite Score ─────────────────────────────────────────────
    const compositeScore = weightedAverage([
      { score: roeNormalized, weight: 2.5 },
      { score: roicNormalized, weight: 2.5 },
      { score: grossMarginScore, weight: 2 },
      { score: operatingMarginScore, weight: 2 },
      { score: efficiencyScore, weight: 1 },
    ]);

    const commentary = this.generateCommentary(compositeScore, financials);

    return {
      score: compositeScore,
      roe: financials.roe ?? 0,
      roic: financials.roic ?? 0,
      grossMargin: financials.grossMargin ?? 0,
      operatingMargin: financials.operatingMargin ?? 0,
      efficiencyScore,
      commentary,
    };
  }

  private generateCommentary(score: number, f: EngineInputs['financials']): string {
    const hasData = f.roe !== null || f.roic !== null;
    if (!hasData) return 'Insufficient quality metrics. Score reflects neutral baseline.';

    if (score >= 80) {
      const parts: string[] = [];
      if (f.roe !== null && f.roe >= 0.15) parts.push('high return on equity');
      if (f.grossMargin !== null && f.grossMargin >= 0.40) parts.push('strong pricing power');
      if (f.operatingMargin !== null && f.operatingMargin >= 0.20) parts.push('efficient operations');
      return `Premium quality business: ${parts.join(', ')}. Superior profitability metrics indicate durable competitive advantages.`;
    }

    if (score >= 60) {
      return 'Above-average business quality. Profitability metrics are healthy with reasonable capital efficiency.';
    }

    if (score >= 40) {
      return 'Average quality profile. Margins and returns are in line with market norms, suggesting moderate competitive positioning.';
    }

    return 'Below-average quality. Weak return metrics and thin margins suggest limited competitive advantages or operational challenges.';
  }
}

export const qualityEngine = new QualityEngine();
