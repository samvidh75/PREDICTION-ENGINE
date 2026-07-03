import { analytics } from './anonymousAnalytics';

export interface PageVisit {
  path: string;
  enteredAt: number;
  exitedAt: number | null;
  dwellMs: number;
}

export interface ComparisonPair {
  symbolA: string;
  symbolB: string;
  timestamp: number;
}

const PAGE_HISTORY_KEY = 'stockstory_page_history';
const COMPARISON_KEY = 'stockstory_comparisons';
const INVEST_CLICK_KEY = 'stockstory_invest_clicks';

class AdvancedAnalyticsEngine {
  private currentPage: PageVisit | null = null;
  private pageStartTime = Date.now();

  startPageVisit(path: string) {
    if (this.currentPage) {
      this.endPageVisit();
    }
    this.pageStartTime = Date.now();
    this.currentPage = { path, enteredAt: this.pageStartTime, exitedAt: null, dwellMs: 0 };
    analytics.track('page_view', { path });
  }

  endPageVisit() {
    if (!this.currentPage) return;
    const now = Date.now();
    this.currentPage.exitedAt = now;
    this.currentPage.dwellMs = now - this.pageStartTime;
    this.savePageVisit(this.currentPage);
    analytics.track('page_exit', {
      path: this.currentPage.path,
      dwellMs: this.currentPage.dwellMs,
    });
    this.currentPage = null;
  }

  trackComparison(symbolA: string, symbolB: string) {
    const pair: ComparisonPair = { symbolA: symbolA.toUpperCase(), symbolB: symbolB.toUpperCase(), timestamp: Date.now() };
    const history = this.getComparisons();
    history.push(pair);
    localStorage.setItem(COMPARISON_KEY, JSON.stringify(history));
    analytics.track('compare', { symbolA: pair.symbolA, symbolB: pair.symbolB });
  }

  trackInvestClick(symbol: string) {
    const clicks = this.getInvestClicks();
    clicks.push({ symbol: symbol.toUpperCase(), timestamp: Date.now() });
    localStorage.setItem(INVEST_CLICK_KEY, JSON.stringify(clicks));
    analytics.track('invest_click', { symbol: symbol.toUpperCase() });
  }

  getPageHistory(): PageVisit[] {
    const raw = localStorage.getItem(PAGE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  getComparisons(): ComparisonPair[] {
    const raw = localStorage.getItem(COMPARISON_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  getInvestClicks(): Array<{ symbol: string; timestamp: number }> {
    const raw = localStorage.getItem(INVEST_CLICK_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  getTopComparedPairs(limit = 10): Array<{ pair: string; count: number }> {
    const pairs = this.getComparisons();
    const counts = new Map<string, number>();
    for (const p of pairs) {
      const key = [p.symbolA, p.symbolB].sort().join('-');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getTotalDwellTime(): number {
    const pages = this.getPageHistory();
    return pages.reduce((sum, p) => sum + p.dwellMs, 0);
  }

  reset() {
    localStorage.removeItem(PAGE_HISTORY_KEY);
    localStorage.removeItem(COMPARISON_KEY);
    localStorage.removeItem(INVEST_CLICK_KEY);
  }

  private savePageVisit(visit: PageVisit) {
    const history = this.getPageHistory();
    history.push(visit);
    if (history.length > 500) history.shift();
    localStorage.setItem(PAGE_HISTORY_KEY, JSON.stringify(history));
  }
}

export const advancedAnalytics = new AdvancedAnalyticsEngine();
