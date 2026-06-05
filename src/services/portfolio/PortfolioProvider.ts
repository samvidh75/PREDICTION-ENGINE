/**
 * PortfolioProvider imports read-only portfolio data from Upstox.
 */

import type { PortfolioHolding, PortfolioPosition, PortfolioSnapshot } from './PortfolioSnapshot';
import { PortfolioNormalizer } from './PortfolioNormalizer';
import { UpstoxProvider } from '../brokers/UpstoxProvider';

const upstoxProvider = new UpstoxProvider();

function getAccessToken(): string {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('upstox_access_token');
    if (token) return token;
  }
  if (typeof process !== 'undefined' && process.env.UPSTOX_ACCESS_TOKEN) {
    return process.env.UPSTOX_ACCESS_TOKEN;
  }
  throw new Error('Upstox portfolio import requires an active access token');
}

export class PortfolioProvider {
  static async importPortfolio(accessToken = getAccessToken()): Promise<PortfolioSnapshot> {
    const [rawHoldings, rawPositions, rawFunds] = await Promise.all([
      upstoxProvider.getHoldings(accessToken),
      upstoxProvider.getPositions(accessToken),
      upstoxProvider.getFunds(accessToken),
    ]);

    const holdings = PortfolioNormalizer.normalizeHoldings(rawHoldings);
    const positions = PortfolioNormalizer.normalizePositions(rawPositions);
    const funds = PortfolioNormalizer.normalizeFunds(rawFunds);

    const totalMarketValue = holdings.reduce(
      (sum, holding) => sum + (holding.lastPrice ?? holding.averagePrice) * holding.quantity,
      0,
    );
    const totalCostBasis = holdings.reduce(
      (sum, holding) => sum + holding.averagePrice * holding.quantity,
      0,
    );

    return {
      holdings,
      positions,
      funds,
      totalMarketValue,
      totalCostBasis,
      totalUnrealizedPnl: holdings.reduce((sum, holding) => sum + (holding.pnl ?? 0), 0),
      timestamp: new Date().toISOString(),
    };
  }

  static async importHoldings(accessToken = getAccessToken()): Promise<PortfolioHolding[]> {
    const raw = await upstoxProvider.getHoldings(accessToken);
    return PortfolioNormalizer.normalizeHoldings(raw);
  }

  static async importPositions(accessToken = getAccessToken()): Promise<PortfolioPosition[]> {
    const raw = await upstoxProvider.getPositions(accessToken);
    return PortfolioNormalizer.normalizePositions(raw);
  }

  static async importFunds(accessToken = getAccessToken()) {
    const raw = await upstoxProvider.getFunds(accessToken);
    return PortfolioNormalizer.normalizeFunds(raw);
  }
}
