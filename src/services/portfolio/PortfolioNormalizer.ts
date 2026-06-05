/**
 * PortfolioNormalizer — Converts broker data → StockStory canonical types.
 * RC-UPSTOX-001: NSE/BSE symbol cleanup, ISIN resolution, exchange normalization.
 */

import { MasterCompanyRegistry } from '../data/MasterCompanyRegistry';
import type { PortfolioHolding, PortfolioPosition, PortfolioFunds } from './PortfolioSnapshot';
import type { UpstoxHolding, UpstoxPosition, UpstoxFunds } from '../providers/UpstoxProvider';

export class PortfolioNormalizer {
  private static registry = MasterCompanyRegistry.getInstance();

  /** Normalize Upstox holdings → PortfolioHolding[] */
  static normalizeHoldings(raw: UpstoxHolding[]): PortfolioHolding[] {
    return raw.map(h => {
      const symbol = this.cleanSymbol(h.tradingSymbol);
      const entry = this.registry.lookup(symbol);

      return {
        symbol: entry?.nseSymbol ?? symbol,
        isin: h.isin ?? entry?.isin ?? undefined,
        exchange: this.normalizeExchange(h.exchange),
        quantity: h.quantity,
        averagePrice: h.averagePrice,
        lastPrice: h.lastPrice,
        pnl: h.pnl,
        sector: entry?.sector ?? 'General',
        marketCap: entry?.marketCap,
      };
    }).filter(h => h.quantity > 0);
  }

  /** Normalize Upstox positions → PortfolioPosition[] */
  static normalizePositions(raw: UpstoxPosition[]): PortfolioPosition[] {
    return raw
      .filter(p => p.quantity !== 0)
      .map(p => ({
        symbol: this.cleanSymbol(p.tradingSymbol),
        exchange: this.normalizeExchange(p.exchange),
        quantity: p.quantity,
        averagePrice: p.averagePrice,
        lastPrice: p.lastPrice,
        pnl: p.pnl,
        product: p.product || 'DELIVERY',
      }));
  }

  /** Normalize Upstox funds → PortfolioFunds */
  static normalizeFunds(raw: UpstoxFunds): PortfolioFunds {
    return {
      availableCash: raw.availableMargin,
      usedMargin: raw.usedMargin,
      totalMargin: raw.totalMargin,
    };
  }

  /** Clean broker symbols to StockStory format */
  static cleanSymbol(raw: string): string {
    return raw
      .replace(/-EQ$/i, '')
      .replace(/-BE$/i, '')
      .replace(/\\.NS$/i, '')
      .replace(/\\.BO$/i, '')
      .replace(/^NSE:/i, '')
      .replace(/^BSE:/i, '')
      .trim()
      .toUpperCase();
  }

  /** Normalize exchange codes */
  static normalizeExchange(raw: string): string {
    const upper = raw.toUpperCase();
    if (upper.includes('BSE') || upper === 'BSE_EQ' || upper === 'BSE_BSE') return 'BSE';
    if (upper.includes('NSE') || upper === 'NSE_EQ' || upper === 'NSE_BSE') return 'NSE';
    if (upper.includes('NFO') || upper.includes('BFO')) return 'FNO';
    if (upper.includes('MCX')) return 'MCX';
    return 'NSE'; // Default
  }
}
