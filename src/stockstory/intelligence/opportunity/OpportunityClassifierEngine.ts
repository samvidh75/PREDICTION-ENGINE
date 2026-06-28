/**
 * Opportunity Classifier Engine
 *
 * Classifies the opportunity profile of a stock based on data-driven patterns:
 * catalyst-driven, value, growth, turnaround, dividend, special situation.
 *
 * Does NOT recommend — classifies and explains what pattern the data shows.
 */

import type { IntelligenceInput } from '../../types';

export interface OpportunityReport {
  symbol: string;
  generatedAt: string;

  /** Primary opportunity classification */
  primaryType: OpportunityType;
  secondaryType: OpportunityType | null;

  /** Classification confidence */
  confidence: number;              // 0-1

  /** Characteristic scores */
  characteristics: OpportunityCharacteristics;

  /** The data that supports this classification */
  evidence: string[];

  /** What to watch */
  watchPoints: string[];

  summary: string;
}

export type OpportunityType =
  'catalyst_driven' | 'value' | 'growth' | 'turnaround' |
  'dividend_income' | 'special_situation' | 'quality_compound' | 'unclassified';

export interface OpportunityCharacteristics {
  valueScore: number;             // 0-100 — value orientation
  growthScore: number;            // 0-100 — growth orientation
  qualityScore: number;           // 0-100 — quality orientation
  catalystScore: number;          // 0-100 — catalyst presence
  turnaroundScore: number;        // 0-100 — turnaround potential
  incomeScore: number;            // 0-100 — income/dividend orientation
}

