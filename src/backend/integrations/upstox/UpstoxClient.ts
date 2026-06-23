import { UpstoxConfig } from './UpstoxConfig';
import { UpstoxTokenStore } from './UpstoxTokenStore';
import { UpstoxApiError, sanitizeErrorMessage } from './UpstoxErrors';
import type { UpstoxUserProfile, UpstoxFunds, UpstoxHolding, UpstoxPosition, UpstoxQuote, UpstoxCandle } from './UpstoxTypes';

const FETCH_TIMEOUT = 10_000;

export class UpstoxClient {
  private config: UpstoxConfig;
  private tokenStore: UpstoxTokenStore;

  constructor(config?: UpstoxConfig, tokenStore?: UpstoxTokenStore) {
    this.config = config ?? UpstoxConfig.getInstance();
    this.tokenStore = tokenStore ?? UpstoxTokenStore.getInstance();
  }

  private getToken(): string {
    const token = this.tokenStore.getLiveToken();
    if (!token) {
      throw new UpstoxApiError('Live access token not available', 401);
    }
    return token;
  }

  private getBaseUrl(): string {
    return 'https://api.upstox.com/v2';
  }

  private async apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const url = `${this.getBaseUrl()}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const safeMsg = sanitizeErrorMessage(data.message || data.error || `HTTP ${response.status}`);
        if (response.status === 401) {
          throw new UpstoxApiError('Access token expired or invalid', 401, data.error);
        }
        if (response.status === 429) {
          throw new UpstoxApiError('Rate limited', 429);
        }
        throw new UpstoxApiError(safeMsg, response.status, data.error);
      }

      return data as T;
    } catch (err: unknown) {
      if (err instanceof UpstoxApiError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('timeout')) {
        throw new UpstoxApiError('Request timed out', 408);
      }
      throw new UpstoxApiError(`Request failed: ${sanitizeErrorMessage(msg)}`, 500);
    } finally {
      clearTimeout(timer);
    }
  }

  async getUserProfile(): Promise<UpstoxUserProfile> {
    const result = await this.apiFetch<any>('/user/profile');
    if (result.status === 'success' && result.data) {
      return {
        userId: result.data.user_id || '',
        userName: result.data.user_name || '',
        email: result.data.email || '',
        mobile: result.data.mobile || '',
        broker: 'upstox',
      };
    }
    throw new UpstoxApiError('Failed to get user profile', 500);
  }

  async getFunds(): Promise<UpstoxFunds> {
    const result = await this.apiFetch<any>('/user/get-funds-and-margin');
    if (result.status === 'success' && result.data) {
      return {
        totalAvailable: Number(result.data.equity?.total_available) || 0,
        usedMargin: Number(result.data.equity?.used_margin) || 0,
        payin: Number(result.data.equity?.payin) || 0,
        payout: Number(result.data.equity?.payout) || 0,
        openingBalance: Number(result.data.equity?.opening_balance) || 0,
        commodityTotalAvailable: Number(result.data.commodity?.total_available) || 0,
      };
    }
    throw new UpstoxApiError('Failed to get funds', 500);
  }

  async getHoldings(): Promise<UpstoxHolding[]> {
    const result = await this.apiFetch<any>('/user/holdings');
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map((item: any) => ({
        instrumentKey: item.instrument_key || '',
        symbol: item.symbol || item.trading_symbol || '',
        isin: item.isin || '',
        quantity: Number(item.quantity) || 0,
        averagePrice: Number(item.average_price) || 0,
        lastPrice: Number(item.ltp) || 0,
        pnl: Number(item.pnl) || 0,
        dayChange: Number(item.day_change) || 0,
        dayChangePercent: Number(item.day_change_percentage) || 0,
      }));
    }
    return [];
  }

  async getPositions(): Promise<UpstoxPosition[]> {
    const result = await this.apiFetch<any>('/user/positions');
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data.map((item: any) => ({
        instrumentKey: item.instrument_key || '',
        symbol: item.symbol || item.trading_symbol || '',
        isin: item.isin || '',
        quantity: Number(item.quantity) || 0,
        averagePrice: Number(item.average_price) || 0,
        lastPrice: Number(item.ltp) || 0,
        pnl: Number(item.pnl) || 0,
        buyQuantity: Number(item.buy_quantity) || 0,
        sellQuantity: Number(item.sell_quantity) || 0,
        buyAmount: Number(item.buy_amount) || 0,
        sellAmount: Number(item.sell_amount) || 0,
      }));
    }
    return [];
  }

  async getMarketQuote(instrumentKeys: string[]): Promise<UpstoxQuote[]> {
    const keys = instrumentKeys.join(',');
    const result = await this.apiFetch<any>(`/market-quote/ltp?instrument_key=${encodeURIComponent(keys)}`);
    if (result.status === 'success' && result.data) {
      return Object.entries(result.data).map(([key, item]: [string, any]) => ({
        instrumentKey: key,
        symbol: item.symbol || '',
        lastPrice: Number(item.last_price) || 0,
        change: Number(item.net_change) || 0,
        changePercent: Number(item.percentage_change) || 0,
        open: Number(item.ohlc?.open) || 0,
        high: Number(item.ohlc?.high) || 0,
        low: Number(item.ohlc?.low) || 0,
        close: Number(item.ohlc?.close) || 0,
        volume: Number(item.volume) || 0,
        timestamp: item.timestamp || new Date().toISOString(),
      }));
    }
    return [];
  }

  async getHistoricalCandles(instrumentKey: string, interval: string, from: string, to: string): Promise<UpstoxCandle[]> {
    const result = await this.apiFetch<any>(`/historical/${encodeURIComponent(instrumentKey)}/${interval}/${from}/${to}`);
    if (result.status === 'success' && Array.isArray(result.data?.candles)) {
      return result.data.candles.map((candle: any[]) => ({
        timestamp: candle[0],
        open: Number(candle[1]) || 0,
        high: Number(candle[2]) || 0,
        low: Number(candle[3]) || 0,
        close: Number(candle[4]) || 0,
        volume: Number(candle[5]) || 0,
        oi: Number(candle[6]) || 0,
      }));
    }
    return [];
  }

  async getInstrument(instrumentKey: string): Promise<any> {
    return this.apiFetch<any>(`/instruments/${encodeURIComponent(instrumentKey)}`);
  }
}
