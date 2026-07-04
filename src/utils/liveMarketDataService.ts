/**
 * Fetches live market data for AI context
 * - Real-time price from cache/API
 * - Fundamentals (P/E, ROE, etc.)
 * - Integrates with Upstox WebSocket when available
 */

import type { MarketContext } from './aiContextBuilder';

interface StockFundamentals {
  pe?: number;
  roe?: number;
  debtToEquity?: number;
  marketCap?: number;
  divYield?: number;
}

class LiveMarketDataService {
  private priceCache = new Map<string, { price: number; timestamp: number }>();
  private fundamentalsCache = new Map<string, { data: StockFundamentals; timestamp: number }>();
  private cacheTTL = 60000; // 1 minute

  /**
   * Get live market context for a ticker
   */
  async getMarketContext(ticker: string): Promise<MarketContext> {
    const context: MarketContext = { ticker };

    // Get current price
    const price = await this.getPrice(ticker);
    if (price) {
      context.currentPrice = price.current;
      context.change = price.change;
      context.changePercent = price.changePercent;
      context.lastUpdate = price.timestamp;
    }

    // Get fundamentals (P/E, ROE, etc.)
    const fundamentals = await this.getFundamentals(ticker);
    if (fundamentals) {
      Object.assign(context, fundamentals);
    }

    return context;
  }

  /**
   * Fetch current price from API or cache
   */
  private async getPrice(ticker: string): Promise<{ current: number; change: number; changePercent: number; timestamp: number } | null> {
    // Check cache first
    const cached = this.priceCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        current: cached.price,
        change: 0,
        changePercent: 0,
        timestamp: cached.timestamp,
      };
    }

    try {
      // Try to fetch from backend API
      const response = await fetch(`/api/stock/${ticker}/price`);
      if (response.ok) {
        const data = await response.json();
        this.priceCache.set(ticker, { price: data.price, timestamp: Date.now() });
        return {
          current: data.price,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch price for ${ticker}:`, error);
    }

    return null;
  }

  /**
   * Fetch fundamentals from API or cache
   */
  private async getFundamentals(ticker: string): Promise<StockFundamentals | null> {
    // Check cache first
    const cached = this.fundamentalsCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 10) {
      // Longer TTL for fundamentals
      return cached.data;
    }

    try {
      // Try to fetch from backend API
      const response = await fetch(`/api/stock/${ticker}/fundamentals`);
      if (response.ok) {
        const data = await response.json();
        this.fundamentalsCache.set(ticker, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      console.warn(`Failed to fetch fundamentals for ${ticker}:`, error);
    }

    return null;
  }

  /**
   * Subscribe to real-time price updates via WebSocket
   */
  subscribeToRealtime(ticker: string, callback: (context: MarketContext) => void): () => void {
    let ws: WebSocket | null = null;
    let reconnectAttempts = 0;
    const maxAttempts = 5;

    const connect = () => {
      try {
        ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/v1/event-alerts`);

        ws.onopen = () => {
          // Subscribe to this ticker
          ws!.send(JSON.stringify({ action: 'subscribe', ticker }));
          reconnectAttempts = 0;
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.ticker === ticker) {
              // Update cache with new price
              if (data.price) {
                this.priceCache.set(ticker, { price: data.price, timestamp: Date.now() });
              }
              // Get full context and callback
              const context = await this.getMarketContext(ticker);
              callback(context);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = () => {
          if (reconnectAttempts < maxAttempts) {
            reconnectAttempts++;
            setTimeout(connect, 1000 * reconnectAttempts);
          }
        };

        ws.onclose = () => {
          if (reconnectAttempts < maxAttempts) {
            reconnectAttempts++;
            setTimeout(connect, 1000 * reconnectAttempts);
          }
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    connect();

    // Return unsubscribe function
    return () => {
      if (ws) {
        ws.send(JSON.stringify({ action: 'unsubscribe', ticker }));
        ws.close();
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.priceCache.clear();
    this.fundamentalsCache.clear();
  }
}

export const liveMarketDataService = new LiveMarketDataService();
