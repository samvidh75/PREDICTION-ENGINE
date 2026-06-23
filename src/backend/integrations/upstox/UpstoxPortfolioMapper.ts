import type { UpstoxHolding, UpstoxPosition } from './UpstoxTypes';

export interface NormalizedHolding {
  symbol: string;
  isin: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  dayChange: number;
  dayChangePercent: number;
  provider: 'upstox';
}

export interface NormalizedPosition {
  symbol: string;
  isin: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  buyQuantity: number;
  sellQuantity: number;
  provider: 'upstox';
}

export function mapHolding(holding: UpstoxHolding): NormalizedHolding {
  return {
    symbol: holding.symbol,
    isin: holding.isin,
    quantity: holding.quantity,
    averagePrice: holding.averagePrice,
    lastPrice: holding.lastPrice,
    pnl: holding.pnl,
    dayChange: holding.dayChange,
    dayChangePercent: holding.dayChangePercent,
    provider: 'upstox',
  };
}

export function mapPosition(position: UpstoxPosition): NormalizedPosition {
  return {
    symbol: position.symbol,
    isin: position.isin,
    quantity: position.quantity,
    averagePrice: position.averagePrice,
    lastPrice: position.lastPrice,
    pnl: position.pnl,
    buyQuantity: position.buyQuantity,
    sellQuantity: position.sellQuantity,
    provider: 'upstox',
  };
}
