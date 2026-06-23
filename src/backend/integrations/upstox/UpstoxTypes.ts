export type UpstoxMode = 'live' | 'sandbox';

export interface UpstoxConfigSummary {
  hasApiKey: boolean;
  hasClientSecret: boolean;
  hasRedirectUri: boolean;
  hasAccessToken: boolean;
  sandboxEnabled: boolean;
  hasSandboxAccessToken: boolean;
  marketDataEnabled: boolean;
  orderSandboxEnabled: boolean;
}

export interface UpstoxUserProfile {
  userId: string;
  userName: string;
  email: string;
  mobile: string;
  broker: string;
}

export interface UpstoxFunds {
  totalAvailable: number;
  usedMargin: number;
  payin: number;
  payout: number;
  openingBalance: number;
  commodityTotalAvailable: number;
}

export interface UpstoxHolding {
  instrumentKey: string;
  symbol: string;
  isin: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface UpstoxPosition {
  instrumentKey: string;
  symbol: string;
  isin: string;
  quantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  buyQuantity: number;
  sellQuantity: number;
  buyAmount: number;
  sellAmount: number;
}

export interface UpstoxQuote {
  instrumentKey: string;
  symbol: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
}

export interface UpstoxCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi: number;
}

export interface UpstoxOrderRequest {
  instrumentKey: string;
  quantity: number;
  product: 'D' | 'I' | 'M' | 'CO' | 'OO';
  validity: 'DAY' | 'IOC';
  price: number;
  triggerPrice: number;
  transactionType: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
  tag?: string;
}

export interface UpstoxOrderResponse {
  orderId: string;
  status: string;
  message: string;
}

export interface TokenRecord {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  mode: UpstoxMode;
  receivedAt: string;
  userId?: string;
}
