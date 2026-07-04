/**
 * Catalyst Engine
 *
 * Identifies and assesses catalysts — events that could significantly
 * change a company's thesis. Includes earnings catalysts, sector events,
 * regulatory changes, and corporate actions.
 *
 * All catalyst assessments are data-bound — no speculative events.
 */

import type { IntelligenceInput } from '../../types';

export interface CatalystReport {
  symbol: string;
  generatedAt: string;

  /** Active and upcoming catalysts */
  catalysts: Catalyst[];

  /** Catalyst-driven thesis impact */
  thesisImpact: CatalystImpact;

  /** Time to watch */
  watchWindows: WatchWindow[];

  /** Summary */
  summary: string;
}

export interface Catalyst {
  id: string;
  type: 'earnings' | 'corporate_action' | 'regulatory' | 'sector_event' | 'macro' | 'company_specific';
  name: string;
  expectedDate: string | null;
  expectedImpact: 'positive' | 'negative' | 'neutral' | 'unknown';
  magnitude: 'high' | 'moderate' | 'low' | 'unknown';
  probability: number;          // 0-1
  description: string;
  evidenceSource: string;      // What data supports this catalyst
}

export interface CatalystImpact {
  /** Net catalyst score (-100 to 100) */
  netScore: number;
  /** Positive catalysts count */
  positiveCount: number;
  /** Negative catalysts count */
  negativeCount: number;
  /** Most significant catalyst */
  mostSignificant: Catalyst | null;
  assessment: string;
}

export interface WatchWindow {
  startDate: string;
  endDate: string;
  reason: string;
  catalystIds: string[];
}

