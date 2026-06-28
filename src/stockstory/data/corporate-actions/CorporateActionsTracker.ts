/**
 * Corporate Actions Tracker
 *
 * Tracks corporate actions for Indian equities.
 * Maintains a master list of all actions, supports querying
 * by symbol, date range, action kind, and ex-date windows.
 */

import type {
  CorporateAction,
  CorporateActionKind,
  CorporateActionCalendar,
} from './CorporateActionTypes';

export class CorporateActionsTracker {
  private actions: Map<string, CorporateAction> = new Map();
  private bySymbol: Map<string, Set<string>> = new Map();
  private byDate: Map<string, Set<string>> = new Map();
  private byKind: Map<CorporateActionKind, Set<string>> = new Map();

  add(action: CorporateAction): void {
    this.actions.set(action.id, action);

    const symSet = this.bySymbol.get(action.symbol) ?? new Set();
    symSet.add(action.id);
    this.bySymbol.set(action.symbol, symSet);

    const dateKey = action.announcementDate.slice(0, 10);
    const dateSet = this.byDate.get(dateKey) ?? new Set();
    dateSet.add(action.id);
    this.byDate.set(dateKey, dateSet);

    const kindSet = this.byKind.get(action.kind) ?? new Set();
    kindSet.add(action.id);
    this.byKind.set(action.kind, kindSet);
  }

  addMany(actions: CorporateAction[]): void {
    for (const action of actions) this.add(action);
  }

  getById(id: string): CorporateAction | undefined {
    return this.actions.get(id);
  }

  getBySymbol(symbol: string): CorporateAction[] {
    const ids = this.bySymbol.get(symbol.toUpperCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.actions.get(id)!).filter(Boolean)
      .sort((a, b) => new Date(b.announcementDate).getTime() - new Date(a.announcementDate).getTime());
  }

  getByDateRange(from: string, to: string): CorporateAction[] {
    const results: CorporateAction[] = [];
    let current = new Date(from);
    const end = new Date(to);

    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      const ids = this.byDate.get(key);
      if (ids) {
        for (const id of ids) {
          const action = this.actions.get(id);
          if (action) results.push(action);
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return results.sort((a, b) =>
      new Date(b.announcementDate).getTime() - new Date(a.announcementDate).getTime()
    );
  }

  getByKind(kind: CorporateActionKind): CorporateAction[] {
    const ids = this.byKind.get(kind);
    if (!ids) return [];
    return Array.from(ids).map(id => this.actions.get(id)!).filter(Boolean)
      .sort((a, b) => new Date(b.announcementDate).getTime() - new Date(a.announcementDate).getTime());
  }

  getUpcomingExDates(daysAhead: number = 7): CorporateAction[] {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    const all = Array.from(this.actions.values());
    return all.filter(a => {
      if (!a.exDate) return false;
      const ex = new Date(a.exDate);
      return ex >= now && ex <= future;
    }).sort((a, b) => (a.exDate! < b.exDate! ? -1 : 1));
  }

  getDividends(symbol?: string): CorporateAction[] {
    if (symbol) {
      return this.getBySymbol(symbol).filter(a => a.kind === 'dividend');
    }
    return this.getByKind('dividend');
  }

  getCalendar(month?: number, year?: number): CorporateActionCalendar[] {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const calendar: CorporateActionCalendar[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const ids = this.byDate.get(dateStr);
      const actions = ids
        ? Array.from(ids).map(id => this.actions.get(id)!).filter(Boolean)
        : [];
      calendar.push({ date: dateStr, actions });
    }

    return calendar;
  }

  getStats(): {
    totalActions: number;
    byKind: Partial<Record<CorporateActionKind, number>>;
    bySymbol: number;
    upcomingExDates: number;
  } {
    const byKind: Partial<Record<CorporateActionKind, number>> = {};
    for (const [kind, ids] of this.byKind.entries()) {
      byKind[kind] = ids.size;
    }

    return {
      totalActions: this.actions.size,
      byKind,
      bySymbol: this.bySymbol.size,
      upcomingExDates: this.getUpcomingExDates(30).length,
    };
  }
}

export const corporateActionsTracker = new CorporateActionsTracker();
