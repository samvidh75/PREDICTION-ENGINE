import { EventEmitter } from 'events';
import { OrderBook, OrderBookSnapshot, ProviderConfig } from './types';

export class OrderBookAggregator extends EventEmitter {
  private orderBooks: Map<string, OrderBook> = new Map();
  private snapshots: Map<string, OrderBookSnapshot> = new Map();
  private providerClients: Map<string, any> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // ticker -> providers
  private updateCallbacks: Map<string, Function[]> = new Map();

  constructor(private config: ProviderConfig[]) {
    super();
    this.initializeProviders();
  }

  private initializeProviders() {
    for (const providerConfig of this.config) {
      // Initialize provider-specific clients here
      // This is a placeholder for actual provider integration (Upstox, Shoonya, etc.)
      this.providerClients.set(providerConfig.name, {
        config: providerConfig,
        connected: false,
        reconnecting: false,
      });
    }
  }

  async subscribe(ticker: string, providers?: string[]): Promise<void> {
    const targetProviders = providers || this.config.map(c => c.name);

    if (!this.subscriptions.has(ticker)) {
      this.subscriptions.set(ticker, new Set());
      this.updateCallbacks.set(ticker, []);
    }

    for (const provider of targetProviders) {
      const client = this.providerClients.get(provider);
      if (client) {
        this.subscriptions.get(ticker)!.add(provider);
        // In real implementation: await client.subscribe(ticker);
      }
    }
  }

  async unsubscribe(ticker: string): Promise<void> {
    const providers = this.subscriptions.get(ticker);
    if (providers) {
      for (const provider of providers) {
        const client = this.providerClients.get(provider);
        if (client) {
          // In real implementation: await client.unsubscribe(ticker);
        }
      }
    }
    this.subscriptions.delete(ticker);
    this.updateCallbacks.delete(ticker);
    this.orderBooks.delete(ticker);
    this.snapshots.delete(ticker);
  }

  updateOrderBook(ticker: string, orderBook: OrderBook): void {
    const startTime = Date.now();

    // Validate order book
    if (!this.validateOrderBook(orderBook)) {
      // Not 'error': Node throws on unhandled 'error' events, and a bad book
      // from one provider must never crash the aggregator.
      this.emit('invalidBook', { ticker, reason: 'invalid_order_book' });
      return;
    }

    this.orderBooks.set(ticker, orderBook);
    const snapshot = this.calculateSnapshot(orderBook);
    this.snapshots.set(ticker, snapshot);

    // Detect anomalies
    const anomalies = this.detectAnomalies(snapshot);
    if (anomalies.length > 0) {
      this.emit('anomalies', { ticker, anomalies });
    }

    // Invoke update callbacks
    const callbacks = this.updateCallbacks.get(ticker) || [];
    const latency = Date.now() - startTime;
    for (const callback of callbacks) {
      callback(snapshot, latency);
    }

    this.emit('update', { ticker, snapshot, latency });
  }

  private validateOrderBook(orderBook: OrderBook): boolean {
    if (!orderBook.bid || !orderBook.ask || orderBook.bid.length === 0 || orderBook.ask.length === 0) {
      return false;
    }

    // Check that bid prices are strictly descending and ask prices are strictly ascending
    for (let i = 1; i < orderBook.bid.length; i++) {
      if (orderBook.bid[i].price >= orderBook.bid[i - 1].price) {
        return false;
      }
    }

    for (let i = 1; i < orderBook.ask.length; i++) {
      if (orderBook.ask[i].price <= orderBook.ask[i - 1].price) {
        return false;
      }
    }

    // Check that best bid < best ask
    if (orderBook.bid[0].price >= orderBook.ask[0].price) {
      return false;
    }

    // Check that all prices and quantities are positive
    for (const level of [...orderBook.bid, ...orderBook.ask]) {
      if (level.price <= 0 || level.quantity < 0) {
        return false;
      }
    }

    return true;
  }

  private calculateSnapshot(orderBook: OrderBook): OrderBookSnapshot {
    const bestBid = orderBook.bid[0];
    const bestAsk = orderBook.ask[0];

    const spread = bestAsk.price - bestBid.price;
    const mid = (bestBid.price + bestAsk.price) / 2;
    const spreadPercent = (spread / mid) * 100;

    // Calculate depth imbalance (top 10 levels)
    const bidVolume = orderBook.bid.slice(0, 10).reduce((sum, level) => sum + level.quantity, 0);
    const askVolume = orderBook.ask.slice(0, 10).reduce((sum, level) => sum + level.quantity, 0);
    const totalBidVolume = orderBook.bid.reduce((sum, level) => sum + level.quantity, 0);
    const totalAskVolume = orderBook.ask.reduce((sum, level) => sum + level.quantity, 0);

    const depth10Imbalance = (bidVolume - askVolume) / (bidVolume + askVolume);

    return {
      ticker: orderBook.ticker,
      timestamp: orderBook.timestamp,
      bidPrice: bestBid.price,
      bidVolume: bestBid.quantity,
      askPrice: bestAsk.price,
      askVolume: bestAsk.quantity,
      spread,
      spreadPercent,
      mid,
      depth10Imbalance,
      totalBidVolume,
      totalAskVolume,
    };
  }

  private detectAnomalies(snapshot: OrderBookSnapshot) {
    const anomalies = [];

    // Anomaly 1: Spread widening (> 3x median spread)
    const previousSnapshot = this.snapshots.get(snapshot.ticker);
    if (previousSnapshot && snapshot.spread > previousSnapshot.spread * 3) {
      anomalies.push({
        type: 'spread_widening',
        severity: 'high',
        value: snapshot.spread,
        threshold: previousSnapshot.spread * 3,
      });
    }

    // Anomaly 2: Extreme order imbalance (> 70/30 ratio)
    const ratio = Math.abs(snapshot.depth10Imbalance);
    if (ratio > 0.4) {
      anomalies.push({
        type: 'order_imbalance',
        severity: 'medium',
        value: ratio,
        threshold: 0.4,
      });
    }

    // Anomaly 3: Very wide spread (> 0.5% for liquid stocks)
    if (snapshot.spreadPercent > 0.5) {
      anomalies.push({
        type: 'liquidity_crisis',
        severity: 'medium',
        value: snapshot.spreadPercent,
        threshold: 0.5,
      });
    }

    return anomalies;
  }

  getOrderBook(ticker: string): OrderBook | undefined {
    return this.orderBooks.get(ticker);
  }

  getSnapshot(ticker: string): OrderBookSnapshot | undefined {
    return this.snapshots.get(ticker);
  }

  onUpdate(ticker: string, callback: Function): void {
    if (!this.updateCallbacks.has(ticker)) {
      this.updateCallbacks.set(ticker, []);
    }
    this.updateCallbacks.get(ticker)!.push(callback);
  }

  async disconnect(): Promise<void> {
    // In real implementation: disconnect each provider client here.
    this.orderBooks.clear();
    this.snapshots.clear();
    this.subscriptions.clear();
    this.updateCallbacks.clear();
  }
}
