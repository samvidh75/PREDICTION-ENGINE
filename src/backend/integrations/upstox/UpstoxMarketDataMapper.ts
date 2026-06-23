import type { UpstoxQuote, UpstoxCandle } from './UpstoxTypes';

export interface NormalizedQuote {
  symbol: string;
  exchange: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
  provider: 'upstox';
}

export interface NormalizedCandle {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  provider: 'upstox';
}

export function mapQuote(upstoxQuote: UpstoxQuote): NormalizedQuote {
  return {
    symbol: upstoxQuote.symbol,
    exchange: 'NSE',
    lastPrice: upstoxQuote.lastPrice,
    change: upstoxQuote.change,
    changePercent: upstoxQuote.changePercent,
    open: upstoxQuote.open,
    high: upstoxQuote.high,
    low: upstoxQuote.low,
    close: upstoxQuote.close,
    volume: upstoxQuote.volume,
    timestamp: upstoxQuote.timestamp,
    provider: 'upstox',
  };
}

export function mapCandle(candle: UpstoxCandle, symbol: string): NormalizedCandle {
  return {
    symbol,
    date: candle.timestamp.split('T')[0],
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    provider: 'upstox',
  };
}
