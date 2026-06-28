/**
 * Factor Attribution Engine
 *
 * Decomposes a company's composite score into factor contributions.
 * Tells you WHY a company scores well or poorly — which factors drive
 * the result and which drag it down.
 *
 * Deterministic factor model: quality, value, momentum, growth, risk.
 */

import type { IntelligenceInput } from '../../types';
import { clampScore } from '../../scoring';

export interface FactorAttribution {
  symbol: string;
  generatedAt: string;
  factors: FactorScore[];
  topContributors: FactorScore[];
  topDetractors: FactorScore[];
  overallAttribution: string;
}

export interface FactorScore {
  factor: string;
  weight: number;           // 0-1
  rawScore: number;         // 0-100
  contribution: number;     // Weighted contribution to composite
  interpretation: 'strong_tailwind' | 'tailwind' | 'neutral' | 'headwind' | 'strong_headwind';
  evidence: string[];       // Evidence fields supporting this score
  explanation: string;
}

export class FactorAttributionEngine {
  analyze(input: IntelligenceInput): FactorAttribution {
    const f = input.financials;
    const t = input.technicals;

    const factors: FactorScore[] = [
      this.qualityFactor(f),
      this.momentumFactor(t),
      this.valueFactor(f),
      this.growthFactor(f),
      this.riskFactor(f, t),
      this.sectorFactor(input),
    ];

    const sorted = [...factors].sort((a, b) => b.contribution - a.contribution);
    const topContributors = sorted.filter(s => s.interpretation === 'strong_tailwind' || s.interpretation === 'tailwind').slice(0, 3);
    const topDetractors = sorted.filter(s => s.interpretation === 'strong_headwind' || s.interpretation === 'headwind').slice(0, 3);

    const overall = this.buildOverall(sorted);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      factors,
      topContributors,
      topDetractors,
      overallAttribution: overall,
    };
  }

  private qualityFactor(f: IntelligenceInput['financials']): FactorScore {
    let score = 50;
    const evidence: string[] = [];

    if (f.roe !== null) { evidence.push('roe'); score += f.roe > 15 ? 20 : f.roe > 10 ? 10 : -5; }
    if (f.roic !== null) { evidence.push('roic'); score += f.roic > 12 ? 15 : f.roic > 8 ? 5 : -5; }
    if (f.operatingMargin !== null) { evidence.push('operatingMargin'); score += f.operatingMargin > 20 ? 10 : f.operatingMargin > 10 ? 5 : -5; }
    if (f.debtToEquity !== null) { evidence.push('debtToEquity'); score += f.debtToEquity < 0.5 ? 10 : f.debtToEquity < 1 ? 5 : -10; }

    const clamped = clampScore(score);
    return {
      factor: 'Quality',
      weight: 0.25,
      rawScore: clamped,
      contribution: Math.round(clamped * 0.25 * 100) / 100,
      interpretation: clamped >= 65 ? 'strong_tailwind' : clamped >= 50 ? 'tailwind' : clamped >= 35 ? 'headwind' : 'strong_headwind',
      evidence,
      explanation: this.qualityExplanation(f),
    };
  }

  private momentumFactor(t: IntelligenceInput['technicals']): FactorScore {
    let score = 50;
    const evidence: string[] = [];

    if (t.momentum3m !== null) { evidence.push('momentum3m'); score += t.momentum3m > 10 ? 15 : t.momentum3m > 0 ? 5 : -10; }
    if (t.momentum6m !== null) { evidence.push('momentum6m'); score += t.momentum6m > 15 ? 10 : t.momentum6m > 0 ? 5 : -5; }
    if (t.rsi !== null) { evidence.push('rsi'); score += t.rsi > 65 ? -5 : t.rsi < 30 ? 5 : 0; }
    if (t.sma50Distance !== null) { evidence.push('sma50Distance'); score += t.sma50Distance > 0 ? 5 : -5; }

    const clamped = clampScore(score);
    return {
      factor: 'Momentum',
      weight: 0.15,
      rawScore: clamped,
      contribution: Math.round(clamped * 0.15 * 100) / 100,
      interpretation: clamped >= 65 ? 'strong_tailwind' : clamped >= 50 ? 'tailwind' : clamped >= 35 ? 'headwind' : 'strong_headwind',
      evidence,
      explanation: clamped >= 65 ? 'Price momentum is constructive across timeframes.' : clamped >= 50 ? 'Momentum is neutral to slightly positive.' : 'Momentum signals are weak. Price action may need monitoring.',
    };
  }

  private valueFactor(f: IntelligenceInput['financials']): FactorScore {
    let score = 50;
    const evidence: string[] = [];

    if (f.peRatio !== null) { evidence.push('peRatio'); score += f.peRatio < 15 ? 15 : f.peRatio < 25 ? 5 : -5; }
    if (f.pbRatio !== null) { evidence.push('pbRatio'); score += f.pbRatio < 2 ? 10 : f.pbRatio < 4 ? 0 : -5; }
    if (f.evEbitda !== null) { evidence.push('evEbitda'); score += f.evEbitda < 10 ? 15 : f.evEbitda < 15 ? 5 : -5; }
    if (f.dividendYield !== null && f.dividendYield > 2) { evidence.push('dividendYield'); score += 5; }

    const clamped = clampScore(score);
    return {
      factor: 'Value',
      weight: 0.15,
      rawScore: clamped,
      contribution: Math.round(clamped * 0.15 * 100) / 100,
      interpretation: clamped >= 65 ? 'strong_tailwind' : clamped >= 50 ? 'tailwind' : clamped >= 35 ? 'headwind' : 'strong_headwind',
      evidence,
      explanation: clamped >= 65 ? 'Valuation multiples are below historical norms.' : 'Valuation is within reasonable range relative to fundamentals.',
    };
  }

  private growthFactor(f: IntelligenceInput['financials']): FactorScore {
    let score = 50;
    const evidence: string[] = [];

    if (f.revenueGrowth !== null) { evidence.push('revenueGrowth'); score += f.revenueGrowth > 15 ? 15 : f.revenueGrowth > 5 ? 5 : -5; }
    if (f.profitGrowth !== null) { evidence.push('profitGrowth'); score += f.profitGrowth > 15 ? 10 : f.profitGrowth > 5 ? 5 : -5; }
    if (f.epsGrowth !== null) { evidence.push('epsGrowth'); score += f.epsGrowth > 15 ? 10 : f.epsGrowth > 5 ? 5 : -5; }
    if (f.operatingMargin !== null && f.revenueGrowth !== null && f.revenueGrowth > 10) {
      score += f.operatingMargin > 15 ? 5 : 0;
    }

    const clamped = clampScore(score);
    return {
      factor: 'Growth',
      weight: 0.20,
      rawScore: clamped,
      contribution: Math.round(clamped * 0.20 * 100) / 100,
      interpretation: clamped >= 65 ? 'strong_tailwind' : clamped >= 50 ? 'tailwind' : clamped >= 35 ? 'headwind' : 'strong_headwind',
      evidence,
      explanation: clamped >= 65 ? 'Strong growth across revenue, profit, and earnings.' : `Revenue growth ${f.revenueGrowth ?? '—'}%, profit growth ${f.profitGrowth ?? '—'}%.`,
    };
  }

  private riskFactor(f: IntelligenceInput['financials'], t: IntelligenceInput['technicals']): FactorScore {
    let score = 50;
    const evidence: string[] = [];

    if (f.debtToEquity !== null) { evidence.push('debtToEquity'); score += f.debtToEquity > 1.5 ? -15 : f.debtToEquity > 1 ? -5 : 5; }
    if (t.volatility !== null) { evidence.push('volatility'); score += t.volatility > 50 ? -10 : t.volatility > 30 ? -5 : 0; }
    if (f.interestCoverage !== null) { evidence.push('interestCoverage'); score += f.interestCoverage < 2 ? -15 : f.interestCoverage < 4 ? -5 : 5; }
    if (f.currentRatio !== null) { evidence.push('currentRatio'); score += f.currentRatio < 1 ? -10 : 0; }

    const clamped = clampScore(score);
    // Invert interpretation: high risk score = headwind
    return {
      factor: 'Risk',
      weight: 0.15,
      rawScore: clamped,
      contribution: Math.round(clamped * 0.15 * 100) / 100,
      interpretation: clamped >= 65 ? 'strong_tailwind' : clamped >= 50 ? 'tailwind' : clamped >= 35 ? 'headwind' : 'strong_headwind',
      evidence,
      explanation: clamped >= 65 ? 'Risk profile is well contained.' : 'Some risk factors need monitoring.',
    };
  }

  private sectorFactor(input: IntelligenceInput): FactorScore {
    const s = input.sector;
    let score = 50;
    const evidence: string[] = ['sector'];

    if (s.sectorStrength !== null) { score += s.sectorStrength > 70 ? 15 : s.sectorStrength > 50 ? 5 : -5; }
    if (s.sectorMomentum === 'accelerating') score += 10;
    if (s.sectorMomentum === 'decelerating') score -= 10;

    const clamped = clampScore(score);
    return {
      factor: 'Sector',
      weight: 0.10,
      rawScore: clamped,
      contribution: Math.round(clamped * 0.10 * 100) / 100,
      interpretation: clamped >= 65 ? 'strong_tailwind' : clamped >= 50 ? 'tailwind' : clamped >= 35 ? 'headwind' : 'strong_headwind',
      evidence,
      explanation: `Sector ${s.name || ''} strength ${s.sectorStrength ?? '—'}/100, momentum ${s.sectorMomentum ?? '—'}.`,
    };
  }

  private qualityExplanation(f: IntelligenceInput['financials']): string {
    const parts: string[] = [];
    if (f.roe !== null) parts.push(`ROE ${f.roe}%`);
    if (f.roic !== null) parts.push(`ROIC ${f.roic}%`);
    if (f.operatingMargin !== null) parts.push(`operating margin ${f.operatingMargin}%`);
    if (f.debtToEquity !== null) parts.push(`D/E ${f.debtToEquity}x`);
    return parts.length > 0 ? parts.join(', ') : 'Quality assessment based on available data.';
  }

  private buildOverall(factors: FactorScore[]): string {
    const tailwinds = factors.filter(f => f.interpretation.includes('tailwind'));
    const headwinds = factors.filter(f => f.interpretation.includes('headwind'));

    if (tailwinds.length > headwinds.length) {
      return `${tailwinds.length} factor tailwinds (${tailwinds.map(f => f.factor).join(', ')}) outweigh ${headwinds.length} headwinds.`;
    }
    if (headwinds.length > tailwinds.length) {
      return `${headwinds.length} factor headwinds (${headwinds.map(f => f.factor).join(', ')}) suggest caution.`;
    }
    return 'Factors are balanced between tailwinds and headwinds.';
  }
}

export const factorAttributionEngine = new FactorAttributionEngine();
