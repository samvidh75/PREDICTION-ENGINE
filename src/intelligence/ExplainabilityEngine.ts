/**
 * TRACK-46B — Explainability Engine
 *
 * Answers: WHY does this company have this score?
 * For every score component, breaks down positive drivers, negative drivers,
 * and their relative contributions. No black boxes allowed.
 *
 * Consumes: StockStoryOutput (all 7 engine sub-outputs)
 * Produces: ExplainabilityOutput — factor contribution breakdown per component
 */

import type {
  StockStoryOutput,
  EngineInputs,
} from '../stockstory/types';

// ─── Contribution descriptor ──────────────────────────────────────

export interface FactorContribution {
  name: string;
  score: number;        // 0-100
  contribution: number; // -100 to +100 (positive = helped score, negative = hurt score)
  weight: number;       // relative weight in composite (0-1)
  rationale: string;
}

export interface ScoreExplanation {
  component: string;
  overallScore: number;
  drivers: FactorContribution[];
  summary: string;
  whatImproved: string[];
  whatDeteriorated: string[];
  whatMattersMost: string;
}

export interface ExplainabilityOutput {
  symbol: string;
  generatedAt: string;
  healthScore: ScoreExplanation;
  growth: ScoreExplanation;
  quality: ScoreExplanation;
  stability: ScoreExplanation;
  valuation: ScoreExplanation;
  momentum: ScoreExplanation;
  risk: ScoreExplanation;
  overallNarrative: string;
  dataFreshness: 'Live' | 'Recent' | 'Stale' | 'Unavailable';
}

// ─── Engine ───────────────────────────────────────────────────────

export class ExplainabilityEngine {
  evaluate(output: StockStoryOutput, inputs: EngineInputs): ExplainabilityOutput {
    const healthDrivers = this.explainHealth(output);
    const growthDrivers = this.explainGrowth(output);
    const qualityDrivers = this.explainQuality(output);
    const stabilityDrivers = this.explainStability(output);
    const valuationDrivers = this.explainValuation(output);
    const momentumDrivers = this.explainMomentum(output);
    const riskDrivers = this.explainRisk(output);

    const overallNarrative = this.buildOverallNarrative([
      healthDrivers, growthDrivers, qualityDrivers,
      stabilityDrivers, valuationDrivers, momentumDrivers, riskDrivers,
    ]);

    return {
      symbol: inputs.symbol,
      generatedAt: output.generatedAt,
      healthScore: healthDrivers,
      growth: growthDrivers,
      quality: qualityDrivers,
      stability: stabilityDrivers,
      valuation: valuationDrivers,
      momentum: momentumDrivers,
      risk: riskDrivers,
      overallNarrative,
      dataFreshness: output.dataFreshness,
    };
  }

  private explainHealth(output: StockStoryOutput): ScoreExplanation {
    const d = output.engineDetails;
    const components: FactorContribution[] = [
      {
        name: 'Quality',
        score: d.quality.score,
        contribution: d.quality.score - 50,
        weight: 0.25,
        rationale: d.quality.commentary,
      },
      {
        name: 'Growth',
        score: d.growth.score,
        contribution: d.growth.score - 50,
        weight: 0.20,
        rationale: d.growth.commentary,
      },
      {
        name: 'Momentum',
        score: d.momentum.score,
        contribution: d.momentum.score - 50,
        weight: 0.20,
        rationale: d.momentum.commentary,
      },
      {
        name: 'Valuation',
        score: d.valuation.score,
        contribution: d.valuation.score - 50,
        weight: 0.15,
        rationale: d.valuation.commentary,
      },
      {
        name: 'Stability',
        score: d.stability.score,
        contribution: d.stability.score - 50,
        weight: 0.15,
        rationale: d.stability.commentary,
      },
      {
        name: 'Risk (inverted)',
        score: 100 - d.risk.score,
        contribution: (100 - d.risk.score) - 50,
        weight: 0.05,
        rationale: d.risk.commentary,
      },
    ];

    return this.buildExplanation('Health Score', output.healthScore, components);
  }

