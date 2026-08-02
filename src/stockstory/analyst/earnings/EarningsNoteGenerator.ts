/**
 * EarningsNoteGenerator — deterministic earnings results note.
 */

import type { EarningsMetricsSnapshot, EarningsNote } from './EarningsNoteTypes';
import { EarningsNoteValidator } from './EarningsNoteValidator';

export class EarningsNoteGenerator {
  private validator = new EarningsNoteValidator();

  generate(symbol: string, metrics: EarningsMetricsSnapshot): EarningsNote {
    const limitations: string[] = [];
    const sym = symbol.toUpperCase();

    if (!metrics.revenue && !metrics.profit) {
      limitations.push('Financial metrics not available for this period.');
    }

    const headline = this.buildHeadline(sym, metrics, limitations);
    const resultSnapshot = this.buildSnapshot(metrics, limitations);
    const marginChange = this.buildMarginChange(metrics, limitations);

    const note: EarningsNote = {
      symbol: sym,
      headline,
      resultSnapshot,
      revenueProfitMarginChange: marginChange,
      earningsQuality: this.assessEarningsQuality(metrics),
      whatImproved: this.whatImproved(metrics),
      whatWeakened: this.whatWeakened(metrics),
      thesisImpact: 'Latest results may affect thesis factors related to growth and earnings quality.',
      riskImpact: this.whatWeakened(metrics).length > 0
        ? 'Weakening metrics may warrant risk review.'
        : 'No immediate risk escalation from results alone.',
      valuationContext: 'Valuation context should be reviewed against updated earnings trajectory.',
      whatToWatchNext: [
        'Next quarter revenue and margin trajectory',
        'Management commentary on demand and costs',
        'Peer result comparisons where available',
      ],
      limitations,
      disclaimer: 'This results note is research-only and not investment advice.',
      generatedAt: new Date().toISOString(),
      confidence: limitations.length === 0 ? 'Moderate confidence' : 'Limited confidence',
    };

    const validation = this.validator.validate(note, metrics);
    if (!validation.passed) {
      note.limitations.push(...validation.errors);
      note.confidence = 'Limited confidence';
    }

    return note;
  }

  private buildHeadline(sym: string, m: EarningsMetricsSnapshot, limitations: string[]): string {
    if (!m.revenue && !m.profit) {
      limitations.push('Insufficient result data for detailed headline.');
      return `${sym}: Results note — limited information`;
    }
    const period = m.periodLabel ? ` (${m.periodLabel})` : '';
    if (m.consensusAvailable && m.beatMiss) {
      return `${sym}: Results update${period}`;
    }
    return `${sym}: Results review${period}`;
  }

  private buildSnapshot(m: EarningsMetricsSnapshot, limitations: string[]): string {
    const parts: string[] = [];
    if (m.revenue != null) parts.push(`Revenue reported for the period.`);
    else limitations.push('Revenue value not available.');
    if (m.profit != null) parts.push(`Profit reported for the period.`);
    else limitations.push('Profit value not available.');
    if (m.revenueGrowthYoy != null) parts.push(`Revenue change YoY: ${m.revenueGrowthYoy}%`);
    if (m.profitGrowthYoy != null) parts.push(`Profit change YoY: ${m.profitGrowthYoy}%`);
    return parts.length > 0 ? parts.join(' ') : 'Limited result snapshot available.';
  }

  private buildMarginChange(m: EarningsMetricsSnapshot, limitations: string[]): string {
    if (m.operatingMargin == null && m.netMargin == null) {
      limitations.push('Margin data not available for comparison.');
      return 'Margin change cannot be assessed with available data.';
    }
    const parts: string[] = [];
    if (m.operatingMargin != null) parts.push(`Operating margin: ${m.operatingMargin}%`);
    if (m.netMargin != null) parts.push(`Net margin: ${m.netMargin}%`);
    if (m.operatingMargin != null && m.operatingMargin < 10) {
      parts.push('Margin compression may warrant review.');
    }
    return parts.join('. ');
  }

  private assessEarningsQuality(m: EarningsMetricsSnapshot): string {
    if (!m.revenue && !m.profit) return 'Earnings quality cannot be assessed with limited data.';
    if (m.profitGrowthYoy != null && m.profitGrowthYoy < 0) {
      return 'Profit decline may indicate earnings quality pressure.';
    }
    return 'Earnings quality to be assessed against cash flow and margin trends.';
  }

  private whatImproved(m: EarningsMetricsSnapshot): string[] {
    const items: string[] = [];
    if (m.revenueGrowthYoy != null && m.revenueGrowthYoy > 0) items.push('Revenue growth YoY');
    if (m.profitGrowthYoy != null && m.profitGrowthYoy > 0) items.push('Profit growth YoY');
    if (m.operatingMargin != null && m.operatingMargin >= 15) items.push('Operating margin profile');
    return items.length > 0 ? items : ['No clear improvement signals with available data'];
  }

  private whatWeakened(m: EarningsMetricsSnapshot): string[] {
    const items: string[] = [];
    if (m.revenueGrowthYoy != null && m.revenueGrowthYoy < 0) items.push('Revenue decline YoY');
    if (m.profitGrowthYoy != null && m.profitGrowthYoy < 0) items.push('Profit decline YoY');
    if (m.operatingMargin != null && m.operatingMargin < 8) items.push('Margin compression');
    return items;
  }
}

export const earningsNoteGenerator = new EarningsNoteGenerator();
