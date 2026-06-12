// src/services/portfolio/PortfolioSnapshotFactory.ts
import { PortfolioEngine, UserHolding } from './PortfolioEngine';
import { buildPortfolioReview, type PortfolioReviewSnapshot } from './PortfolioReviewEngine';

export interface PortfolioSnapshot {
  holdings: UserHolding[];
  review: PortfolioReviewSnapshot;
  lastUpdated: string;
}

/**
 * PortfolioSnapshotFactory now emits the truthful operating snapshot only.
 *
 * Previous versions executed sector-stereotype volatility, arbitrary base-health
 * scores, buy-price substitution for missing live quotes and a synthetic weakest
 * holding selection. Those calculators remain isolated legacy modules and are no
 * longer invoked by the active portfolio page.
 */
export class PortfolioSnapshotFactory {
  public static createSnapshot(currentPrices: Record<string, number | null | undefined> = {}): PortfolioSnapshot {
    const holdings = PortfolioEngine.getHoldings();
    return {
      holdings,
      review: buildPortfolioReview(holdings, currentPrices),
      lastUpdated: new Date().toISOString(),
    };
  }
}
