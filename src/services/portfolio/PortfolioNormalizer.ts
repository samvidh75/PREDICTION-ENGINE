/**
 * PortfolioNormalizer converts broker data to StockStory canonical types.
 */

import { MasterCompanyRegistry } from '../data/MasterCompanyRegistry';
import type { PortfolioHolding, PortfolioPosition, PortfolioFunds } from './PortfolioSnapshot';
import type {
  PortfolioHolding as BrokerHolding,
  PortfolioPosition as BrokerPosition,
} from '../brokers/PortfolioTypes';
import type { BrokerFundSummary } from '../brokers/BrokerProvider';

export class PortfolioNormalizer {
  private static registry = MasterCompanyRegistry.getInstance();

  static normalizeHoldings(raw: BrokerHolding[]): PortfolioHolding[] {
    return raw
      .map((holding) => {
        const symbol = this.cleanSymbol(holding.symbol);
        const entry = this.registry.lookup(symbol);

        return {
          symbol: entry?.nseSymbol ?? symbol,
          isin: holding.isin ?? entry?.isin ?? undefined,
          exchange: this.normalizeExchange(holding.exchange),
          quantity: holding.quantity,
          averagePrice: holding.averagePrice,
          lastPrice: holding.lastPrice,
          pnl: holding.pnl,
          pnlPercent: holding.pnlPercent,
          sector: entry?.sector ?? holding.sector,
          marketCap: entry?.marketCap ?? holding.marketCap,
        };
      })
      .filter((holding) => holding.quantity > 0);
  }

  static normalizePositions(raw: BrokerPosition[]): PortfolioPosition[] {
    return raw
      .filter((position) => position.quantity !== 0)
      .map((position) => ({
        symbol: this.cleanSymbol(position.symbol),
        exchange: this.normalizeExchange(position.exchange),
        quantity: position.quantity,
        averagePrice: position.averagePrice,
        lastPrice: position.lastPrice,
        pnl: position.pnl,
        product: position.product || 'DELIVERY',
      }));
  }

  static normalizeFunds(raw: BrokerFundSummary): PortfolioFunds {
    return {
      availableCash: raw.availableCash,
      usedMargin: raw.usedMargin,
      totalMargin: raw.totalValue,
    };
  }

  static cleanSymbol(raw: string): string {
    return raw
      .replace(/-EQ$/i, '')
      .replace(/-BE$/i, '')
      .replace(/\.NS$/i, '')
      .replace(/\.BO$/i, '')
      .replace(/^NSE:/i, '')
      .replace(/^BSE:/i, '')
      .trim()
      .toUpperCase();
  }

  static normalizeExchange(raw: string): string {
    const upper = raw.toUpperCase();
    if (upper.includes('BSE') || upper === 'BSE_EQ' || upper === 'BSE_BSE') return 'BSE';
    if (upper.includes('NSE') || upper === 'NSE_EQ' || upper === 'NSE_BSE') return 'NSE';
    if (upper.includes('NFO') || upper.includes('BFO')) return 'FNO';
    if (upper.includes('MCX')) return 'MCX';
    return 'NSE';
  }
}
