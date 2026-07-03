import { OrderBookAggregator } from '@/services/microstructure/OrderBookAggregator';
import { AnomalyDetector } from '@/services/microstructure/AnomalyDetector';
import { OrderBook } from '@/services/microstructure/types';

describe('OrderBookAggregator', () => {
  let aggregator: OrderBookAggregator;

  beforeEach(() => {
    aggregator = new OrderBookAggregator([{ name: 'upstox' }]);
  });

  afterEach(async () => {
    await aggregator.disconnect();
  });

  describe('validateOrderBook', () => {
    it('should accept valid order book', () => {
      const validBook: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [
          { price: 100, quantity: 1000 },
          { price: 99.5, quantity: 2000 },
        ],
        ask: [
          { price: 100.5, quantity: 1500 },
          { price: 101, quantity: 2500 },
        ],
      };

      // Should not throw
      aggregator.updateOrderBook('INFY', validBook);
      expect(aggregator.getOrderBook('INFY')).toBeValidOrderBook();
    });

    it('should reject empty bids', () => {
      const invalidBook: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [],
        ask: [{ price: 100.5, quantity: 1500 }],
      };

      aggregator.updateOrderBook('INFY', invalidBook);
      expect(aggregator.getOrderBook('INFY')).toBeUndefined();
    });

    it('should reject non-monotonic bids', () => {
      const invalidBook: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [
          { price: 100, quantity: 1000 },
          { price: 100.5, quantity: 2000 }, // Should be descending!
        ],
        ask: [{ price: 101, quantity: 1500 }],
      };

      aggregator.updateOrderBook('INFY', invalidBook);
      expect(aggregator.getOrderBook('INFY')).toBeUndefined();
    });

    it('should reject bid >= ask', () => {
      const invalidBook: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [{ price: 100.5, quantity: 1000 }],
        ask: [{ price: 100, quantity: 1500 }],
      };

      aggregator.updateOrderBook('INFY', invalidBook);
      expect(aggregator.getOrderBook('INFY')).toBeUndefined();
    });

    it('should reject negative prices', () => {
      const invalidBook: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [{ price: -100, quantity: 1000 }],
        ask: [{ price: 100.5, quantity: 1500 }],
      };

      aggregator.updateOrderBook('INFY', invalidBook);
      expect(aggregator.getOrderBook('INFY')).toBeUndefined();
    });
  });

  describe('calculateSnapshot', () => {
    it('should calculate correct spread', () => {
      const book: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [{ price: 100, quantity: 1000 }],
        ask: [{ price: 100.5, quantity: 1000 }],
      };

      aggregator.updateOrderBook('INFY', book);
      const snapshot = aggregator.getSnapshot('INFY');

      expect(snapshot?.spread).toBe(0.5);
      expect(snapshot?.spreadPercent).toBeWithinRange(0.49, 0.51);
    });

    it('should calculate mid price correctly', () => {
      const book: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [{ price: 100, quantity: 1000 }],
        ask: [{ price: 102, quantity: 1000 }],
      };

      aggregator.updateOrderBook('INFY', book);
      const snapshot = aggregator.getSnapshot('INFY');

      expect(snapshot?.mid).toBe(101);
    });

    it('should calculate depth imbalance correctly', () => {
      const book: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [
          { price: 100, quantity: 8000 },
          { price: 99.5, quantity: 7000 },
        ],
        ask: [
          { price: 100.5, quantity: 2000 },
          { price: 101, quantity: 3000 },
        ],
      };

      aggregator.updateOrderBook('INFY', book);
      const snapshot = aggregator.getSnapshot('INFY');

      expect(snapshot?.depth10Imbalance).toBeGreaterThan(0); // bid side heavier
      expect(snapshot?.depth10Imbalance).toBeWithinRange(0.4, 0.6);
    });
  });

  describe('subscription management', () => {
    it('should subscribe to ticker', async () => {
      await aggregator.subscribe('INFY');
      expect(aggregator.getOrderBook('INFY')).toBeUndefined(); // no data yet
    });

    it('should unsubscribe from ticker', async () => {
      await aggregator.subscribe('INFY');
      const book: OrderBook = {
        ticker: 'INFY',
        timestamp: Date.now(),
        bid: [{ price: 100, quantity: 1000 }],
        ask: [{ price: 100.5, quantity: 1000 }],
      };
      aggregator.updateOrderBook('INFY', book);

      expect(aggregator.getOrderBook('INFY')).toBeDefined();

      await aggregator.unsubscribe('INFY');
      expect(aggregator.getOrderBook('INFY')).toBeUndefined();
    });
  });
});

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('detectVolumeSpike', () => {
    it('should detect 3σ volume spike', () => {
      const snapshots = Array.from({ length: 30 }, (_, i) => ({
        ticker: 'INFY',
        timestamp: 1000 + i * 100,
        bidPrice: 100,
        bidVolume: 1000,
        askPrice: 100.5,
        askVolume: 1000,
        spread: 0.5,
        spreadPercent: 0.5,
        mid: 100.25,
        depth10Imbalance: 0,
        totalBidVolume: 10000,
        totalAskVolume: 10000,
      }));

      // Process normal volumes
      snapshots.slice(0, 20).forEach(s => detector.processSnapshot(s));

      // Add spike
      const spiked = { ...snapshots[20], totalBidVolume: 50000, totalAskVolume: 50000 };
      const anomalies = detector.processSnapshot(spiked);

      const volumeSpike = anomalies.find(a => a.type === 'volume_spike');
      expect(volumeSpike).toBeDefined();
      expect(volumeSpike?.severity).toBe('high');
    });
  });

  describe('detectSpreadWidening', () => {
    it('should detect 3x spread widening', () => {
      const snapshots = Array.from({ length: 20 }, (_, i) => ({
        ticker: 'INFY',
        timestamp: 1000 + i * 100,
        bidPrice: 100,
        bidVolume: 1000,
        askPrice: 100.1,
        askVolume: 1000,
        spread: 0.1,
        spreadPercent: 0.1,
        mid: 100.05,
        depth10Imbalance: 0,
        totalBidVolume: 10000,
        totalAskVolume: 10000,
      }));

      snapshots.forEach(s => detector.processSnapshot(s));

      // Spike spread
      const spiked = { ...snapshots[0], askPrice: 100.4, spread: 0.4 };
      const anomalies = detector.processSnapshot(spiked);

      const spreadWiden = anomalies.find(a => a.type === 'spread_widening');
      expect(spreadWiden).toBeDefined();
    });
  });

  describe('detectFlashCrash', () => {
    it('should detect 5% move in 100ms', () => {
      const base = {
        ticker: 'INFY',
        timestamp: 1000,
        bidPrice: 100,
        bidVolume: 1000,
        askPrice: 100.5,
        askVolume: 1000,
        spread: 0.5,
        spreadPercent: 0.5,
        mid: 100.25,
        depth10Imbalance: 0,
        totalBidVolume: 10000,
        totalAskVolume: 10000,
      };

      detector.processSnapshot(base);

      // Flash crash
      const crashed = {
        ...base,
        timestamp: 1090, // 90ms later
        mid: 95.0, // 5.24% down — clearly beyond the 5% flash-crash threshold
        bidPrice: 95,
        askPrice: 95.5,
      };

      const anomalies = detector.processSnapshot(crashed);
      const flashCrash = anomalies.find(a => a.type === 'flash_crash');
      expect(flashCrash).toBeDefined();
      expect(flashCrash?.severity).toBe('critical');
    });
  });
});
