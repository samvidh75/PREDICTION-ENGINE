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
import { MarketMicrostructureEngine } from '../../services/market/MarketMicrostructureEngine.js';

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
  private microstructure = new MarketMicrostructureEngine();
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

    this.app.get('/api/market/orderbook/L2/:symbol', async (request, reply) => {
      const symbol = String((request.params as { symbol: string }).symbol ?? '').trim().toUpperCase();
      if (!symbol) {
        return reply.status(400).send({ error: 'Symbol is required' });
      }

      await this.ensureQuoteForSymbol(symbol);
      const orderBook = this.microstructure.buildOrderBook(symbol);
      if (!orderBook) {
        return reply.status(404).send({
          error: 'No live quote available for symbol',
          symbol,
          depthMode: 'derived_from_top_of_book',
        });
      }
      return orderBook;
    });

    this.app.get('/api/market/microstructure/:symbol/anomaly', async (request, reply) => {
      const symbol = String((request.params as { symbol: string }).symbol ?? '').trim().toUpperCase();
      if (!symbol) {
        return reply.status(400).send({ error: 'Symbol is required' });
      }

      await this.ensureQuoteForSymbol(symbol);
      return this.microstructure.buildAnomalySignal(symbol);
    });
  }

  private handleNewConnection(ws: WebSocket, _req: FastifyRequest) {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const subscription: ClientSubscription = { ws, symbols: new Set(), isAlive: true };
    this.clients.set(clientId, subscription);

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
      for (const sym of subscription.symbols) {
        const cached = this.quoteCache.get(sym);
        if (cached) subscription.ws.send(JSON.stringify(cached));
      }
    } else if (msg.type === 'unsubscribe' && Array.isArray(msg.symbols)) {
      for (const sym of msg.symbols) subscription.symbols.delete(sym.toUpperCase());
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
          this.microstructure.recordQuote(quote, update.lastUpdated);
        }

        const serializedQuotes = quotes.map((q, i) => {
          const upd = this.quoteCache.get(q.symbol);
          return JSON.stringify({
            type: 'quote',
            symbol: q.symbol,
            price: q.price,
            bid: q.bid,
            ask: q.ask,
            volume: q.volume,
            timestamp: upd?.timestamp ?? new Date().toISOString(),
            source: (q as any).source ?? 'yahoo',
          });
        });

        for (const [clientId, sub] of this.clients) {
          if (!sub.isAlive || sub.symbols.size === 0) continue;
          for (let i = 0; i < quotes.length; i++) {
            if (sub.symbols.has(quotes[i].symbol)) {
              try {
                sub.ws.send(serializedQuotes[i]);
              } catch (err) {
                console.error(`[WS] Send failed (${clientId}):`, err);
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

  private async ensureQuoteForSymbol(symbol: string): Promise<void> {
    if (this.quoteCache.has(symbol)) return;
    const [quote] = await this.provider.fetchQuotes([symbol]);
    if (!quote) return;

    const update: QuoteUpdate = {
      symbol: quote.symbol,
      price: quote.price,
      bid: quote.bid,
      ask: quote.ask,
      volume: quote.volume,
      timestamp: new Date().toISOString(),
      lastUpdated: Date.now(),
    };
    this.quoteCache.set(symbol, update);
    this.microstructure.recordQuote(quote, update.lastUpdated);
  }
}

export async function registerLiveQuotesWs(app: FastifyInstance) {
  const server = new LiveQuoteServer(app);
  server.register();
  server.startBroadcast();
  process.on('SIGTERM', () => {
    server.stopBroadcast();
  });
}
