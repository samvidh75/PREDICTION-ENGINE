/**
 * PSE Client - Unified Philippine Stock Exchange
 *
 * Previously supported both NSE and BSE (Indian exchanges).
 * Now consolidated to PSE (Philippine Stock Exchange) only.
 */

import { pseClient } from './NSEClient';
import type { QuoteResult } from './types';

export class PSEClient {
  async fetchQuote(symbol: string, useCache = true): Promise<QuoteResult> {
    return pseClient.fetchQuote(symbol, useCache);
  }

  async fetchBatch(symbols: string[]): Promise<Array<{ symbol: string; quote?: any; error?: string }>> {
    return pseClient.fetchBatch(symbols);
  }
}

export interface PSEQuoteResponse {
  success: boolean;
  quote?: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    bid: number;
    ask: number;
    high: number;
    low: number;
    open: number;
    close: number;
    timestamp: string;
    market: 'PSE';
  };
}

// Singleton for PSE
export const pseClient2 = pseClient;
export const bseClient = pseClient; // Backwards compatibility
