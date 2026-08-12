/**
 * Moat Engine
 *
 * Evaluates competitive moat and barriers to entry for a given stock.
 * Returns a complete MoatAssessment tagged with the input symbol so report
 * aggregation can attribute the assessment back to the issuer.
 */

import { clampScore } from '../scoring';
import type { IntelligenceInput } from '../types';

export interface PowerAssessment {
  score: number;
  level: 'high' | 'moderate' | 'low' | 'unclear';
  description: string;
}

export interface MoatAssessment {
  symbol: string;
  moatScore: number;             // 0-100,
  moatWidth: 'wide' | 'narrow' | 'none' | 'unclear';
  pricingPower: 'strong' | 'moderate' | 'weak' | 'unclear';
  switchingCosts: 'high' | 'moderate' | 'low' | 'unclear';
  networkEffects: boolean | null;
  costAdvantage: boolean | null;
  intangibleAssets: boolean | null;
  factors: string[];
  supplierPower: PowerAssessment;
  buyerPower: PowerAssessment;
}

export class MoatEngine {
  analyze(input: IntelligenceInput): MoatAssessment {
    const s = input.sector;
    const f = input.financials;
    let score = 30;
    const factors: string[] = [];

    // Scale advantage — market cap in PHP millions, ~PHP 500B+ = PSE mega-cap
    if (f.marketCap !== null && f.marketCap > 500000) {
      score += 20;
      factors.push('Significant scale advantage');
    }

    // High return on capital
    if (f.operatingMargin !== null && f.operatingMargin > 20) {
      score += 15;
      factors.push('Industry requires scale or expertise (indicated by high margins)');
    }

    // Capital intensity as barrier
    if (f.capex !== null && f.revenueGrowth !== null) {
      const assetIntensity = f.assetTurnover !== null ? (1 / f.assetTurnover) : null;
      if (assetIntensity !== null && assetIntensity > 2) {
        score += 10;
        factors.push('Capital-intensive industry with high entry costs');
      }
    }

    // Regulatory barriers (Philippines-specific)
    const regName = (s.name || '').toLowerCase();
    if (regName.includes('bank') || regName.includes('insurance') || regName.includes('telecom')) {
      score += 15;
      factors.push('Regulated sector with licensing barriers');
    }

    const moatScore = clampScore(score);

    return {
      symbol: input.symbol,
      moatScore,
      moatWidth: moatScore >= 65 ? 'wide' : moatScore >= 40 ? 'narrow' : 'unclear',
      pricingPower: f.operatingMargin !== null && f.operatingMargin > 20 ? 'strong'
        : f.operatingMargin !== null && f.operatingMargin > 10 ? 'moderate'
        : 'unclear',
      switchingCosts: f.roic !== null && f.roic > 15 ? 'high' : 'unclear',
      networkEffects: null,
      costAdvantage: f.operatingMargin !== null && f.operatingMargin > 25,
      intangibleAssets: f.roa !== null && f.roa > 15,
      factors,
      supplierPower: this.assessSupplierPower(f, s),
      buyerPower: this.assessBuyerPower(f),
    };
  }

  // ── Supplier power ──────────────────────────────────────────

  private assessSupplierPower(
    f: IntelligenceInput['financials'],
    s: IntelligenceInput['sector'],
  ): PowerAssessment {
    let score = 30;
    let desc: string;

    // High gross margins mean low direct costs = low supplier power
    if (f.grossMargin !== null && f.grossMargin > 50) { score += 20; desc = 'High gross margins suggest low supplier power.'; }
    else if (f.grossMargin !== null && f.grossMargin > 30) { score += 10; desc = 'Moderate supplier power based on gross margins.'; }
    else { score += 0; desc = 'Supplier power assessment limited without supply-chain data.'; }

    // Commodity-dependent sectors face higher supplier power
    const name = (s.name || '').toLowerCase();
    if (name.includes('metal') || name.includes('oil') || name.includes('commodity')) {
      score += 20;
      desc = 'Commodity input dependence gives suppliers pricing power.';
    }

    return {
      score: clampScore(score),
      level: score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low',
      description: desc,
    };
  }

  // ── Buyer power ─────────────────────────────────────────────

  private assessBuyerPower(f: IntelligenceInput['financials']): PowerAssessment {
    let score = 30;
    let desc: string;

    if (f.operatingMargin !== null && f.operatingMargin > 15) {
      score += 20;
      desc = 'High margins suggest strong pricing power vs buyers.';
    } else if (f.operatingMargin !== null && f.operatingMargin > 8) {
      score += 10;
      desc = 'Moderate pricing power.';
    } else {
      score += 0;
      desc = 'Limited pricing power data available.';
    }

    return {
      score: clampScore(score),
      level: score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low',
      description: desc,
    };
  }
}

export const moatEngine = new MoatEngine();

