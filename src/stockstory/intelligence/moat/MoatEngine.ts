/**
 * Moat Engine
 *
 * Assesses economic moat (sustainable competitive advantage) for PSX companies.
 * Uses Porter's Five Forces framework adapted for PSX markets.
 * Deterministic rules based on financial data — no qualitative claims without evidence.
 */

import type { IntelligenceInput } from '../../types';
import { clampScore } from '../scoring';

export interface MoatAssessment {
  symbol: string;
  generatedAt: string;

  /** Overall moat assessment */
  moatWidth: 'wide' | 'narrow' | 'none' | 'unclear';
  moatScore: number;             // 0-100

  /** Sub-components */
  competitiveAdvantage: CompetitiveAdvantage;
  barriers: EntryBarriers;
  supplierPower: PowerAssessment;
  buyerPower: PowerAssessment;
  substitutionRisk: RiskAssessment;

  /** Product-facing summary */
  summary: string[];
  dataLimitations: string[];
}

export interface CompetitiveAdvantage {
  score: number;
  type: 'cost' | 'differentiation' | 'focus' | 'mixed' | 'unclear';
  sustainable: boolean;
  evidence: string[];
}

export interface EntryBarriers {
  score: number;
  level: 'high' | 'moderate' | 'low' | 'unclear';
  factors: string[];
}

export interface PowerAssessment {
  score: number;
  level: 'high' | 'moderate' | 'low' | 'unclear';
  description: string;
}

export interface RiskAssessment {
  score: number;
  level: 'high' | 'moderate' | 'low' | 'unclear';
  description: string;
}

