/**
 * WebSocket Live Quotes Route
 *
 * Endpoint: ws://api.stockstory-india.com/api/quotes/ws
 * Protocol: JSON messages every 100-500ms per symbol
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { fetchLiveQuoteNSE, fetchLiveQuoteGroww } from '../../data/liveQuoteProviders';

interface QuoteSubscription {
  ws: any;
  symbols: Set<string>;
  isAlive: boolean;
}

const subscriptions: Map<string, QuoteSubscription> = new Map();

export async function registerLiveQuotesRoute(app: FastifyInstance) {
  await app.register(fastifyWebsocket);

  app.get(
    '/api/quotes/ws',
    { websocket: true },
    async (socket: any, request: FastifyRequest) => {
      const clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
      const initialSymbols = ((request.query as any).symbols || '').split(',').filter(Boolean);

      const subscription: QuoteSubscription = {
        ws: socket,
        symbols: new Set(initialSymbols),
        isAlive: true
      };

      subscriptions.set(clientId, subscription);


      socket.on('message', (message: string) => {
        try {
          const msg = JSON.parse(message);

          if (msg.type === 'subscribe') {
            subscription.symbols.add(msg.symbol);
          } else if (msg.type === 'unsubscribe') {
            subscription.symbols.delete(msg.symbol);
          }
        } catch (err) {
          console.error(`Parse error for ${clientId}:`, err);
        }
      });

      socket.on('pong', () => {
        subscription.isAlive = true;
      });

      socket.on('close', () => {
        subscriptions.delete(clientId);
      });
    }
  );

  startQuoteBroadcaster();
}

async function startQuoteBroadcaster() {
  const broadcastInterval = 500;

  setInterval(async () => {
    const allSymbols = new Set<string>();

    for (const sub of subscriptions.values()) {
      sub.symbols.forEach(sym => allSymbols.add(sym));
    }

    if (allSymbols.size === 0) return;

    const quotes = await Promise.all(
      Array.from(allSymbols).map(async (symbol) => {
        try {
          let quote = await fetchLiveQuoteNSE(symbol);
          if (!quote) {
            quote = await fetchLiveQuoteGroww(symbol);
          }
          return quote;
        } catch (err) {
          console.error(`Quote fetch failed for ${symbol}:`, err);
          return null;
        }
      })
    );

    for (const [clientId, subscription] of subscriptions) {
      if (!subscription.isAlive) {
        subscription.ws.close();
        subscriptions.delete(clientId);
        continue;
      }

      subscription.ws.ping();
      subscription.isAlive = false;

      for (const quote of quotes) {
        if (quote && subscription.symbols.has(quote.symbol)) {
          try {
            subscription.ws.send(JSON.stringify({
              type: 'quote',
              ...quote,
              timestamp: Date.now()
            }));
          } catch (err) {
            console.error(`Send failed for ${clientId}:`, err);
          }
        }
      }
    }
  }, broadcastInterval);

}