  private explainGrowth(output: StockStoryOutput): ScoreExplanation {
    const g = output.engineDetails.growth;
    const components: FactorContribution[] = [
      { name: 'Revenue Growth', score: Math.round(g.revenueGrowth * 100), contribution: Math.round(g.revenueGrowth * 100) - 50, weight: 0.35, rationale: `Revenue growth: ${(g.revenueGrowth * 100).toFixed(1)}%` },
      { name: 'EPS Growth', score: Math.round(g.epsGrowth * 100), contribution: Math.round(g.epsGrowth * 100) - 50, weight: 0.35, rationale: `EPS growth: ${(g.epsGrowth * 100).toFixed(1)}%` },
      { name: 'FCF Growth', score: Math.round(g.fcfGrowth * 100), contribution: Math.round(g.fcfGrowth * 100) - 50, weight: 0.15, rationale: `FCF growth: ${(g.fcfGrowth * 100).toFixed(1)}%` },
      { name: 'Profit Growth', score: Math.round(g.profitGrowth * 100), contribution: Math.round(g.profitGrowth * 100) - 50, weight: 0.15, rationale: `Profit growth: ${(g.profitGrowth * 100).toFixed(1)}%` },
    ];
    return this.buildExplanation('Growth Score', g.score, components);
  }

  private explainQuality(output: StockStoryOutput): ScoreExplanation {
    const q = output.engineDetails.quality;
    const roe = q.roe ?? 0;
    const roic = q.roic ?? 0;
    const operatingMargin = q.operatingMargin ?? 0;
    const grossMargin = q.grossMargin ?? 0;
    const components: FactorContribution[] = [
      { name: 'ROE', score: Math.round(roe * 100), contribution: Math.round(roe * 100) - 50, weight: 0.30, rationale: q.roe === null ? 'ROE unavailable' : `ROE: ${(roe * 100).toFixed(1)}%` },
      { name: 'ROIC', score: Math.round(roic * 100), contribution: Math.round(roic * 100) - 50, weight: 0.25, rationale: q.roic === null ? 'ROIC unavailable' : `ROIC: ${(roic * 100).toFixed(1)}%` },
      { name: 'Operating Margin', score: Math.round(operatingMargin * 100), contribution: Math.round(operatingMargin * 100) - 50, weight: 0.20, rationale: q.operatingMargin === null ? 'Operating margin unavailable' : `Op Margin: ${(operatingMargin * 100).toFixed(1)}%` },
      { name: 'Efficiency', score: q.efficiencyScore, contribution: q.efficiencyScore - 50, weight: 0.15, rationale: 'Combined ROE/Gross Margin efficiency' },
      { name: 'Gross Margin', score: Math.round(grossMargin * 100), contribution: Math.round(grossMargin * 100) - 50, weight: 0.10, rationale: q.grossMargin === null ? 'Gross margin unavailable' : `Gross Margin: ${(grossMargin * 100).toFixed(1)}%` },
    ];
    return this.buildExplanation('Quality Score', q.score, components);
  }

  private explainStability(output: StockStoryOutput): ScoreExplanation {
    const s = output.engineDetails.stability;
    const components: FactorContribution[] = [
      { name: 'Debt Level', score: s.debtScore, contribution: s.debtScore - 50, weight: 0.30, rationale: 'Lower debt = higher stability' },
      { name: 'Cash Position', score: s.cashScore, contribution: s.cashScore - 50, weight: 0.25, rationale: 'Stronger cash = higher stability' },
      { name: 'Volatility', score: s.volatilityScore, contribution: s.volatilityScore - 50, weight: 0.20, rationale: 'Lower volatility = higher stability' },
      { name: 'Coverage', score: s.coverageScore, contribution: s.coverageScore - 50, weight: 0.15, rationale: 'Interest/service coverage' },
      { name: 'Market Cap', score: s.marketCapSizeScore, contribution: s.marketCapSizeScore - 50, weight: 0.10, rationale: 'Larger cap = more stable' },
    ];
    return this.buildExplanation('Stability Score', s.score, components);
  }

  private explainValuation(output: StockStoryOutput): ScoreExplanation {
    const v = output.engineDetails.valuation;
    const components: FactorContribution[] = [
      { name: 'PE Ratio', score: v.peScore, contribution: v.peScore - 50, weight: 0.30, rationale: 'Lower PE = more attractive' },
      { name: 'PB Ratio', score: v.pbScore, contribution: v.pbScore - 50, weight: 0.25, rationale: 'Lower PB = more attractive' },
      { name: 'FCF Yield', score: v.fcfYieldScore, contribution: v.fcfYieldScore - 50, weight: 0.20, rationale: 'Higher FCF yield = more attractive' },
      { name: 'EV/EBITDA', score: v.evEbitdaScore, contribution: v.evEbitdaScore - 50, weight: 0.15, rationale: 'Lower EV/EBITDA = more attractive' },
      { name: 'Dividend Yield', score: v.dividendYieldScore, contribution: v.dividendYieldScore - 50, weight: 0.10, rationale: 'Higher yield = more attractive' },
    ];
    return this.buildExplanation('Valuation Score', v.score, components);
  }