export class MoatEngine {
  analyze(input: IntelligenceInput): MoatAssessment {
    const f = input.financials;
    const s = input.sector;

    const advantage = this.assessAdvantage(f);
    const barriers = this.assessBarriers(f, s);
    const supplierPower = this.assessSupplierPower(f, s);
    const buyerPower = this.assessBuyerPower(f);
    const substitutionRisk = this.assessSubstitution(f, s);

    const moatScore = clampScore(Math.round(
      advantage.score * 0.35 +
      barriers.score * 0.25 +
      (100 - supplierPower.score) * 0.15 +
      (100 - buyerPower.score) * 0.15 +
      (100 - substitutionRisk.score) * 0.10
    ));

    const summary = this.buildSummary(moatScore, advantage, barriers);
    const dataLimitations = this.buildLimitations(f);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      moatWidth: moatScore >= 65 ? 'wide' : moatScore >= 40 ? 'narrow' : moatScore >= 20 ? 'none' : 'unclear',
      moatScore,
      competitiveAdvantage: advantage,
      barriers,
      supplierPower,
      buyerPower,
      substitutionRisk,
      summary,
      dataLimitations,
    };
  }

  // ── Competitive advantage ──────────────────────────────────

  private assessAdvantage(f: IntelligenceInput['financials']): CompetitiveAdvantage {
    let score = 30;
    const evidence: string[] = [];
    let type: CompetitiveAdvantage['type'] = 'unclear';

    // ROIC > cost of capital indicates durable advantage
    if (f.roic !== null && f.roic > 20) { score += 30; evidence.push(`ROIC ${f.roic}% >> cost of capital`); }
    else if (f.roic !== null && f.roic > 15) { score += 20; evidence.push(`ROIC ${f.roic}% > cost of capital`); }
    else if (f.roic !== null && f.roic > 10) { score += 10; evidence.push(`ROIC ${f.roic}% ~ cost of capital`); }

    // High margins suggest pricing power or cost advantage
    if (f.operatingMargin !== null && f.operatingMargin > 25) {
      score += 20;
      evidence.push(`Operating margin ${f.operatingMargin}%`);
      type = f.grossMargin !== null && f.grossMargin > 40 ? 'differentiation' : 'cost';
    } else if (f.operatingMargin !== null && f.operatingMargin > 15) {
      score += 10;
      evidence.push(`Operating margin ${f.operatingMargin}%`);
    }

    // Asset turnover (efficiency)
    if (f.assetTurnover !== null && f.assetTurnover > 1.5) { score += 10; evidence.push('High asset efficiency'); }

    // ROA consistency
    if (f.roa !== null && f.roa > 10) { score += 10; evidence.push(`ROA ${f.roa}%`); }

    return {
      score: clampScore(score),
      type,
      sustainable: f.roic !== null && f.roic > 12,
      evidence,
    };
  }

  // ── Entry barriers ──────────────────────────────────────────

  private assessBarriers(
    f: IntelligenceInput['financials'],
    s: IntelligenceInput['sector'],
  ): EntryBarriers {
    let score = 40;
    const factors: string[] = [];

    // High margins attract competition — but sustained high margins suggest barriers
    if (f.operatingMargin !== null && f.operatingMargin > 20) {
      score += 15;
      factors.push('Industry requires scale or expertise (indicated by high margins)');
    }

    // Capital intensity as barrier
    if (f.capex !== null && f.revenueGrowth !== null) {
      // High capex relative to assets = capital intensive
      const assetIntensity = f.assetTurnover !== null ? (1 / f.assetTurnover) : null;
      if (assetIntensity !== null && assetIntensity > 2) {
        score += 10;
        factors.push('Capital-intensive industry with high entry costs');
      }
    }

    // Regulatory barriers (Pakistan-specific)
    const regName = (s.name || '').toLowerCase();
    if (regName.includes('bank') || regName.includes('insurance') || regName.includes('telecom')) {
      score += 15;
      factors.push('Regulated sector with licensing barriers');
    }

    return {
      score: clampScore(score),
      level: score >= 65 ? 'high' : score >= 40 ? 'moderate' : 'unclear',
      factors,
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

    if (f.operatingMargin !== null && f.operatingMargin > 25) {
      score += 20;
      desc = 'High margins suggest limited buyer power.';
    } else if (f.operatingMargin !== null && f.operatingMargin > 15) {
      score += 10;
      desc = 'Moderate margins suggest manageable buyer power.';
    } else {
      score += 0;
      desc = 'Thin margins may indicate significant buyer power.';
    }

    // Customer concentration (not available at this level)

    return {
      score: clampScore(score),
      level: score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low',
      description: desc,
    };
  }

  // ── Substitution risk ───────────────────────────────────────

  private assessSubstitution(
    f: IntelligenceInput['financials'],
    s: IntelligenceInput['sector'],
  ): RiskAssessment {
    let score = 30;
    let desc = 'Substitution risk assessed from available data.';

    const name = (s.name || '').toLowerCase();
    if (name.includes('tech') || name.includes('software') || name.includes('it')) {
      score += 10;
      desc = 'Technology sectors face moderate substitution risk from innovation.';
    }
    if (name.includes('fmcg') || name.includes('consumer staple')) {
      score -= 10;
      desc = 'Staple products have low substitution risk.';
    }
    if (name.includes('pharma')) {
      score += 15;
      desc = 'High substitution risk from generics and patent expiries.';
    }

    return {
      score: clampScore(score),
      level: score >= 60 ? 'high' : score >= 35 ? 'moderate' : 'low',
      description: desc,
    };
  }

  private buildSummary(
    moatScore: number,
    advantage: CompetitiveAdvantage,
    barriers: EntryBarriers,
  ): string[] {
    const points: string[] = [];
    if (moatScore >= 65) points.push('Strong economic moat indicated by financial metrics.');
    else if (moatScore >= 40) points.push('Moderate competitive position — some moat characteristics present.');
    else points.push('No clear economic moat identified from available data.');

    if (advantage.evidence.length > 0) {
      points.push(`Competitive advantages: ${advantage.evidence.join('; ')}.`);
    }
    return points;
  }

  private buildLimitations(f: IntelligenceInput['financials']): string[] {
    const limits: string[] = [];
    limits.push('Moat assessment based on financial data only — qualitative factors require independent research.');
    return limits;
  }
}

export const moatEngine = new MoatEngine();
