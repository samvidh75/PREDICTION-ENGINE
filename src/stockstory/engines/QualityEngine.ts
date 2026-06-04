/**
 * Engine 2: Quality Engine
 * Weight: 25%
 * 
 * Inputs: ROE, ROIC, Gross Margin, Operating Margin, Efficiency
 * 
 * Evaluates business quality through profitability and capital efficiency.
 * Scores are normalized 0-100 where higher = better quality.
 * 
 * FIX (RC-ENGINE-002): Factor adjustment at composite level only.
 * FIX (RC-ENGINE-002): Sector-aware margin and ROE thresholds.
 */

import { EngineInputs, QualityEngineOutput, clampScore, weightedAverage } from '../types';
import { getSectorProfile } from '../SectorAdapter';

export class QualityEngine {
  evaluate(inputs: EngineInputs): QualityEngineOutput {
    const { financials, factors, sector } = inputs;
    const profile = getSectorProfile(sector?.name ?? 'General');

    // ── Sub-score 1: ROE (Return on Equity) — sector-aware ─────────
    let roeNormalized = 50;
    if (financials.roe !== null) {
      const roe = financials.roe;
      if (roe >= profile.roeExceptional) roeNormalized = 95;
      else if (roe >= profile.roeHigh) roeNormalized = 80;
      else if (roe >= profile.roeFair) roeNormalized = 65;
      else if (roe >= profile.roeLow) roeNormalized = 45;
      else if (roe >= 0) roeNormalized = 30;
      else roeNormalized = 10;
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

    // ── Sub-score 3: Gross Margin — sector-aware ───────────────────
    let grossMarginScore = 50;
    if (profile.useGrossMargin && financials.grossMargin !== null) {
      const gm = financials.grossMargin;
      if (gm >= profile.gmPremium) grossMarginScore = 95;
      else if (gm >= profile.gmHigh) grossMarginScore = 80;
      else if (gm >= profile.gmFair) grossMarginScore = 65;
      else if (gm >= profile.gmLow) grossMarginScore = 45;
      else grossMarginScore = 25;
    }
    // For financials (banks/insurance), gross margin is not applicable → stays at 50 neutral

    // ── Sub-score 4: Operating Margin — sector-aware ───────────────
    let operatingMarginScore = 50;
    if (financials.operatingMargin !== null) {
      const om = financials.operatingMargin;
      if (om >= profile.omPremium) operatingMarginScore = 95;
      else if (om >= profile.omHigh) operatingMarginScore = 80;
      else if (om >= profile.omFair) operatingMarginScore = 65;
      else if (om >= profile.omLow) operatingMarginScore = 45;
      else operatingMarginScore = 25;
    }

    // ── Sub-score 5: Efficiency Score ───────────────────────────────
    const hasEfficiencyData = financials.roe !== null && financials.grossMargin !== null;

    let efficiencyScore = 50;
    if (hasEfficiencyData && profile.useGrossMargin) {
      const roe = financials.roe!;
      const gm = financials.grossMargin!;
      const efficiencyRatio = gm > 0 ? Math.min(roe / gm, 2.0) : 0;
      efficiencyScore = clampScore(efficiencyRatio * 40 + 30);
    }

    // ── Gross margin weight for financials: zero it out ─────────────
    const gmWeight = profile.useGrossMargin ? 2 : 0;

    // ── Composite Score ─────────────────────────────────────────────
    const rawComposite = weightedAverage([
      { score: roeNormalized, weight: 2.5 },
      { score: roicNormalized, weight: 2.5 },
      { score: grossMarginScore, weight: gmWeight },
      { score: operatingMarginScore, weight: 2 },
      { score: efficiencyScore, weight: 1 },
    ]);

    // ── Factor adjustment ONCE at composite level ───────────────────
    const factorAdjust = (factors.qualityFactor - 50) * 0.2;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const commentary = this.generateCommentary(compositeScore, financials, profile);

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

  private generateCommentary(
    score: number,
    f: EngineInputs['financials'],
    profile: ReturnType<typeof getSectorProfile>
  ): string {
    const hasData = f.roe !== null || f.roic !== null;
    if (!hasData) return 'Insufficient quality metrics. Score reflects neutral baseline.';

    if (score >= 80) {
      const parts: string[] = [];
      if (f.roe !== null && f.roe >= profile.roeHigh) parts.push('high return on equity');
      if (profile.useGrossMargin && f.grossMargin !== null && f.grossMargin >= profile.gmHigh) parts.push('strong pricing power');
      if (f.operatingMargin !== null && f.operatingMargin >= profile.omHigh) parts.push('efficient operations');
      return `Premium quality business ${profile.name !== 'General' ? `within ${profile.name} sector` : ''}: ${parts.join(', ')}. Superior profitability metrics indicate durable competitive advantages.`;
    }

    if (score >= 60) {
      return 'Above-average business quality. Profitability metrics are healthy with reasonable capital efficiency.';
    }

    if (score >= 40) {
      return 'Average quality profile. Margins and returns are in line with sector norms, suggesting moderate competitive positioning.';
    }

    return 'Below-average quality. Weak return metrics and thin margins suggest limited competitive advantages or operational challenges.';
  }
}

export const qualityEngine = new QualityEngine();