  private explainMomentum(output: StockStoryOutput): ScoreExplanation {
    const m = output.engineDetails.momentum;
    const components: FactorContribution[] = [
      { name: 'Price Momentum', score: m.momentumScore, contribution: m.momentumScore - 50, weight: 0.50, rationale: 'Recent price strength' },
      { name: 'Trend Strength', score: m.trendScore, contribution: m.trendScore - 50, weight: 0.30, rationale: 'Trend direction and strength' },
      { name: 'Volatility (Inverted)', score: 100 - m.volatilityScore, contribution: (100 - m.volatilityScore) - 50, weight: 0.20, rationale: 'Stable trend = higher momentum quality' },
    ];
    return this.buildExplanation('Momentum Score', m.score, components);
  }

  private explainRisk(output: StockStoryOutput): ScoreExplanation {
    const r = output.engineDetails.risk;
    const components: FactorContribution[] = [
      { name: 'Volatility Risk', score: r.volatilityRiskScore, contribution: r.volatilityRiskScore - 50, weight: 0.30, rationale: 'Higher volatility = more risk' },
      { name: 'Debt Stress', score: r.debtStressScore, contribution: r.debtStressScore - 50, weight: 0.25, rationale: 'Higher debt load = more risk' },
      { name: 'Cash Flow Stress', score: r.cashFlowStressScore, contribution: r.cashFlowStressScore - 50, weight: 0.20, rationale: 'Cash flow pressure' },
      { name: 'Accounting Anomalies', score: r.accountingAnomalyScore, contribution: r.accountingAnomalyScore - 50, weight: 0.15, rationale: 'Anomaly detection score' },
      { name: 'Red Flags', score: Math.min(r.redFlagCount * 20, 100), contribution: Math.min(r.redFlagCount * 20, 100) - 50, weight: 0.10, rationale: `${r.redFlagCount} red flags detected` },
    ];
    return this.buildExplanation('Risk Score', r.score, components);
  }

  private buildExplanation(label: string, score: number, components: FactorContribution[]): ScoreExplanation {
    const sorted = [...components].sort((a, b) => b.contribution - a.contribution);
    const positive = sorted.filter(c => c.contribution > 0);
    const negative = sorted.filter(c => c.contribution < 0);

    let summary: string;
    if (score >= 80) summary = `${label} is exceptional. Strong performance across most drivers.`;
    else if (score >= 65) summary = `${label} is above average. Key strengths present with minor weaknesses.`;
    else if (score >= 50) summary = `${label} is moderate. Mixed signals — strengths balance weaknesses.`;
    else if (score >= 35) summary = `${label} is below average. Multiple weak drivers, limited strengths.`;
    else summary = `${label} is weak. Significant improvements needed across key drivers.`;

    return {
      component: label,
      overallScore: score,
      drivers: sorted,
      summary,
      whatImproved: positive.slice(0, 3).map(c => `${c.name}: ${c.rationale}`),
      whatDeteriorated: negative.slice(0, 3).map(c => `${c.name}: ${c.rationale}`),
      whatMattersMost: sorted[0].name,
    };
  }

  private buildOverallNarrative(explanations: ScoreExplanation[]): string {
    const strengths = explanations
      .filter(e => e.overallScore >= 65)
      .map(e => e.component.replace(' Score', '').toLowerCase());
    const weaknesses = explanations
      .filter(e => e.overallScore < 40)
      .map(e => e.component.replace(' Score', '').toLowerCase());

    const parts: string[] = [];
    if (strengths.length > 0) {
      parts.push(`Key strengths: ${strengths.join(', ')}.`);
    }
    if (weaknesses.length > 0) {
      parts.push(`Areas of concern: ${weaknesses.join(', ')}.`);
    }
    if (strengths.length === 0 && weaknesses.length === 0) {
      parts.push('Moderate profile with no extreme strengths or weaknesses.');
    }

    const topDriver = explanations
      .flatMap(e => e.drivers)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))[0];

    if (topDriver) {
      parts.push(`Most decisive factor: ${topDriver.name} (${topDriver.contribution > 0 ? '+' : ''}${topDriver.contribution} contribution).`);
    }

    return parts.join(' ');
  }
}

export const explainabilityEngine = new ExplainabilityEngine();
export default ExplainabilityEngine;
