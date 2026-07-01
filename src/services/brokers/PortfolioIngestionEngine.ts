/**
 * PortfolioIngestionEngine — Converts broker portfolio data into Lensory format.
 * 
 * Handles:
 *   - Symbol normalization (NSE/BSE → Lensory format)
 *   - ISIN mapping via MasterCompanyRegistry
 *   - Sector enrichment
 *   - Market cap enrichment
 *   - Health score placeholder assignment (before Lensory analysis)
 */

import { MasterCompanyRegistry } from '../data/MasterCompanyRegistry';
import type { BrokerPortfolio, BrokerFundSummary } from '../brokers/BrokerProvider';
import type { PortfolioHolding, PortfolioPosition, PortfolioSnapshot } from '../brokers/PortfolioTypes';

export class PortfolioIngestionEngine {
  private static registry = MasterCompanyRegistry.getInstance();

  /**
   * Ingest a complete broker portfolio and normalize into Lensory format.
   */
  static ingest(brokerPortfolio: BrokerPortfolio, userId: string): PortfolioSnapshot {
    const holdings = this.normalizeHoldings(brokerPortfolio.holdings);
    const positions = this.normalizePositions(brokerPortfolio.positions);
    const funds = brokerPortfolio.funds;

    const totalMarketValue = holdings.reduce((s, h) => s + (h.lastPrice ?? h.averagePrice) * h.quantity, 0);
    const totalCostBasis = holdings.reduce((s, h) => s + h.averagePrice * h.quantity, 0);
    const totalUnrealizedPnl = holdings.reduce((s, h) => s + (h.pnl ?? 0), 0);
    const totalUnrealizedPnlPercent = totalCostBasis > 0
      ? (totalUnrealizedPnl / totalCostBasis) * 100
      : 0;

    return {
      userId,
      broker: 'upstox',
      timestamp: new Date().toISOString(),
      holdings,
      positions,
      funds,
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedPnl,
      totalUnrealizedPnlPercent,
    };
  }

  /**
   * Normalize holdings — enrich with Lensory metadata.
   */
  private static normalizeHoldings(holdings: PortfolioHolding[]): PortfolioHolding[] {
    return holdings.map(h => {
      const entry = this.registry.lookup(h.symbol);
      return {
        ...h,
        symbol: entry?.nseSymbol ?? h.symbol,
        isin: h.isin ?? entry?.isin ?? undefined,
        sector: entry?.sector ?? h.sector ?? 'General',
        marketCap: entry?.marketCap ?? h.marketCap,
      };
    });
  }

  /**
   * Normalize positions — same enrichment as holdings.
   */
  private static normalizePositions(positions: PortfolioPosition[]): PortfolioPosition[] {
    return positions.map(p => {
      const entry = this.registry.lookup(p.symbol);
      return {
        ...p,
        symbol: entry?.nseSymbol ?? p.symbol,
        isin: p.isin ?? entry?.isin ?? undefined,
      };
    });
  }
}