export class OpportunityClassifierEngine {
  analyze(input: IntelligenceInput): OpportunityReport {
    const chars = this.computeCharacteristics(input);
    const { primaryType, secondaryType, confidence } = this.classify(chars);
    const evidence = this.collectEvidence(input, primaryType);
    const watchPoints = this.buildWatchPoints(input, primaryType);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      primaryType,
      secondaryType,
      confidence,
      characteristics: chars,
      evidence,
      watchPoints,
      summary: this.buildSummary(primaryType, chars, evidence),
    };
  }

  private computeCharacteristics(input: IntelligenceInput): OpportunityCharacteristics {
    const f = input.financials;
    const e = input.earnings;
    const t = input.technicals;
    const s = input.sector;

    // Growth
    let growthScore = 30;
    if (f.revenueGrowth !== null && f.profitGrowth !== null) {
      const avgGrowth = (f.revenueGrowth + f.profitGrowth) / 2;
      if (avgGrowth > 20) growthScore = 85;
      else if (avgGrowth > 10) growthScore = 65;
      else if (avgGrowth > 5) growthScore = 45;
      else if (avgGrowth < 0) growthScore = 15;
    }

    // Value
    let valueScore = 30;
    if (f.peRatio !== null) {
      if (f.peRatio < 10) valueScore += 30;
      else if (f.peRatio < 15) valueScore += 20;
      else if (f.peRatio < 20) valueScore += 10;
      else valueScore -= 10;
    }
    if (f.pbRatio !== null && f.pbRatio < 1.5) valueScore += 15;
    if (f.dividendYield !== null && f.dividendYield > 3) valueScore += 10;
    valueScore = Math.max(0, Math.min(100, valueScore));

    // Quality
    let qualityScore = 30;
    if (f.roe !== null && f.roe > 20) qualityScore += 25;
    else if (f.roe !== null && f.roe > 15) qualityScore += 15;
    if (f.roic !== null && f.roic > 15) qualityScore += 20;
    if (f.operatingMargin !== null && f.operatingMargin > 15) qualityScore += 15;
    if (f.debtToEquity !== null && f.debtToEquity < 0.5) qualityScore += 10;
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    // Catalyst
    let catalystScore = 25;
    if (e.beatMiss === 'beat') catalystScore += 20;
    if (e.surprisePercent !== null && Math.abs(e.surprisePercent) > 10) catalystScore += 15;
    if (e.nextEarningsDate) catalystScore += 10;
    if (s.sectorMomentum === 'accelerating') catalystScore += 15;
    catalystScore = Math.min(100, catalystScore);

    // Turnaround
    let turnaroundScore = 20;
    if (f.profitGrowth !== null && f.profitGrowth < -10) turnaroundScore += 25;
    if (f.revenueGrowth !== null && f.revenueGrowth < 0 && f.profitGrowth !== null && f.profitGrowth > 0) {
      turnaroundScore += 30; // Revenue declining but profit growing = cost rationalisation
    }
    if (e.beatMiss === 'beat' && (f.profitGrowth !== null && f.profitGrowth < 0)) {
      turnaroundScore += 15; // Beating despite negative trend = positive surprise
    }
    turnaroundScore = Math.min(100, turnaroundScore);

    // Income
    let incomeScore = 20;
    if (f.dividendYield !== null && f.dividendYield > 4) incomeScore += 30;
    else if (f.dividendYield !== null && f.dividendYield > 2) incomeScore += 15;
    if (f.fcfYield !== null && f.fcfYield > 5) incomeScore += 15;

    return { valueScore, growthScore, qualityScore, catalystScore, turnaroundScore, incomeScore };
  }

  private classify(chars: OpportunityCharacteristics): {
    primaryType: OpportunityType;
    secondaryType: OpportunityType | null;
    confidence: number;
  } {
    const scored: Array<{ type: OpportunityType; score: number }> = [
      { type: 'catalyst_driven', score: chars.catalystScore },
      { type: 'value', score: chars.valueScore },
      { type: 'growth', score: chars.growthScore },
      { type: 'quality_compound', score: chars.qualityScore },
      { type: 'turnaround', score: chars.turnaroundScore },
      { type: 'dividend_income', score: chars.incomeScore },
    ];

    scored.sort((a, b) => b.score - a.score);
    const [primary, secondary] = scored;

    // Confidence = how much primary leads secondary by
    const gap = primary.score - (secondary?.score ?? 0);
    const confidence = gap > 20 ? 0.75 : gap > 10 ? 0.55 : 0.35;

    // If all scores are unremarkable
    if (primary.score < 35) {
      return { primaryType: 'unclassified', secondaryType: null, confidence: 0.3 };
    }

    return {
      primaryType: primary.type,
      secondaryType: secondary && secondary.score > 30 ? secondary.type : null,
      confidence,
    };
  }

  private collectEvidence(input: IntelligenceInput, type: OpportunityType): string[] {
    const f = input.financials;
    const e = input.earnings;
    const evidence: string[] = [];

    switch (type) {
      case 'growth':
        if (f.revenueGrowth !== null) evidence.push(`Revenue growth: ${f.revenueGrowth}%`);
        if (f.profitGrowth !== null) evidence.push(`Profit growth: ${f.profitGrowth}%`);
        break;
      case 'value':
        if (f.peRatio !== null) evidence.push(`PE: ${f.peRatio}x`);
        if (f.pbRatio !== null) evidence.push(`PB: ${f.pbRatio}x`);
        if (f.dividendYield !== null) evidence.push(`Dividend yield: ${f.dividendYield}%`);
        break;
      case 'quality_compound':
        if (f.roe !== null) evidence.push(`ROE: ${f.roe}%`);
        if (f.roic !== null) evidence.push(`ROIC: ${f.roic}%`);
        break;
      case 'catalyst_driven':
        if (e.beatMiss) evidence.push(`Recent earnings: ${e.beatMiss}`);
        if (e.nextEarningsDate) evidence.push(`Next earnings: ${e.nextEarningsDate}`);
        break;
      case 'turnaround':
        if (f.profitGrowth !== null) evidence.push(`Profit growth: ${f.profitGrowth}%`);
        if (f.revenueGrowth !== null) evidence.push(`Revenue growth: ${f.revenueGrowth}%`);
        break;
      case 'dividend_income':
        if (f.dividendYield !== null) evidence.push(`Dividend yield: ${f.dividendYield}%`);
        break;
    }

    return evidence.length > 0 ? evidence : ['Classification based on available financial characteristics.'];
  }

  private buildWatchPoints(input: IntelligenceInput, type: OpportunityType): string[] {
    const points: string[] = [];

    switch (type) {
      case 'growth':
        points.push('Revenue and profit growth trajectory');
        if (input.earnings.nextEarningsDate) points.push('Next earnings release');
        break;
      case 'value':
        points.push('PE and PB expansion or contraction');
        points.push('Dividend sustainability');
        break;
      case 'quality_compound':
        points.push('ROE and ROIC trends');
        points.push('Margin stability');
        break;
      case 'catalyst_driven':
        points.push('Upcoming earnings and corporate events');
        points.push('Sector momentum shifts');
        break;
      case 'turnaround':
        points.push('Evidence of earnings stabilization');
        points.push('Revenue growth resumption');
        break;
      case 'dividend_income':
        points.push('Dividend consistency and payout ratio');
        points.push('Free cash flow adequacy');
        break;
      default:
        points.push('Monitor for clearer opportunity signals as data improves');
    }

    return points;
  }

  private buildSummary(type: OpportunityType, chars: OpportunityCharacteristics, evidence: string[]): string {
    const typeDescriptions: Record<OpportunityType, string> = {
      catalyst_driven: 'Catalyst-driven — earnings events and sector momentum may drive near-term attention.',
      value: 'Value-oriented — below-sector valuation with potential margin of safety.',
      growth: 'Growth-oriented — above-sector revenue and profit expansion.',
      turnaround: 'Turnaround pattern — recovery signals emerging from a period of decline.',
      dividend_income: 'Dividend/income-oriented — notable yield with cash flow considerations.',
      special_situation: 'Special situation — corporate action or event-driven thesis.',
      quality_compound: 'Quality compounder — high returns on capital with competitive position.',
      unclassified: 'No dominant opportunity pattern — further research needed.',
    };

    return `${typeDescriptions[type]} Evidence: ${evidence.slice(0, 3).join('; ')}.`;
  }
}

export const opportunityClassifierEngine = new OpportunityClassifierEngine();
