/**
 * Valuation Regime Engine
 *
 * Classifies the valuation context of a stock — not "overvalued/undervalued"
 * (that's a judgment), but the REGIME: is it trading at a premium justified
 * by quality, or is there a disconnect between valuation and fundamentals?
 *
 * Contextual: PE of 40 can be justified by 30% ROE and 25% growth.
 */

import type { IntelligenceInput } from '../../types';
import { clampScore } from '../scoring';

export interface ValuationRegimeReport {
  symbol: string;
  generatedAt: string;

  /** Regime classification */
  regime: ValuationRegime;

  /** Valuation-context alignment score */
  alignmentScore: number;            // 0-100

  /** Components */
  valuationSnapshot: ValuationSnapshot;
  qualityContext: QualityContext;
  growthContext: GrowthContext;

  /** Product summary */
  summary: string;
}

export type ValuationRegime =
  'quality_at_fair_price' |       // Quality company, reasonable valuation
  'quality_at_premium' |          // Quality company, above-sector valuation
  'value_opportunity' |           // Quality at a discount — but why?
  'growth_at_premium' |           // High growth justifying higher multiples
  'valuation_disconnect' |        // Valuation inconsistent with fundamentals
  'insufficient_data';

export interface ValuationSnapshot {
  peRatio: number | null;
  sectorPE: number | null;
  pbRatio: number | null;
  evToEbitda: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  peToGrowth: number | null;       // PEG-like
}

export interface QualityContext {
  roe: number | null;
  roic: number | null;
  operatingMargin: number | null;
  debtToEquity: number | null;
  qualityJustifiesValuation: boolean | null;
}

export interface GrowthContext {
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  growthJustifiesValuation: boolean | null;
}

export class ValuationRegimeEngine {
  analyze(input: IntelligenceInput): ValuationRegimeReport {
    const f = input.financials;
    const snapshot = this.buildSnapshot(f, input.sector);
    const quality = this.buildQualityContext(f);
    const growth = this.buildGrowthContext(f);
    const { regime, alignmentScore } = this.classifyRegime(snapshot, quality, growth);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      regime,
      alignmentScore,
      valuationSnapshot: snapshot,
      qualityContext: quality,
      growthContext: growth,
      summary: this.buildSummary(regime, alignmentScore, snapshot),
    };
  }

  private buildSnapshot(
    f: IntelligenceInput['financials'],
    s: IntelligenceInput['sector'],
  ): ValuationSnapshot {
    const peToGrowth = f.peRatio !== null && f.epsGrowth !== null && f.epsGrowth > 0
      ? Math.round((f.peRatio / f.epsGrowth) * 100) / 100
      : null;

    return {
      peRatio: f.peRatio,
      sectorPE: s.sectorPe,
      pbRatio: f.pbRatio,
      evToEbitda: f.evEbitda,
      fcfYield: f.fcfYield,
      dividendYield: f.dividendYield,
      peToGrowth,
    };
  }

  private buildQualityContext(f: IntelligenceInput['financials']): QualityContext {
    let justifies: boolean | null = null;

    if (f.roe !== null && f.debtToEquity !== null && f.operatingMargin !== null) {
      // Quality is high when ROE > 15, margins > 15%, low debt
      const qualityHigh = f.roe > 15 && f.operatingMargin > 15 && f.debtToEquity < 1;
      // Quality justifies premium valuation
      justifies = qualityHigh;
    }

    return {
      roe: f.roe,
      roic: f.roic,
      operatingMargin: f.operatingMargin,
      debtToEquity: f.debtToEquity,
      qualityJustifiesValuation: justifies,
    };
  }

  private buildGrowthContext(f: IntelligenceInput['financials']): GrowthContext {
    let justifies: boolean | null = null;

    if (f.revenueGrowth !== null && f.profitGrowth !== null) {
      justifies = f.revenueGrowth > 15 && f.profitGrowth > 10;
    }

    return {
      revenueGrowth: f.revenueGrowth,
      profitGrowth: f.profitGrowth,
      epsGrowth: f.epsGrowth,
      growthJustifiesValuation: justifies,
    };
  }

  private classifyRegime(
    s: ValuationSnapshot,
    q: QualityContext,
    g: GrowthContext,
  ): { regime: ValuationRegime; alignmentScore: number } {
    // Cannot classify without valuation data
    if (s.peRatio === null && s.evToEbitda === null) {
      return { regime: 'insufficient_data', alignmentScore: 0 };
    }

    const qualityHigh = q.qualityJustifiesValuation === true;
    const growthHigh = g.growthJustifiesValuation === true;
    const premiumToSector = s.sectorPE !== null && s.peRatio !== null && s.peRatio > s.sectorPE * 1.2;
    const discountToSector = s.sectorPE !== null && s.peRatio !== null && s.peRatio < s.sectorPE * 0.7;

    // Quality + growth → premium justified
    if (qualityHigh && growthHigh) {
      return {
        regime: premiumToSector ? 'growth_at_premium' : 'quality_at_fair_price',
        alignmentScore: 80,
      };
    }

    // Quality + discount → potential value opportunity
    if (qualityHigh && discountToSector) {
      return {
        regime: 'value_opportunity',
        alignmentScore: 70,
      };
    }

    // Quality but fair price
    if (qualityHigh) {
      return {
        regime: premiumToSector ? 'quality_at_premium' : 'quality_at_fair_price',
        alignmentScore: premiumToSector ? 55 : 75,
      };
    }

    // Growth at premium but quality unclear
    if (growthHigh) {
      return {
        regime: premiumToSector ? 'growth_at_premium' : 'quality_at_fair_price',
        alignmentScore: premiumToSector ? 45 : 60,
      };
    }

    // Neither quality nor growth justify premium → disconnect
    if (premiumToSector) {
      return { regime: 'valuation_disconnect', alignmentScore: 25 };
    }

    return { regime: 'quality_at_fair_price', alignmentScore: 50 };
  }

  private buildSummary(regime: ValuationRegime, score: number, s: ValuationSnapshot): string {
    const peStr = s.peRatio !== null ? `PE ${s.peRatio}x` : '';
    const sectorPeStr = s.sectorPE !== null ? ` (sector ${s.sectorPE}x)` : '';

    switch (regime) {
      case 'quality_at_fair_price': return `${peStr}${sectorPeStr} — Valuation is consistent with quality fundamentals.`;
      case 'quality_at_premium': return `${peStr}${sectorPeStr} — Premium to sector. Quality fundamentals may justify the premium.`;
      case 'value_opportunity': return `${peStr}${sectorPeStr} — Below sector. Quality at a discount — review why the market is discounting.`;
      case 'growth_at_premium': return `${peStr}${sectorPeStr} — Premium reflects above-sector growth expectations.`;
      case 'valuation_disconnect': return `${peStr}${sectorPeStr} — Valuation appears disconnected from fundamentals. Research further.`;
      case 'insufficient_data': return 'Valuation assessment requires additional data.';
      default: return 'Valuation regime assessment based on available data.';
    }
  }
}

export const valuationRegimeEngine = new ValuationRegimeEngine();
