/**
 * Upstox Real-Time Price Service
 * - WebSocket live feed with fallbacks
 * - Multiple data sources with priority
 * - Intelligent caching layer
 * - Auto-reconnect with exponential backoff
 */

import { cacheManager, CACHE_KEYS, CACHE_TTL } from '../cache/CacheStrategy';
import { ENV } from '../../config/env';

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  volume: number;
  lastUpdateTime: number;
  source: 'upstox-ws' | 'upstox-rest' | 'cache' | 'fallback';
  bid?: number;
  ask?: number;
}

interface UpstoxWSMessage {
  mode?: string;
  token?: string;
  ltp?: number;
  ltq?: number;
  ltt?: number;
  bid?: number;
  ask?: number;
  bidq?: number;
  askq?: number;
  volume?: number;
  ohlc?: { o: number; h: number; l: number; c: number };
}

class UpstoxPriceService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers = new Map<string, ((update: PriceUpdate) => void)[]>();
  private lastPrices = new Map<string, PriceUpdate>();
  private isConnecting = false;
  private accessToken: string = '';
  private authFailed = false; // Track auth failures to avoid 401 spam

  constructor() {
    this.accessToken = ENV.UPSTOX_ACCESS_TOKEN;
  }

  /**
   * Initialize WebSocket connection
   */
  async initialize(): Promise<void> {
    if (this.ws || this.isConnecting) return;

    if (!this.accessToken || this.authFailed) {
      // Don't spam error logs, just use fallback data
      return;
    }

    this.isConnecting = true;

    try {
      // Only attempt WebSocket if we have valid auth
      // In production, validate token before attempting connection
      this.ws = new WebSocket('wss://api.upstox.com/ws/v1/');

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.sendAuthMessage();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (_error) => {
        // Silently handle errors, don't log 401s
        this.handleConnectionError();
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.isConnecting = false;
        if (!this.authFailed) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      this.isConnecting = false;
      this.handleConnectionError();
    }
  }

  /**
   * Send authentication message to Upstox
   */
  private sendAuthMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const authMessage = {
      guid: `app-${Date.now()}`,
      method: 'sub',
      data: {
        mode: 'ltpc',
        tokenList: ['NIFTY50_INDEX', 'SENSEX_INDEX']
      }
    };

    try {
      this.ws.send(JSON.stringify(authMessage));
    } catch (error) {
      console.error('[Upstox] Failed to send auth message:', error);
    }
  }

  /**
   * Subscribe to price updates
   */
  subscribe(symbol: string, callback: (update: PriceUpdate) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }
    this.subscribers.get(symbol)?.push(callback);

    // Subscribe to WebSocket if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.subscribeToSymbol(symbol);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(symbol);
      if (callbacks) {
        callbacks.splice(callbacks.indexOf(callback), 1);
      }
    };
  }

  /**
   * Subscribe to specific symbol on WebSocket
   */
  private subscribeToSymbol(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subMessage = {
      guid: `sub-${symbol}-${Date.now()}`,
      method: 'sub',
      data: {
        mode: 'ltpc',
        tokenList: [this.getUpstoxToken(symbol)]
      }
    };

    try {
      this.ws.send(JSON.stringify(subMessage));
    } catch (error) {
      console.error(`[Upstox] Failed to subscribe to ${symbol}:`, error);
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleMessage(data: string | ArrayBuffer): void {
    try {
      let parsed: UpstoxWSMessage;

      if (typeof data === 'string') {
        parsed = JSON.parse(data);
      } else {
        // Handle binary data if needed
        parsed = JSON.parse(new TextDecoder().decode(data as ArrayBuffer));
      }

      if (!parsed.token || !parsed.ltp) return;

      const symbol = this.getSymbolFromToken(parsed.token);
      if (!symbol) return;

      const update: PriceUpdate = {
        symbol,
        price: parsed.ltp,
        change: (parsed.ltp - (parsed.ohlc?.c || parsed.ltp)) || 0,
        changePercent: ((parsed.ltp - (parsed.ohlc?.c || parsed.ltp)) / (parsed.ohlc?.c || parsed.ltp)) * 100 || 0,
        timestamp: Date.now(),
        volume: parsed.ltq || 0,
        lastUpdateTime: parsed.ltt || Date.now(),
        source: 'upstox-ws',
        bid: parsed.bid,
        ask: parsed.ask
      };

      this.lastPrices.set(symbol, update);
      this.notifySubscribers(symbol, update);
      this.cachePrice(symbol, update);
    } catch (error) {
      console.error('[Upstox] Failed to parse message:', error);
    }
  }

  /**
   * Fetch price using REST API as fallback
   */
  async fetchPrice(symbol: string): Promise<PriceUpdate | null> {
    // Try cache first
    const cached = await cacheManager.get<PriceUpdate>(CACHE_KEYS.PRICE(symbol));
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    // Try Upstox REST API
    try {
      const response = await fetch(
        `https://api.upstox.com/v2/market-quote/?symbol=NSE_EQ|${symbol}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const quote = data.data?.[`NSE_EQ|${symbol}`]?.ltp;

      if (quote) {
        const update: PriceUpdate = {
          symbol,
          price: quote,
          change: 0,
          changePercent: 0,
          timestamp: Date.now(),
          volume: 0,
          lastUpdateTime: Date.now(),
          source: 'upstox-rest'
        };

        await this.cachePrice(symbol, update);
        return update;
      }
    } catch (error) {
      console.warn(`[Upstox] REST API fallback failed for ${symbol}:`, error);
    }

    // Try AlphaVantage API
    try {
      return await this.fetchFromAlphaVantage(symbol);
    } catch (error) {
      console.warn(`[Upstox] AlphaVantage fallback failed for ${symbol}:`, error);
    }

    // Try Yahoo Finance API
    try {
      return await this.fetchFromYahooFinance(symbol);
    } catch (error) {
      console.warn(`[Upstox] Yahoo Finance fallback failed for ${symbol}:`, error);
    }

    return null;
  }

  /**
   * Fallback: AlphaVantage API
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<PriceUpdate | null> {
    const apiKey = ENV.ALPHAVANTAGE_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}.NS&apikey=${apiKey}`
      );

      const data = await response.json();
      const quote = data['Global Quote'];

      if (quote?.['05. price']) {
        const update: PriceUpdate = {
          symbol,
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']) || 0,
          changePercent: parseFloat(quote['10. change percent']) || 0,
          timestamp: Date.now(),
          volume: parseInt(quote['06. volume']) || 0,
          lastUpdateTime: Date.now(),
          source: 'fallback'
        };

        await this.cachePrice(symbol, update);
        return update;
      }
    } catch (error) {
      console.error('[AlphaVantage] Fetch failed:', error);
    }

    return null;
  }

  /**
   * Fallback: Yahoo Finance API (unofficial)
   */
  private async fetchFromYahooFinance(symbol: string): Promise<PriceUpdate | null> {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}.NS?modules=price`
      );

      const data = await response.json();
      const price = data.quoteSummary?.result?.[0]?.price;

      if (price?.regularMarketPrice?.raw) {
        const update: PriceUpdate = {
          symbol,
          price: price.regularMarketPrice.raw,
          change: price.regularMarketChange?.raw || 0,
          changePercent: price.regularMarketChangePercent?.raw || 0,
          timestamp: Date.now(),
          volume: price.regularMarketVolume?.raw || 0,
          lastUpdateTime: Date.now(),
          source: 'fallback'
        };

        await this.cachePrice(symbol, update);
        return update;
      }
    } catch (error) {
      console.error('[Yahoo Finance] Fetch failed:', error);
    }

    return null;
  }

  /**
   * Get last price for symbol
   */
  getLastPrice(symbol: string): PriceUpdate | null {
    return this.lastPrices.get(symbol) || null;
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(symbol: string, update: PriceUpdate): void {
    const callbacks = this.subscribers.get(symbol);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(update);
        } catch (error) {
          console.error('[Upstox] Subscriber error:', error);
        }
      });
    }
  }

  /**
   * Cache price update
   */
  private async cachePrice(symbol: string, update: PriceUpdate): Promise<void> {
    try {
      await cacheManager.set(
        CACHE_KEYS.PRICE(symbol),
        update,
        CACHE_TTL.PRICE
      );
    } catch (error) {
      console.error('[Cache] Failed to cache price:', error);
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    } else {
      console.error('[Upstox] Max reconnect attempts reached, using fallback data only');
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.isConnecting) return;

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`[Upstox] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.initialize().catch(console.error);
    }, delay);
  }

  /**
   * Map Upstox token to symbol
   */
  private getUpstoxToken(symbol: string): string {
    // NSE tokens (simplified)
    const tokens: Record<string, string> = {
      'NIFTY50_INDEX': '99926000',
      'SENSEX_INDEX': '99926009',
      'HDFCBANK': '175065857',
      'TCS': '1333652',
      'INFY': '1594550',
      'RELIANCE': '738561',
      'MARUTI': '2625601'
    };

    return tokens[symbol] || symbol;
  }

  /**
   * Reverse map token to symbol
   */
  private getSymbolFromToken(token: string): string | null {
    const tokenToSymbol: Record<string, string> = {
      '99926000': 'NIFTY50_INDEX',
      '99926009': 'SENSEX_INDEX',
      '175065857': 'HDFCBANK',
      '1333652': 'TCS',
      '1594550': 'INFY',
      '738561': 'RELIANCE',
      '2625601': 'MARUTI'
    };

    return tokenToSymbol[token] || null;
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; reconnectAttempts: number; lastUpdate?: number } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      lastUpdate: this.lastPrices.size > 0 ? Math.max(...Array.from(this.lastPrices.values()).map(p => p.timestamp)) : undefined
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.lastPrices.clear();
  }
}

export const upstoxPriceService = new UpstoxPriceService();
