export interface EarningsEvent {
  id: string;
  symbol: string;
  companyName: string;
  fiscalQuarter: string;
  fiscalYear: number;
  reportDate: string;
  estimatedEps: number;
  priorYearEps: number;
  estimatedRevenue: number;
  priorYearRevenue: number;
  status: 'confirmed' | 'estimated' | 'reported';
  actualEps?: number;
  actualRevenue?: number;
}

export interface EPSsurpriseResult {
  symbol: string;
  quarter: string;
  estimatedEps: number;
  actualEps: number;
  surpriseAmount: number;
  surprisePercent: number;
  isPositive: boolean;
  magnitude: 'small' | 'moderate' | 'large' | 'massive';
}

export interface EarningsSeasonSummary {
  year: number;
  quarter: string;
  totalEvents: number;
  reportedEvents: number;
  avgSurprisePercent: number;
  positiveSurpriseRate: number;
  topSurprises: EPSsurpriseResult[];
  sectorBreakdown: Record<string, {
    count: number;
    avgSurprise: number;
    positiveRate: number;
  }>;
}

export class EarningsCalendarService {
  private events: EarningsEvent[] = [];

  addEvent(event: Omit<EarningsEvent, 'id'>): EarningsEvent {
    const fullEvent: EarningsEvent = {
      ...event,
      id: `earn_${event.symbol}_${event.fiscalQuarter}_${event.fiscalYear}`,
    };
    const existing = this.events.findIndex(e => e.id === fullEvent.id);
    if (existing >= 0) {
      this.events[existing] = fullEvent;
    } else {
      this.events.push(fullEvent);
    }
    return fullEvent;
  }

  getUpcomingEvents(daysAhead: number = 30): EarningsEvent[] {
    const now = new Date();
    const future = new Date(now.getTime() + daysAhead * 86400000);
    return this.events
      .filter(e => {
        const d = new Date(e.reportDate);
        return d >= now && d <= future;
      })
      .sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  }

  getRecentEvents(daysPast: number = 7): EarningsEvent[] {
    const cutoff = new Date(Date.now() - daysPast * 86400000);
    return this.events
      .filter(e => new Date(e.reportDate) >= cutoff && e.status === 'reported')
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  getEventsBySymbol(symbol: string): EarningsEvent[] {
    return this.events
      .filter(e => e.symbol === symbol.toUpperCase())
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  computeEpsSurprise(symbol: string, quarter: string): EPSsurpriseResult | null {
    const event = this.events.find(
      e => e.symbol === symbol && e.fiscalQuarter === quarter && e.status === 'reported' && e.actualEps !== undefined,
    );
    if (!event || event.actualEps === undefined) return null;

    const surpriseAmount = event.actualEps - event.estimatedEps;
    const surprisePercent = event.estimatedEps !== 0
      ? (surpriseAmount / Math.abs(event.estimatedEps)) * 100
      : event.actualEps > 0 ? 100 : -100;

    const absPct = Math.abs(surprisePercent);
    const magnitude = absPct < 2 ? 'small' : absPct < 10 ? 'moderate' : absPct < 30 ? 'large' : 'massive';

    return {
      symbol,
      quarter,
      estimatedEps: event.estimatedEps,
      actualEps: event.actualEps,
      surpriseAmount,
      surprisePercent,
      isPositive: surpriseAmount > 0,
      magnitude,
    };
  }

  getSeasonSummary(year: number, quarter: string): EarningsSeasonSummary {
    const seasonEvents = this.events.filter(
      e => e.fiscalYear === year && e.fiscalQuarter === quarter,
    );
    const reported = seasonEvents.filter(e => e.actualEps !== undefined);

    const surprises: EPSsurpriseResult[] = [];
    for (const event of reported) {
      const surprise = this.computeEpsSurprise(event.symbol, event.fiscalQuarter);
      if (surprise) surprises.push(surprise);
    }

    const avgSurprise = surprises.length > 0
      ? surprises.reduce((s, r) => s + r.surprisePercent, 0) / surprises.length
      : 0;

    const positiveSurprises = surprises.filter(s => s.isPositive).length;

    const sectorBreakdown: Record<string, { count: number; avgSurprise: number; positiveRate: number }> = {};

    return {
      year,
      quarter,
      totalEvents: seasonEvents.length,
      reportedEvents: reported.length,
      avgSurprisePercent: avgSurprise,
      positiveSurpriseRate: surprises.length > 0 ? positiveSurprises / surprises.length : 0,
      topSurprises: surprises.sort((a, b) => Math.abs(b.surprisePercent) - Math.abs(a.surprisePercent)).slice(0, 10),
      sectorBreakdown,
    };
  }
}

export const earningsCalendarService = new EarningsCalendarService();
