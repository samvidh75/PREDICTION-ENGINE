import { EventEmitter } from 'events';
import { OrderBookSnapshot } from '../../services/microstructure/types';

/**
 * Minimal transport interface so the broadcaster works with `ws`,
 * socket.io, or a mock in tests without depending on either package.
 */
export interface BroadcastClient {
  id: string;
  send(payload: string): void;
  isOpen(): boolean;
}

export interface BroadcasterStats {
  clients: number;
  subscriptions: number;
  messagesSent: number;
  messagesDropped: number;
}

const MAX_CLIENTS = 10_000;
const MAX_SUBSCRIPTIONS_PER_CLIENT = 50;
const MAX_UPDATES_PER_SECOND_PER_TICKER = 1000;

/**
 * Fan-out layer between the OrderBookAggregator and websocket clients.
 * Per-ticker subscription rooms, per-ticker rate limiting, and dead-client
 * cleanup. Snapshots are serialized once per update, not per client.
 */
export class OrderBookBroadcaster extends EventEmitter {
  private clients = new Map<string, BroadcastClient>();
  private rooms = new Map<string, Set<string>>(); // ticker -> client ids
  private clientTickers = new Map<string, Set<string>>(); // client id -> tickers
  private tickerRate = new Map<string, { windowStart: number; count: number }>();
  private messagesSent = 0;
  private messagesDropped = 0;

  addClient(client: BroadcastClient): void {
    if (this.clients.size >= MAX_CLIENTS) {
      throw new Error(`OrderBookBroadcaster: client limit ${MAX_CLIENTS} reached`);
    }
    this.clients.set(client.id, client);
    this.clientTickers.set(client.id, new Set());
  }

  removeClient(clientId: string): void {
    const tickers = this.clientTickers.get(clientId);
    if (tickers) {
      for (const ticker of tickers) {
        const room = this.rooms.get(ticker);
        room?.delete(clientId);
        if (room && room.size === 0) {
          this.rooms.delete(ticker);
          this.emit('roomEmpty', ticker); // caller can unsubscribe from provider
        }
      }
    }
    this.clients.delete(clientId);
    this.clientTickers.delete(clientId);
  }

  subscribe(clientId: string, ticker: string): void {
    const client = this.clients.get(clientId);
    if (!client) throw new Error(`OrderBookBroadcaster: unknown client ${clientId}`);
    const tickers = this.clientTickers.get(clientId)!;
    if (tickers.size >= MAX_SUBSCRIPTIONS_PER_CLIENT && !tickers.has(ticker)) {
      throw new Error(`OrderBookBroadcaster: subscription limit ${MAX_SUBSCRIPTIONS_PER_CLIENT} reached`);
    }
    tickers.add(ticker);
    let room = this.rooms.get(ticker);
    if (!room) {
      room = new Set();
      this.rooms.set(ticker, room);
      this.emit('roomCreated', ticker); // caller can subscribe at provider
    }
    room.add(clientId);
  }

  unsubscribe(clientId: string, ticker: string): void {
    this.clientTickers.get(clientId)?.delete(ticker);
    const room = this.rooms.get(ticker);
    room?.delete(clientId);
    if (room && room.size === 0) {
      this.rooms.delete(ticker);
      this.emit('roomEmpty', ticker);
    }
  }

  /**
   * Broadcast a snapshot to every subscriber of its ticker.
   * Dead clients are pruned; per-ticker rate limiting drops excess updates.
   */
  broadcast(snapshot: OrderBookSnapshot): void {
    const room = this.rooms.get(snapshot.ticker);
    if (!room || room.size === 0) return;

    if (!this.allowUpdate(snapshot.ticker)) {
      this.messagesDropped += room.size;
      return;
    }

    const payload = JSON.stringify({ type: 'orderbook', data: snapshot });
    const dead: string[] = [];
    for (const clientId of room) {
      const client = this.clients.get(clientId);
      if (!client || !client.isOpen()) {
        dead.push(clientId);
        continue;
      }
      try {
        client.send(payload);
        this.messagesSent++;
      } catch {
        dead.push(clientId);
      }
    }
    for (const id of dead) this.removeClient(id);
  }

  stats(): BroadcasterStats {
    let subscriptions = 0;
    for (const tickers of this.clientTickers.values()) subscriptions += tickers.size;
    return {
      clients: this.clients.size,
      subscriptions,
      messagesSent: this.messagesSent,
      messagesDropped: this.messagesDropped,
    };
  }

  private allowUpdate(ticker: string): boolean {
    const now = Date.now();
    const rate = this.tickerRate.get(ticker);
    if (!rate || now - rate.windowStart >= 1000) {
      this.tickerRate.set(ticker, { windowStart: now, count: 1 });
      return true;
    }
    if (rate.count >= MAX_UPDATES_PER_SECOND_PER_TICKER) return false;
    rate.count++;
    return true;
  }
}
