/**
 * PortfolioProvider — Portfolio data ingestion interface.
 * 
 * RC-UPSTOX-001: Abstraction layer for portfolio data import.
 * Converts broker-specific formats into StockStory's normalized types.
 */

import type { PortfolioHolding, PortfolioPosition, PortfolioSnapshot } from './PortfolioSnapshot';
import { PortfolioNormalizer } from './PortfolioNormalizer';
import { upstoxProvider } from '../providers/UpstoxProvider';
import type { UpstoxHolding, UpstoxPosition, UpstoxFunds } from '../providers/UpstoxProvider';

export class PortfolioProvider {
  /**
   * Import complete portfolio from Upstox.
   * Returns a fully normalized PortfolioSnapshot.
   */
  static async importPortfolio(): Promise<PortfolioSnapshot> {
    const [rawHoldings, rawPositions, rawFunds] = await Promise.all([
      upstoxProvider.getHoldings(),
      upstoxProvider.getPositions(),
      upstoxProvider.getFunds(),
    ]);

    const holdings = PortfolioNormalizer.normalizeHoldings(rawHoldings);
    const positions = PortfolioNormalizer.normalizePositions(rawPositions);
    const funds = PortfolioNormalizer.normalizeFunds(rawFunds);

    const totalMarketValue = holdings.reduce((s, h) => s + (h.lastPrice ?? h.averagePrice) * h.quantity, 0);
    const totalCostBasis = holdings.reduce((s, h) => s + h.averagePrice * h.quantity, 0);

    return {
      holdings,
      positions,
      funds,
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedPnl: holdings.reduce((s, h) => s + (h.pnl ?? 0), 0),
      timestamp: new Date().toISOString(),
    };
  }

  /** Import holdings only */
  static async importHoldings(): Promise<PortfolioHolding[]> {
    const raw = await upstoxProvider.getHoldings();
    return PortfolioNormalizer.normalizeHoldings(raw);
  }

  /** Import positions only */
  static async importPositions(): Promise<PortfolioPosition[]> {
    const raw = await upstoxProvider.getPositions();
    return PortfolioNormalizer.normalizePositions(raw);
  }

  /** Import funds only */
  static async importFunds() {
    const raw = await upstoxProvider.getFunds();
    return PortfolioNormalizer.normalizeFunds(raw);
  }
}
