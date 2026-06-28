/**
 * Corporate Action Event Mapper
 *
 * Maps normalized corporate actions to structured events with
 * impact categorisation. Uses available evidence — does not
 * invent impact claims where data is insufficient.
 *
 * Impact categories:
 *   positive  — action that typically benefits shareholders
 *   negative  — action that typically dilutes or reduces value
 *   neutral   — administrative or no material impact
 *   needs_review — insufficient data to categorise confidently
 */

import type {
  CorporateAction as CAAction,
  CorporateActionKind,
} from '../../data/corporateActions/CorporateActionTypes';

export type EventImpact = 'positive' | 'negative' | 'neutral' | 'needs_review';

export interface CorporateActionEvent {
  id: string;
  symbol: string;
  companyName: string;
  actionKind: CorporateActionKind;
  actionSubKind?: string;
  announcementDate: string;
  exDate: string | null;
  impact: EventImpact;
  description: string;
  sourceIds: string[];
}

export class CorporateActionEventMapper {
  private events: Map<string, CorporateActionEvent> = new Map();
  private bySymbol: Map<string, Set<string>> = new Map();

  /**
   * Map a corporate action to an event with impact assessment.
   * Impact is derived from the nature of the action, not from
   * speculation about market reaction.
   */
  mapActionToEvent(action: CAAction): CorporateActionEvent {
    const impact = this.categoriseImpact(action);
    const description = this.buildDescription(action, impact);

    const id = `caev_${action.symbol.toLowerCase()}_${action.kind}_${action.announcementDate.replace(/[^0-9]/g, '')}`
      .replace(/[^a-z0-9_]/g, '_');

    const event: CorporateActionEvent = {
      id,
      symbol: action.symbol.toUpperCase(),
      companyName: action.companyName,
      actionKind: action.kind,
      actionSubKind: action.subKind,
      announcementDate: action.announcementDate,
      exDate: action.exDate,
      impact,
      description,
      sourceIds: action.sourceIds,
    };

    this.events.set(id, event);

    const symSet = this.bySymbol.get(event.symbol) ?? new Set();
    symSet.add(id);
    this.bySymbol.set(event.symbol, symSet);

    return event;
  }

  /**
   * Get all events for a given symbol, sorted by announcement date descending.
   */
  getEventsBySymbol(symbol: string): CorporateActionEvent[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.events.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.announcementDate.localeCompare(a.announcementDate));
  }

  /**
   * Categorise the likely impact of a corporate action.
   * Uses only the action type — does not infer market reaction.
   */
  private categoriseImpact(action: CAAction): EventImpact {
    switch (action.kind) {
      // Typically positive
      case 'dividend':
        return 'positive';
      case 'bonus':
        return 'positive';
      case 'buyback':
        return 'positive';

      // Typically negative
      case 'delisting':
        return 'negative';
      case 'suspension':
        return 'negative';

      // Neutral / depends
      case 'split':
        return 'neutral';
      case 'rights':
        return 'needs_review';
      case 'merger':
        return 'needs_review';
      case 'demerger':
        return 'needs_review';
      case 'name_change':
        return 'neutral';
      case 'symbol_change':
        return 'neutral';
      case 'face_value_change':
        return 'neutral';
      case 'board_meeting':
        return 'neutral';
      case 'agm_egm':
        return 'neutral';

      default:
        return 'needs_review';
    }
  }

  /**
   * Build a conservative description of the event.
   * Does not use bullish/bearish language or financial advice.
   */
  private buildDescription(action: CAAction, impact: EventImpact): string {
    const kind = action.kind.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const symbol = action.symbol.toUpperCase();

    switch (action.kind) {
      case 'dividend': {
        const amount = action.details?.amount
          ? ` of ₹${action.details.amount} per share`
          : action.details?.percentage
            ? ` of ${action.details.percentage}%`
            : '';
        return `${symbol} announced a dividend${amount}.`;
      }
      case 'bonus': {
        const ratio = action.details?.ratio ? ` in ratio ${action.details.ratio}` : '';
        return `${symbol} announced a bonus issue${ratio}.`;
      }
      case 'split': {
        const ratio = action.details?.ratio ? ` in ratio ${action.details.ratio}` : '';
        return `${symbol} announced a stock split${ratio}.`;
      }
      case 'rights':
        return `${symbol} announced a rights issue${action.details?.ratio ? ` in ratio ${action.details.ratio}` : ''}.`;
      case 'buyback':
        return `${symbol} announced a buyback${action.details?.price ? ` at ₹${action.details.price} per share` : ''}.`;
      case 'merger':
        return `${symbol} announced a merger${action.details?.ratio ? ` (swap ratio: ${action.details.ratio})` : ''}.`;
      case 'demerger':
        return `${symbol} announced a demerger.`;
      case 'delisting':
        return `${symbol} announced a delisting.`;
      case 'suspension':
        return `${symbol} trading has been suspended.`;
      case 'name_change':
        return `${symbol} announced a name change.`;
      case 'symbol_change':
        return `${symbol} announced a symbol change.`;
      case 'face_value_change':
        return `${symbol} announced a face value change${action.details?.ratio ? ` (${action.details.ratio})` : ''}.`;
      default:
        return `${symbol} announced a corporate action (${kind}).`;
    }
  }

  /** Get statistics about mapped events */
  getStats(): { totalEvents: number; symbolsCovered: number; byImpact: Record<EventImpact, number> } {
    const byImpact: Record<EventImpact, number> = { positive: 0, negative: 0, neutral: 0, needs_review: 0 };
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

export const corporateActionEventMapper = new CorporateActionEventMapper();