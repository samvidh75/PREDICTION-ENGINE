/**
 * Disclosure Event Mapper
 *
 * Maps regulatory disclosures to structured events.
 * Cautious by design — does not infer intent or market impact.
 * Uses neutral, factual labels.
 *
 * Labels:
 *   'A disclosure was recorded'
 *   'Ownership context changed'
 *   'Needs review'
 *
 * Impact categories:
 *   positive|negative|neutral|needs_review
 */

import type { ExchangeFiling } from '../../data/filings/FilingTypes';

export type DisclosureImpact = 'positive' | 'negative' | 'neutral' | 'needs_review';

export interface DisclosureEvent {
  id: string;
  symbol: string;
  companyName: string;
  disclosureType: string;
  filingDate: string;
  subject: string;
  impact: DisclosureImpact;
  label: string;
  description: string;
  sourceIds: string[];
}

export class DisclosureEventMapper {
  private events: Map<string, DisclosureEvent> = new Map();
  private bySymbol: Map<string, Set<string>> = new Map();

  /**
   * Map an exchange filing to a disclosure event.
   * Labels are deliberately cautious — no inferred intent.
   */
  mapDisclosureToEvent(filing: ExchangeFiling): DisclosureEvent {
    const impact = this.categoriseImpact(filing);
    const label = this.buildLabel(filing, impact);
    const description = this.buildDescription(filing, label);

    const id = `dsev_${filing.symbol.toLowerCase()}_${filing.filingType}_${filing.filingDate.replace(/[^0-9]/g, '')}`
      .replace(/[^a-z0-9_]/g, '_');

    const event: DisclosureEvent = {
      id,
      symbol: filing.symbol.toUpperCase(),
      companyName: filing.companyName,
      disclosureType: filing.filingType,
      filingDate: filing.filingDate,
      subject: filing.subject,
      impact,
      label,
      description,
      sourceIds: [filing.sourceId],
    };

    this.events.set(id, event);

    const symSet = this.bySymbol.get(event.symbol) ?? new Set();
    symSet.add(id);
    this.bySymbol.set(event.symbol, symSet);

    return event;
  }

  /**
   * Get all disclosure events for a given symbol, sorted by date descending.
   */
  getEventsBySymbol(symbol: string): DisclosureEvent[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.events.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.filingDate.localeCompare(a.filingDate));
  }

  /**
   * Categorise impact conservatively.
   * Only infers negative impact for clearly adverse disclosures.
   * Most are marked 'needs_review' or 'neutral'.
   */
  private categoriseImpact(filing: ExchangeFiling): DisclosureImpact {
    const subject = (filing.subject ?? '').toLowerCase();
    const type = filing.filingType;

    // Clearly adverse
    if (type === 'insider_trading') return 'negative';
    if (type === 'pledge_disclosure') return 'needs_review';

    // Subject-based cautious classification
    if (subject.includes('resignation') || subject.includes('resign')) {
      const managementTerms = ['director', 'cfo', 'chairman', 'manager', 'secretary', 'auditor'];
      if (managementTerms.some(t => subject.includes(t))) return 'needs_review';
    }

    if (subject.includes('auditor')) {
      if (subject.includes('resign') || subject.includes('appoint')) return 'needs_review';
    }

    if (subject.includes('litigation') || subject.includes('petition') || subject.includes('investigation') || subject.includes('regulatory')) {
      return 'negative';
    }

    if (subject.includes('default') || subject.includes('restructuring')) return 'negative';

    // Positive signals
    if (type === 'credit_rating') {
      if (subject.includes('upgrade') || subject.includes('revised upwards') || subject.includes('affirmed')) return 'positive';
      if (subject.includes('downgrade') || subject.includes('revised downwards') || subject.includes('watch')) return 'negative';
      return 'neutral';
    }

    // Most routine disclosures are neutral
    if (type === 'board_meeting_notice') return 'neutral';
    if (type === 'agm_egm_notice') return 'neutral';
    if (type === 'annual_report') return 'neutral';
    if (type === 'press_release') return 'needs_review';

    // Quarterly results — contextual
    if (type === 'quarterly_result') return 'needs_review';

    // Shareholding pattern changes
    if (type === 'shareholding_pattern') {
      if (subject.includes('increase') || subject.includes('acquire')) return 'positive';
      if (subject.includes('decrease') || subject.includes('dispose') || subject.includes('pledge')) return 'negative';
      if (subject.includes('change')) return 'needs_review';
      return 'neutral';
    }

    return 'needs_review';
  }

  /**
   * Build a cautious label for the event.
   * Does not infer intent or market impact.
   */
  private buildLabel(filing: ExchangeFiling, impact: DisclosureImpact): string {
    const type = filing.filingType;
    const subject = (filing.subject ?? '').toLowerCase();

    switch (type) {
      case 'shareholding_pattern':
        if (impact === 'positive') return 'Ownership context changed';
        if (impact === 'negative') return 'Ownership context changed';
        return 'A disclosure was recorded';

      case 'insider_trading':
        return 'A disclosure was recorded';

      case 'credit_rating':
        return 'A disclosure was recorded';

      case 'board_meeting_notice':
        return 'A disclosure was recorded';

      case 'quarterly_result':
        return 'A disclosure was recorded';

      case 'annual_report':
        return 'A disclosure was recorded';

      case 'pledge_disclosure':
        return 'Ownership context changed';

      case 'press_release':
        return 'A disclosure was recorded';

      default:
        if (impact === 'needs_review') return 'Needs review';
        return 'A disclosure was recorded';
    }
  }

  /**
   * Build a factual description of the event.
   * No speculation about consequences.
   */
  private buildDescription(filing: ExchangeFiling, label: string): string {
    const symbol = filing.symbol.toUpperCase();
    const typeLabel = filing.filingType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const summary = filing.summary
      ? ` Summary: ${filing.summary.slice(0, 200)}${filing.summary.length > 200 ? '...' : ''}`
      : '';

    return `${symbol} filed a ${typeLabel}: "${filing.subject}".${summary}`;
  }

  /** Get statistics about mapped disclosure events */
  getStats(): { totalEvents: number; symbolsCovered: number; byImpact: Record<DisclosureImpact, number> } {
    const byImpact: Record<DisclosureImpact, number> = { positive: 0, negative: 0, neutral: 0, needs_review: 0 };
    for (const ev of this.events.values()) {
      byImpact[ev.impact] = (byImpact[ev.impact] ?? 0) + 1;
    }
    return {
      totalEvents: this.events.size,
      symbolsCovered: this.bySymbol.size,
      byImpact,
    };
  }
}

export const disclosureEventMapper = new DisclosureEventMapper();