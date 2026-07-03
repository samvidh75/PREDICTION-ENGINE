import type { Quote } from '../../backend/routes/liveQuoteProviders.js';

export interface MarketDepthLevel {
  level: number;
  side: 'bid' | 'ask';
  price: number;
  size: number;
  notional: number;
}

export interface MarketMicrostructureOrderBook {
  symbol: string;
  depthMode: 'derived_from_top_of_book';
  generatedAt: string;
  midPrice: number;
  spread: number;
  spreadBps: number;
  pressureScore: number;
  imbalanceRatio: number;
  bidLevels: MarketDepthLevel[];
  askLevels: MarketDepthLevel[];
}

export interface MarketMicrostructureAnomaly {
  symbol: string;
  generatedAt: string;
  availability: 'real' | 'partial' | 'unavailable';
  sampleSize: number;
  latestPrice: number | null;
  spreadBps: number | null;
  realizedVolatilityBps: number | null;
  pressureScore: number | null;
  volumeZScore: number | null;
  anomalyScore: number | null;
  flags: string[];
}

interface QuoteObservation {
  quote: Quote;
  observedAt: number;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class MarketMicrostructureEngine {
  private history = new Map<string, QuoteObservation[]>();

  constructor(private readonly maxHistory = 120) {}

  recordQuote(quote: Quote, observedAt = Date.now()): void {
    const symbol = quote.symbol.toUpperCase();
    const next: QuoteObservation = {
      quote: { ...quote, symbol },
      observedAt,
    };
    const history = this.history.get(symbol) ?? [];
    history.push(next);
    if (history.length > this.maxHistory) {
      history.splice(0, history.length - this.maxHistory);
    }
    this.history.set(symbol, history);
  }

  getLatestQuote(symbol: string): Quote | null {
    const history = this.history.get(symbol.toUpperCase());
    return history?.[history.length - 1]?.quote ?? null;
  }

  buildOrderBook(symbol: string): MarketMicrostructureOrderBook | null {
    const latest = this.getLatestQuote(symbol);
    if (!latest) return null;

    const bid = latest.bid > 0 ? latest.bid : latest.price * 0.999;
    const ask = latest.ask > 0 ? latest.ask : latest.price * 1.001;
    const spread = Math.max(ask - bid, 0.01);
    const midPrice = round((bid + ask) / 2, 4);
    const spreadBps = round((spread / midPrice) * 10_000, 2);
    const baseSize = Math.max(Math.round((latest.volume || 0) / 250), 50);
    const pressureScore = round(clamp(((latest.price - midPrice) / spread) * 2, -1, 1), 4);

    const bidLevels: MarketDepthLevel[] = [];
    const askLevels: MarketDepthLevel[] = [];

    for (let level = 1; level <= 5; level++) {
      const distance = spread * 0.5 * level;
      const bidSize = Math.max(Math.round(baseSize * (1.12 - level * 0.08) * (1 + Math.max(pressureScore, 0))), 25);
      const askSize = Math.max(Math.round(baseSize * (1.12 - level * 0.08) * (1 + Math.max(-pressureScore, 0))), 25);
      const bidPrice = round(bid - distance, 2);
      const askPrice = round(ask + distance, 2);
      bidLevels.push({
        level,
        side: 'bid',
        price: bidPrice,
        size: bidSize,
        notional: round(bidPrice * bidSize, 2),
      });
      askLevels.push({
        level,
        side: 'ask',
        price: askPrice,
        size: askSize,
        notional: round(askPrice * askSize, 2),
      });
    }

    const bidDepth = bidLevels.reduce((sum, level) => sum + level.size, 0);
    const askDepth = askLevels.reduce((sum, level) => sum + level.size, 0);
    const imbalanceRatio = round((bidDepth - askDepth) / Math.max(bidDepth + askDepth, 1), 4);

    return {
      symbol: latest.symbol,
      depthMode: 'derived_from_top_of_book',
      generatedAt: new Date(latest.timestamp).toISOString(),
      midPrice,
      spread: round(spread, 4),
      spreadBps,
      pressureScore,
      imbalanceRatio,
      bidLevels,
      askLevels,
    };
  }

  buildAnomalySignal(symbol: string): MarketMicrostructureAnomaly {
    const normalized = symbol.toUpperCase();
    const history = this.history.get(normalized) ?? [];
    const latest = history[history.length - 1]?.quote ?? null;

    if (!latest) {
      return {
        symbol: normalized,
        generatedAt: new Date().toISOString(),
        availability: 'unavailable',
        sampleSize: 0,
        latestPrice: null,
        spreadBps: null,
        realizedVolatilityBps: null,
        pressureScore: null,
        volumeZScore: null,
        anomalyScore: null,
        flags: ['quote_history_unavailable'],
      };
    }

    const orderBook = this.buildOrderBook(normalized);
    const spreads = history.map((entry) => {
      const mid = (entry.quote.bid + entry.quote.ask) / 2 || entry.quote.price || 1;
      return ((entry.quote.ask - entry.quote.bid) / mid) * 10_000;
    });
    const returns = history.slice(1).map((entry, index) => {
      const prev = history[index].quote.price || 1;
      return ((entry.quote.price - prev) / prev) * 10_000;
    });
    const volumes = history.map((entry) => entry.quote.volume || 0);

    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
    const std = (values: number[]) => {
      if (values.length <= 1) return 0;
      const mean = avg(values);
      return Math.sqrt(avg(values.map((value) => (value - mean) ** 2)));
    };

    const spreadMean = avg(spreads);
    const spreadStd = std(spreads);
    const returnStd = std(returns);
    const volumeMean = avg(volumes);
    const volumeStd = std(volumes);
    const volumeZScore = volumeStd === 0 ? 0 : ((latest.volume || 0) - volumeMean) / volumeStd;
    const pressureScore = orderBook?.pressureScore ?? 0;
    const latestSpreadBps = orderBook?.spreadBps ?? null;

    const spreadDislocation = latestSpreadBps === null || spreadStd === 0 ? 0 : (latestSpreadBps - spreadMean) / spreadStd;
    const anomalyScore = round(
      clamp(
        Math.abs(spreadDislocation) * 0.45 +
        Math.abs(volumeZScore) * 0.25 +
        Math.abs(pressureScore) * 1.8 +
        Math.abs(returnStd / 25) * 0.3,
        0,
        10,
      ),
      2,
    );

    const flags: string[] = [];
    if ((latestSpreadBps ?? 0) >= 35) flags.push('wide_spread');
    if (Math.abs(volumeZScore) >= 2) flags.push('abnormal_volume');
    if (Math.abs(pressureScore) >= 0.65) flags.push(pressureScore > 0 ? 'buy_pressure' : 'sell_pressure');
    if (returnStd >= 45) flags.push('elevated_short_horizon_volatility');
    if (history.length < 10) flags.push('limited_history');

    return {
      symbol: normalized,
      generatedAt: new Date(latest.timestamp).toISOString(),
      availability: history.length >= 10 ? 'real' : 'partial',
      sampleSize: history.length,
      latestPrice: latest.price,
      spreadBps: latestSpreadBps,
      realizedVolatilityBps: round(returnStd, 2),
      pressureScore,
      volumeZScore: round(volumeZScore, 2),
      anomalyScore,
      flags,
    };
  }
}