export class CatalystEngine {
  analyze(input: IntelligenceInput): CatalystReport {
    const catalysts = this.detectCatalysts(input);
    const thesisImpact = this.assessImpact(catalysts);
    const watchWindows = this.buildWatchWindows(catalysts);
    const summary = this.buildSummary(catalysts, thesisImpact);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      catalysts,
      thesisImpact,
      watchWindows,
      summary,
    };
  }

  private detectCatalysts(input: IntelligenceInput): Catalyst[] {
    const catalysts: Catalyst[] = [];
    const e = input.earnings;
    const s = input.sector;
    const f = input.financials;

    // Earnings catalyst
    if (e.nextEarningsDate) {
      const daysToEarnings = this.daysUntil(e.nextEarningsDate);
      catalysts.push({
        id: 'earnings_next',
        type: 'earnings',
        name: 'Next Earnings Release',
        expectedDate: e.nextEarningsDate,
        expectedImpact: 'unknown',
        magnitude: 'high',
        probability: 0.95,
        description: `Earnings expected in ${daysToEarnings} days. Historical beat rate: ${e.beatMiss === 'beat' ? 'positive' : e.beatMiss === 'miss' ? 'negative' : 'unknown'}.`,
        evidenceSource: 'nextEarningsDate',
      });
    }

    // Recent earnings as catalyst
    if (e.recentEarningsDate && e.surprisePercent !== null) {
      const impact = e.surprisePercent > 5 ? 'positive'
        : e.surprisePercent < -5 ? 'negative'
        : 'neutral';

      catalysts.push({
        id: 'earnings_recent',
        type: 'earnings',
        name: 'Recent Earnings Outcome',
        expectedDate: e.recentEarningsDate,
        expectedImpact: impact,
        magnitude: e.beatMiss === 'beat' || e.beatMiss === 'miss' ? 'high' : 'moderate',
        probability: 1.0,
        description: `Last earnings: ${e.beatMiss} by ${Math.abs(e.surprisePercent)}%.`,
        evidenceSource: 'recentEarningsDate',
      });
    }

    // Growth inflection as catalyst
    if (f.revenueGrowth !== null && f.profitGrowth !== null) {
      if (f.revenueGrowth > 15 && f.profitGrowth > 15) {
        catalysts.push({
          id: 'growth_inflection',
          type: 'company_specific',
          name: 'Growth Acceleration',
          expectedDate: null,
          expectedImpact: 'positive',
          magnitude: 'moderate',
          probability: 0.6,
          description: `Revenue +${f.revenueGrowth}%, profit +${f.profitGrowth}% — growth momentum may attract attention.`,
          evidenceSource: 'revenueGrowth',
        });
      } else if (f.revenueGrowth < -5 || f.profitGrowth < -5) {
        catalysts.push({
          id: 'growth_decline',
          type: 'company_specific',
          name: 'Growth Deceleration',
          expectedDate: null,
          expectedImpact: 'negative',
          magnitude: 'moderate',
          probability: 0.6,
          description: 'Declining growth may signal structural headwinds.',
          evidenceSource: 'revenueGrowth',
        });
      }
    }

    // Sector momentum catalyst
    if (s.sectorMomentum === 'accelerating') {
      catalysts.push({
        id: 'sector_tailwind',
        type: 'sector_event',
        name: 'Sector Momentum Tailwind',
        expectedDate: null,
        expectedImpact: 'positive',
        magnitude: 'moderate',
        probability: 0.5,
        description: `${s.name || 'Sector'} momentum is accelerating — may benefit sector constituents.`,
        evidenceSource: 'sectorMomentum',
      });
    }

    // High promoter pledge as negative catalyst
    const r = input.risks;
    if (r?.pledgedShares !== null && r.pledgedShares > 30) {
      catalysts.push({
        id: 'promoter_pledge_risk',
        type: 'corporate_action',
        name: 'Promoter Pledge Risk',
        expectedDate: null,
        expectedImpact: 'negative',
        magnitude: 'high',
        probability: 0.7,
        description: `${r.pledgedShares}% promoter pledge — margin call risk and governance concern.`,
        evidenceSource: 'pledgedShares',
      });
    }

    return catalysts;
  }

  private assessImpact(catalysts: Catalyst[]): CatalystImpact {
    const positive = catalysts.filter(c => c.expectedImpact === 'positive');
    const negative = catalysts.filter(c => c.expectedImpact === 'negative');

    let netScore = 0;
    for (const c of catalysts) {
      const magMult = c.magnitude === 'high' ? 2 : c.magnitude === 'moderate' ? 1 : 0.5;
      const impactScore = c.expectedImpact === 'positive' ? magMult * c.probability * 25
        : c.expectedImpact === 'negative' ? -magMult * c.probability * 25
        : 0;
      netScore += impactScore;
    }
    netScore = Math.max(-100, Math.min(100, Math.round(netScore)));

    const mostSignificant = [...catalysts]
      .filter(c => c.expectedImpact !== 'unknown')
      .sort((a, b) => (b.magnitude === 'high' ? 3 : 1) * b.probability - (a.magnitude === 'high' ? 3 : 1) * a.probability)[0] ?? null;

    let assessment: string;
    if (netScore > 20) assessment = 'Catalyst outlook is constructive. Multiple positive events on the horizon.';
    else if (netScore > 0) assessment = 'Catalyst outlook is mildly constructive.';
    else if (netScore === 0) assessment = 'No clear catalyst bias detected.';
    else if (netScore > -20) assessment = 'Catalyst outlook is mildly cautious.';
    else assessment = 'Catalyst outlook requires attention — several negative events identified.';

    return {
      netScore,
      positiveCount: positive.length,
      negativeCount: negative.length,
      mostSignificant,
      assessment,
    };
  }

  private buildWatchWindows(catalysts: Catalyst[]): WatchWindow[] {
    return catalysts
      .filter(c => c.expectedDate !== null)
      .map(c => {
        const date = new Date(c.expectedDate!);
        const start = new Date(date);
        start.setDate(start.getDate() - 5);
        const end = new Date(date);
        end.setDate(end.getDate() + 3);

        return {
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          reason: `${c.name} expected`,
          catalystIds: [c.id],
        };
      });
  }

  private buildSummary(catalysts: Catalyst[], impact: CatalystImpact): string {
    const count = catalysts.length;
    if (count === 0) return 'No significant catalysts identified from available data.';
    return `${count} catalyst(s) identified — net outlook: ${impact.assessment}`;
  }

  private daysUntil(dateStr: string): number {
    const now = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
}

export const catalystEngine = new CatalystEngine();
