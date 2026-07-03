/**
 * WebSocket live quote server
 * Streams real-time quotes from IndianAPI, fallback to Groww/Yahoo
 *
 * Clients: frontend subscribes to symbols, receives 500ms updates
 * Path: /api/quotes/ws
 *
 * Protocol:
 *   Client → {"type":"subscribe", "symbols":["TCS","INFY"]}
 *   Client → {"type":"unsubscribe", "symbols":["RELIANCE"]}
 *   Server → {"symbol":"TCS", "price":4523.5, "bid":4522.0, "ask":4524.5, "volume":1234567, "timestamp":"2024-01-15T10:30:45Z"}
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type WebSocket from 'ws';
import { QuoteProvider } from './liveQuoteProviders.js';

interface ClientSubscription {
  ws: WebSocket;
  symbols: Set<string>;
  isAlive: boolean;
}

interface QuoteUpdate {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: string;
  lastUpdated: number;
}

export class LiveQuoteServer {
  private clients = new Map<string, ClientSubscription>();
  private quoteCache = new Map<string, QuoteUpdate>();
  private provider = new QuoteProvider();
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private app: FastifyInstance) {}

  register() {
    this.app.get(
      '/api/quotes/ws',
      { websocket: true },
      (connection: WebSocket, request: FastifyRequest) => {
        this.handleNewConnection(connection, request);
      }
    );

    this.app.get('/api/quotes/health', async () => {
      return {
        status: 'ok',
        symbols: this.quoteCache.size,
        clients: this.clients.size,
        uptime: process.uptime(),
      };
    });
  }

  private handleNewConnection(ws: WebSocket, req: FastifyRequest) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const subscription: ClientSubscription = { ws, symbols: new Set(), isAlive: true };
    this.clients.set(clientId, subscription);
    console.log(`[WS] Client connected: ${clientId}`);

    ws.on('pong', () => { subscription.isAlive = true; });

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleClientMessage(clientId, subscription, msg);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[WS] Client disconnected: ${clientId}`);
    });

    ws.on('error', (err: Error) => {
      console.error(`[WS] Error (${clientId}):`, err);
      this.clients.delete(clientId);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to StockStory live quotes',
      clientId,
    }));
  }

  private handleClientMessage(clientId: string, subscription: ClientSubscription, msg: any) {
    if (msg.type === 'subscribe' && Array.isArray(msg.symbols)) {
      for (const sym of msg.symbols) subscription.symbols.add(sym.toUpperCase());
      console.log(`[WS] ${clientId} subscribed to ${msg.symbols.join(', ')}`);
      for (const sym of subscription.symbols) {
        const cached = this.quoteCache.get(sym);
        if (cached) subscription.ws.send(JSON.stringify(cached));
      }
    } else if (msg.type === 'unsubscribe' && Array.isArray(msg.symbols)) {
      for (const sym of msg.symbols) subscription.symbols.delete(sym.toUpperCase());
      console.log(`[WS] ${clientId} unsubscribed from ${msg.symbols.join(', ')}`);
    }
  }

  startBroadcast() {
    if (this.broadcastInterval) return;

    this.broadcastInterval = setInterval(async () => {
      const allSymbols = new Set<string>();
      for (const sub of this.clients.values()) {
        for (const sym of sub.symbols) allSymbols.add(sym);
      }
      if (allSymbols.size === 0) return;

      try {
        const quotes = await this.provider.fetchQuotes(Array.from(allSymbols));
        for (const quote of quotes) {
          const update: QuoteUpdate = {
            symbol: quote.symbol,
            price: quote.price,
            bid: quote.bid,
            ask: quote.ask,
            volume: quote.volume,
            timestamp: new Date().toISOString(),
            lastUpdated: Date.now(),
          };
          this.quoteCache.set(quote.symbol, update);
        }

        for (const [clientId, sub] of this.clients) {
          if (!sub.isAlive || sub.symbols.size === 0) continue;
          for (const quote of quotes) {
            if (sub.symbols.has(quote.symbol)) {
              try {
                sub.ws.send(JSON.stringify({
                  type: 'quote',
                  symbol: quote.symbol,
                  price: quote.price,
                  bid: quote.bid,
                  ask: quote.ask,
                  volume: quote.volume,
                  timestamp: new Date().toISOString(),
                  source: quote.source,
                }));
              } catch {
                this.clients.delete(clientId);
              }
            }
          }
        }
      } catch (err) {
        console.error('[WS] Fetch error:', err);
      }
    }, 500);

    this.healthCheckInterval = setInterval(() => {
      for (const [clientId, sub] of this.clients) {
        if (!sub.isAlive) {
          sub.ws.close();
          this.clients.delete(clientId);
          continue;
        }
        sub.isAlive = false;
        sub.ws.ping();
      }
    }, 30000);
  }

  stopBroadcast() {
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    this.broadcastInterval = null;
    this.healthCheckInterval = null;
  }
}

export async function registerLiveQuotesWs(app: FastifyInstance) {
  const server = new LiveQuoteServer(app);
  server.register();
  server.startBroadcast();
  process.on('SIGTERM', () => { server.stopBroadcast(); });
}
