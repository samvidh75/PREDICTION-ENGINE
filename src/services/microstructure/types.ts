// Microstructure and order book types

export interface OrderLevel {
  price: number;
  quantity: number;
  orders?: number; // number of orders at this level
}

export interface OrderBook {
  ticker: string;
  timestamp: number; // Unix milliseconds
  bid: OrderLevel[];
  ask: OrderLevel[];
  lastTrade?: {
    price: number;
    quantity: number;
    timestamp: number;
  };
}

export interface OrderBookSnapshot {
  ticker: string;
  timestamp: number;
  bidPrice: number;
  bidVolume: number;
  askPrice: number;
  askVolume: number;
  spread: number;
  spreadPercent: number;
  mid: number;
  depth10Imbalance: number; // (bid vol - ask vol) / (bid vol + ask vol)
  totalBidVolume: number;
  totalAskVolume: number;
}

export interface Anomaly {
  id: string;
  ticker: string;
  type: 'volume_spike' | 'spread_widening' | 'flash_crash' | 'order_imbalance' | 'liquidity_crisis';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  description: string;
  value: number;
  threshold: number;
  metadata: Record<string, unknown>;
}

export interface ProviderConfig {
  name: 'upstox' | 'shoonya' | 'finvasia' | 'finvasia-nse' | 'manual';
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
}

export interface NormalizedOrderBook {
  ticker: string;
  timestamp: number;
  bid: OrderLevel[];
  ask: OrderLevel[];
  provider: string;
  dataQuality: number; // 0-1 score
}
