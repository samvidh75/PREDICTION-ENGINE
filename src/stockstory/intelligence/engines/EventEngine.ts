/**
 * Event Intelligence Engine
 *
 * Evaluates corporate actions, upcoming catalysts, and event-driven
 * risk. Produces an impact-adjusted score and structured catalyst list.
 */

import type { IntelligenceInput, EventEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand } from '../scoring';

export class EventEngine {
  analyze(input: IntelligenceInput): EventEngineOutput {
    const e = input.earnings;
    const r = input.risks;

    const corporateActions = this.collectCorporateActions(input);
    const upcomingCatalysts = this.collectCatalysts(input);

    const eventRisk = this.scoreEventRisk(e, r, upcomingCatalysts);
    const actionImpact = this.totalActionImpact(corporateActions);
    const catalystPotential = this.catalystPotential(upcomingCatalysts);

    const total = Math.max(0, 50 + actionImpact + catalystPotential - eventRisk);
    const normalised = clampScore(total);

    const requiredFields = [e.nextEarningsDate];
    const dc = confidenceWeight(requiredFields, 1);
    const confidence = Math.min(0.99, 0.3 + dc * 0.7);

    const reasoning = this.buildReasoning(normalised, eventRisk, upcomingCatalysts);

    return {
      score: normalised,
      corporateActions,
      upcomingCatalysts,
      eventRisk: clampScore(eventRisk),
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  // ── Corporate actions ───────────────────────────────────────────

  private collectCorporateActions(input: IntelligenceInput): EventEngineOutput['corporateActions'] {
    const actions: EventEngineOutput['corporateActions'] = [];
    const fin = input.financials;

    // Buyback indicator from FCF vs capex
    if (fin.freeCashFlow !== null && fin.capex !== null && fin.freeCashFlow > fin.capex * 1.5) {
      actions.push({
        type: 'strong_cash_generation',
        impact: 3,
        date: '',
        description: 'Strong cash generation relative to capex suggests potential for buybacks or dividends',
      });
    }

    // Debt reduction signal
    if (fin.debtToEquity !== null && fin.debtToEquity < 20) {
      actions.push({
        type: 'low_leverage',
        impact: 2,
        date: '',
        description: 'Conservative capital structure reduces refinancing risk',
      });
    }

    return actions;
  }

  // ── Catalysts ───────────────────────────────────────────────────

  private collectCatalysts(input: IntelligenceInput): EventEngineOutput['upcomingCatalysts'] {
    const catalysts: EventEngineOutput['upcomingCatalysts'] = [];
    const e = input.earnings;

    // Upcoming earnings
    if (e.nextEarningsDate) {
      const days = this.daysUntil(e.nextEarningsDate);
      let expectedImpact: 'high' | 'medium' | 'low' = 'medium';
      if (days !== null && days <= 14) expectedImpact = 'high';
      else if (days !== null && days <= 45) expectedImpact = 'medium';
      else expectedImpact = 'low';

      catalysts.push({
        type: 'earnings',
        expectedImpact,
        expectedDate: e.nextEarningsDate,
        description: days !== null
          ? `Next earnings ${days} days away`
          : 'Next earnings date scheduled',
      });
    }

    return catalysts;
  }

  // ── Event risk (0–100) ─────────────────────────────────────────

  private scoreEventRisk(
    e: IntelligenceInput['earnings'],
    r: IntelligenceInput['risks'],
    catalysts: EventEngineOutput['upcomingCatalysts']
  ): number {
    let risk = 20; // baseline

    if (r.auditorChange) risk += 15;
    if (r.relatedPartyTransactions) risk += 10;
    if (r.litigationRisk !== null && r.litigationRisk > 0.5) risk += 15;
    if (r.outstandingWarrants) risk += 5;

    // Near-term catalyst = higher event risk
    const nearCatalysts = catalysts.filter(c => c.expectedImpact === 'high').length;
    risk += nearCatalysts * 10;

    return risk;
  }

  private totalActionImpact(actions: EventEngineOutput['corporateActions']): number {
    return actions.reduce((sum, a) => sum + a.impact, 0);
  }

  private catalystPotential(catalysts: EventEngineOutput['upcomingCatalysts']): number {
    let potential = 0;
    for (const c of catalysts) {
      if (c.expectedImpact === 'high') potential += 15;
      else if (c.expectedImpact === 'medium') potential += 8;
      else potential += 3;
    }
    return potential;
  }

  private daysUntil(dateStr: string): number | null {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  private buildReasoning(
    score: number,
    eventRisk: number,
    catalysts: EventEngineOutput['upcomingCatalysts']
  ): string {
    const band = toScoreBand(score);
    const parts: string[] = [];

    if (catalysts.length > 0) {
      const near = catalysts.filter(c => c.expectedImpact === 'high');
      if (near.length > 0) parts.push(`${near.length} high-impact catalyst(s) approaching`);
      parts.push(`${catalysts.length} upcoming catalyst(s) identified`);
    }

    if (eventRisk >= 50) parts.push('elevated event risk from governance or litigation factors');
    else parts.push('event risk is contained');

    return `Event ${band}: ${parts.join('; ')}.`;
  }
}

export const eventEngine = new EventEngine();
