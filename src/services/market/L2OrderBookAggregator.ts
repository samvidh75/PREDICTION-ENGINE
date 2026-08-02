export interface L2OrderBookLevel {
  price: number;
  size: number;
  orderCount: number;
  exchange: string;
}

export interface L2OrderBookSnapshot {
  symbol: string;
  timestamp: string;
  bids: L2OrderBookLevel[];
  asks: L2OrderBookLevel[];
  bidTotals: number;
  askTotals: number;
  spread: number;
  spreadBps: number;
  midPrice: number;
  imbalance: number;
}

export interface L2OrderBookUpdate {
  symbol: string;
  side: 'bid' | 'ask';
  price: number;
  size: number;
  exchange: string;
  timestamp: string;
}

export interface OrderBookMetrics {
  weightedMidPrice: number;
  microPrice: number;
  marketPressure: number;
  depthRatio: number;
  bidAskConcentration: number;
  liquidityScore: number;
}

export class L2OrderBookAggregator {
  private orderBooks = new Map<string, L2OrderBookSnapshot>();

  private readonly exchanges = ['PSE', 'PSE'];

  applyUpdate(update: L2OrderBookUpdate): void {
    const current = this.orderBooks.get(update.symbol);
    if (!current) {
      this.initializeBook(update.symbol, update);
      return;
    }
    this.updateBookLevel(current, update);
  }

  getSnapshot(symbol: string): L2OrderBookSnapshot | null {
    return this.orderBooks.get(symbol.toUpperCase()) ?? null;
  }

  computeMetrics(symbol: string): OrderBookMetrics | null {
    const book = this.orderBooks.get(symbol.toUpperCase());
    if (!book || book.bids.length === 0 || book.asks.length === 0) return null;

    const bestBid = book.bids[0].price;
    const bestAsk = book.asks[0].price;
    const bidSize = book.bids[0].size;
    const askSize = book.asks[0].size;

    const weightedMidPrice = (bestBid * askSize + bestAsk * bidSize) / (bidSize + askSize);

    const top5BidValue = book.bids.slice(0, 5).reduce((s, l) => s + l.price * l.size, 0);
    const top5AskValue = book.asks.slice(0, 5).reduce((s, l) => s + l.price * l.size, 0);
    const microPrice = (top5BidValue + top5AskValue) / (book.bids.slice(0, 5).reduce((s, l) => s + l.size, 0) + book.asks.slice(0, 5).reduce((s, l) => s + l.size, 0));

    const totalBidSize = book.bidTotals;
    const totalAskSize = book.askTotals;
    const marketPressure = totalBidSize > 0 && totalAskSize > 0
      ? (totalBidSize - totalAskSize) / (totalBidSize + totalAskSize)
      : 0;

    const depthRatio = totalBidSize > 0
      ? totalAskSize / totalBidSize
      : 1;

    const topBidConcentration = book.bids.length > 0
      ? book.bids[0].size / totalBidSize
      : 0;
    const topAskConcentration = book.asks.length > 0
      ? book.asks[0].size / totalAskSize
      : 0;
    const bidAskConcentration = (topBidConcentration + topAskConcentration) / 2;

    const liquidityScore = Math.min(
      (totalBidSize + totalAskSize) / 100000,
      1,
    );

    return {
      weightedMidPrice,
      microPrice,
      marketPressure,
      depthRatio,
      bidAskConcentration,
      liquidityScore,
    };
  }

  private initializeBook(symbol: string, update: L2OrderBookUpdate): void {
    const snapshot: L2OrderBookSnapshot = {
      symbol: symbol.toUpperCase(),
      timestamp: update.timestamp,
      bids: update.side === 'bid' ? [this.levelFromUpdate(update)] : [],
      asks: update.side === 'ask' ? [this.levelFromUpdate(update)] : [],
      bidTotals: update.side === 'bid' ? update.size : 0,
      askTotals: update.side === 'ask' ? update.size : 0,
      spread: 0,
      spreadBps: 0,
      midPrice: 0,
      imbalance: 0,
    };

    if (snapshot.bids.length > 0 && snapshot.asks.length > 0) {
      this.recalculate(snapshot);
    }

    this.orderBooks.set(snapshot.symbol, snapshot);
  }

  private updateBookLevel(book: L2OrderBookSnapshot, update: L2OrderBookUpdate): void {
    const levels = update.side === 'bid' ? book.bids : book.asks;
    const existingIdx = levels.findIndex(
      l => l.price === update.price && l.exchange === update.exchange,
    );

    if (update.size === 0) {
      if (existingIdx >= 0) levels.splice(existingIdx, 1);
    } else if (existingIdx >= 0) {
      levels[existingIdx] = this.levelFromUpdate(update);
    } else {
      levels.push(this.levelFromUpdate(update));
      levels.sort((a, b) => update.side === 'bid' ? b.price - a.price : a.price - b.price);
    }

    book.timestamp = update.timestamp;
    this.recalculate(book);
  }

  private recalculate(book: L2OrderBookSnapshot): void {
    book.bidTotals = book.bids.reduce((s, l) => s + l.size, 0);
    book.askTotals = book.asks.reduce((s, l) => s + l.size, 0);

    if (book.bids.length > 0 && book.asks.length > 0) {
      const bestBid = book.bids[0].price;
      const bestAsk = book.asks[0].price;
      book.spread = bestAsk - bestBid;
      book.midPrice = (bestBid + bestAsk) / 2;
      book.spreadBps = book.midPrice > 0
        ? (book.spread / book.midPrice) * 10000
        : 0;
    }

    const totalDepth = book.bidTotals + book.askTotals;
    book.imbalance = totalDepth > 0
      ? (book.bidTotals - book.askTotals) / totalDepth
      : 0;
  }

  private levelFromUpdate(update: L2OrderBookUpdate): L2OrderBookLevel {
    return {
      price: update.price,
      size: update.size,
      orderCount: 1,
      exchange: update.exchange,
    };
  }

  clear(symbol?: string): void {
    if (symbol) {
      this.orderBooks.delete(symbol.toUpperCase());
    } else {
      this.orderBooks.clear();
    }
  }
}

export const l2OrderBookAggregator = new L2OrderBookAggregator();
