/**
 * Engine 2: Quality Engine (RC-ENGINE-004 — Percentile Migration)
 * 
 * TRACK-P1: Per-metric percentile readiness, correct grossMargin mapping.
 * grossMargin → grossMargin (NOT operatingMargin).
 */

import { EngineInputs, QualityEngineOutput, clampScore, weightedAverage } from '../types';
import { getSectorProfile } from '../SectorAdapter';
import { SectorPercentileEngine } from '../scoring/SectorPercentileEngine';

export class QualityEngine {
  evaluate(inputs: EngineInputs): QualityEngineOutput {
    const { financials, factors, sector } = inputs;
    const profile = getSectorProfile(sector?.name ?? 'General');
    const sectorName = sector?.name ?? 'General';

    const percentileROE = SectorPercentileEngine.hasSufficientData(sectorName, 'roe');
    const percentileROA = SectorPercentileEngine.hasSufficientData(sectorName, 'roa');
    const percentileROIC = SectorPercentileEngine.hasSufficientData(sectorName, 'roic');
    const percentileGM = SectorPercentileEngine.hasSufficientData(sectorName, 'grossMargin');
    const percentileOM = SectorPercentileEngine.hasSufficientData(sectorName, 'operatingMargin');

    // ── Sub-score 1: ROE ────────────────────────────────────────────
    let roeNormalized = 50;
    if (financials.roe !== null) {
      if (percentileROE) {
        roeNormalized = SectorPercentileEngine.score(financials.roe, sectorName, 'roe');
      } else {
        const roe = financials.roe;
        if (roe >= profile.roeExceptional) roeNormalized = 95;
        else if (roe >= profile.roeHigh) roeNormalized = 80;
        else if (roe >= profile.roeFair) roeNormalized = 65;
        else if (roe >= profile.roeLow) roeNormalized = 45;
        else if (roe >= 0) roeNormalized = 30;
        else roeNormalized = 10;
      }
    }

    // ── Sub-score 2: ROA ────────────────────────────────────────────
    let roaNormalized = 50;
    if (financials.roa !== null) {
      if (percentileROA) {
        roaNormalized = SectorPercentileEngine.score(financials.roa, sectorName, 'roa');
      } else {
        const roa = financials.roa;
        if (roa >= 0.15) roaNormalized = 95;
        else if (roa >= 0.10) roaNormalized = 80;
        else if (roa >= 0.07) roaNormalized = 65;
        else if (roa >= 0.04) roaNormalized = 45;
        else if (roa >= 0) roaNormalized = 30;
        else roaNormalized = 10;
      }
    }

    // ── Sub-score 3: ROIC ───────────────────────────────────────────
    let roicNormalized = 50;
    if (financials.roic !== null) {
      if (percentileROIC) {
        roicNormalized = SectorPercentileEngine.score(financials.roic, sectorName, 'roic');
      } else {
        const roic = financials.roic;
        if (roic >= 0.20) roicNormalized = 95;
        else if (roic >= 0.15) roicNormalized = 80;
        else if (roic >= 0.10) roicNormalized = 65;
        else if (roic >= 0.05) roicNormalized = 50;
        else if (roic >= 0) roicNormalized = 35;
        else roicNormalized = 10;
      }
    }

    // ── Sub-score 4: Gross Margin ───────────────────────────────────
    let grossMarginScore = 50;
    if (profile.useGrossMargin && financials.grossMargin !== null) {
      if (percentileGM) {
        grossMarginScore = SectorPercentileEngine.score(financials.grossMargin, sectorName, 'grossMargin');
      } else {
        const gm = financials.grossMargin;
        if (gm >= profile.gmPremium) grossMarginScore = 95;
        else if (gm >= profile.gmHigh) grossMarginScore = 80;
        else if (gm >= profile.gmFair) grossMarginScore = 65;
        else if (gm >= profile.gmLow) grossMarginScore = 45;
        else grossMarginScore = 25;
      }
    }

    // ── Sub-score 5: Operating Margin ───────────────────────────────
    let operatingMarginScore = 50;
    if (financials.operatingMargin !== null) {
      if (percentileOM) {
        operatingMarginScore = SectorPercentileEngine.score(financials.operatingMargin, sectorName, 'operatingMargin');
      } else {
        const om = financials.operatingMargin;
        if (om >= profile.omPremium) operatingMarginScore = 95;
        else if (om >= profile.omHigh) operatingMarginScore = 80;
        else if (om >= profile.omFair) operatingMarginScore = 65;
        else if (om >= profile.omLow) operatingMarginScore = 45;
        else operatingMarginScore = 25;
      }
    }

    // ── Sub-score 6: Efficiency Score ───────────────────────────────
    const hasEfficiencyData = financials.roe !== null && financials.grossMargin !== null;
    let efficiencyScore = 50;
    if (hasEfficiencyData && profile.useGrossMargin) {
      const roe = financials.roe!;
      const gm = financials.grossMargin!;
      const efficiencyRatio = gm > 0 ? Math.min(roe / gm, 2.0) : 0;
      efficiencyScore = clampScore(efficiencyRatio * 40 + 30);
    }

    const gmWeight = profile.useGrossMargin ? 2 : 0;

    const rawComposite = weightedAverage([
      { score: roeNormalized, weight: 2.0 },
      { score: roaNormalized, weight: 2.0 },
      { score: roicNormalized, weight: 2.0 },
      { score: grossMarginScore, weight: gmWeight },
      { score: operatingMarginScore, weight: 2 },
      { score: efficiencyScore, weight: 1 },
    ]);

    const factorAdjust = (factors.qualityFactor - 50) * 0.2;
    const compositeScore = clampScore(rawComposite + factorAdjust);

    const anyPercentile = percentileROE || percentileROA || percentileROIC || percentileGM || percentileOM;
    const commentary = this.generateCommentary(compositeScore, financials, profile, anyPercentile);

    return {
      score: compositeScore,
      roa: financials.roa ?? 0,
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
    profile: ReturnType<typeof getSectorProfile>,
    usePercentile: boolean
  ): string {
    const hasData = f.roe !== null || f.roic !== null;
    if (!hasData) return 'Insufficient quality metrics. Score reflects neutral baseline.';

    const method = usePercentile ? ` (sector-percentile vs ${profile.name} peers)` : '';

    if (score >= 80) {
      const parts: string[] = [];
      if (f.roe !== null && f.roe >= profile.roeHigh) parts.push('high return on equity');
      if (profile.useGrossMargin && f.grossMargin !== null && f.grossMargin >= profile.gmHigh) parts.push('strong pricing power');
      return `Premium quality business${method}: ${parts.join(', ')}. Superior profitability metrics indicate durable competitive advantages.`;
    }

    if (score >= 60) return `Above-average business quality${method}. Profitability metrics are healthy.`;
    if (score >= 40) return `Average quality profile${method}. Margins and returns are in line with sector norms.`;
    return `Below-average quality${method}. Weak return metrics and thin margins suggest limited competitive advantages.`;
  }
}

export const qualityEngine = new QualityEngine();
