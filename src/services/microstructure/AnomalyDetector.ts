import { OrderBookSnapshot, Anomaly } from './types';

export class AnomalyDetector {
  private history: Map<string, OrderBookSnapshot[]> = new Map();
  private readonly maxHistorySize = 1000;
  private readonly volumeSpikeThreshold = 3; // 3σ
  private readonly spreadWideningThreshold = 3; // 3x median
  private readonly imbalanceThreshold = 0.4; // 70/30 ratio
  private readonly flashCrashThreshold = 0.05; // 5% in 100ms

  processSnapshot(snapshot: OrderBookSnapshot): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (!this.history.has(snapshot.ticker)) {
      this.history.set(snapshot.ticker, []);
    }

    const history = this.history.get(snapshot.ticker)!;
    history.push(snapshot);

    // Keep only last 1000 snapshots (max ~10 seconds at 100Hz)
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    // Run anomaly detectors
    anomalies.push(...this.detectVolumeSpike(snapshot, history));
    anomalies.push(...this.detectSpreadWidening(snapshot, history));
    anomalies.push(...this.detectFlashCrash(snapshot, history));
    anomalies.push(...this.detectOrderImbalance(snapshot));
    anomalies.push(...this.detectLiquidityCrisis(snapshot, history));

    return anomalies;
  }

  private detectVolumeSpike(snapshot: OrderBookSnapshot, history: OrderBookSnapshot[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (history.length < 20) return anomalies;

    const recentVolumes = history.slice(-20).map(s => s.totalBidVolume + s.totalAskVolume);
    const mean = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const variance = recentVolumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentVolumes.length;
    const stdDev = Math.sqrt(variance);

    const currentVolume = snapshot.totalBidVolume + snapshot.totalAskVolume;
    if (currentVolume > mean + this.volumeSpikeThreshold * stdDev) {
      anomalies.push({
        id: `${snapshot.ticker}-volume-spike-${snapshot.timestamp}`,
        ticker: snapshot.ticker,
        type: 'volume_spike',
        severity: 'high',
        timestamp: snapshot.timestamp,
        description: `Volume spike detected: ${currentVolume.toFixed(0)} vs avg ${mean.toFixed(0)}`,
        value: currentVolume,
        threshold: mean + this.volumeSpikeThreshold * stdDev,
        metadata: { mean, stdDev, zscore: (currentVolume - mean) / stdDev },
      });
    }

    return anomalies;
  }

  private detectSpreadWidening(snapshot: OrderBookSnapshot, history: OrderBookSnapshot[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (history.length < 2) return anomalies;

    const spreads = history.map(s => s.spread);
    const medianSpread = this.percentile(spreads, 50);

    if (snapshot.spread > medianSpread * this.spreadWideningThreshold) {
      anomalies.push({
        id: `${snapshot.ticker}-spread-widen-${snapshot.timestamp}`,
        ticker: snapshot.ticker,
        type: 'spread_widening',
        severity: 'medium',
        timestamp: snapshot.timestamp,
        description: `Spread widened: ${snapshot.spread.toFixed(2)} vs median ${medianSpread.toFixed(2)}`,
        value: snapshot.spread,
        threshold: medianSpread * this.spreadWideningThreshold,
        metadata: { medianSpread, ratio: snapshot.spread / medianSpread },
      });
    }

    return anomalies;
  }

  private detectFlashCrash(snapshot: OrderBookSnapshot, history: OrderBookSnapshot[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (history.length < 2) return anomalies;

    const previous = history[history.length - 2];
    const timeDelta = snapshot.timestamp - previous.timestamp;

    if (timeDelta < 100 && timeDelta > 0) {
      const priceChange = Math.abs((snapshot.mid - previous.mid) / previous.mid);

      if (priceChange > this.flashCrashThreshold) {
        anomalies.push({
          id: `${snapshot.ticker}-flash-crash-${snapshot.timestamp}`,
          ticker: snapshot.ticker,
          type: 'flash_crash',
          severity: 'critical',
          timestamp: snapshot.timestamp,
          description: `Flash crash detected: ${(priceChange * 100).toFixed(2)}% move in ${timeDelta}ms`,
          value: priceChange,
          threshold: this.flashCrashThreshold,
          metadata: { previousMid: previous.mid, currentMid: snapshot.mid, timeDelta },
        });
      }
    }

    return anomalies;
  }

  private detectOrderImbalance(snapshot: OrderBookSnapshot): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (Math.abs(snapshot.depth10Imbalance) > this.imbalanceThreshold) {
      const sideInBalance = snapshot.depth10Imbalance > 0 ? 'bid' : 'ask';
      anomalies.push({
        id: `${snapshot.ticker}-imbalance-${snapshot.timestamp}`,
        ticker: snapshot.ticker,
        type: 'order_imbalance',
        severity: 'medium',
        timestamp: snapshot.timestamp,
        description: `Order imbalance: ${sideInBalance} side dominated (${Math.abs(snapshot.depth10Imbalance * 100).toFixed(1)}%)`,
        value: Math.abs(snapshot.depth10Imbalance),
        threshold: this.imbalanceThreshold,
        metadata: { imbalance: snapshot.depth10Imbalance, dominantSide: sideInBalance },
      });
    }

    return anomalies;
  }

  private detectLiquidityCrisis(snapshot: OrderBookSnapshot, history: OrderBookSnapshot[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Liquidity crisis: very tight bid-ask spread combined with low volume
    const spreadPercent = snapshot.spreadPercent;
    const volume = snapshot.totalBidVolume + snapshot.totalAskVolume;

    if (history.length >= 10) {
      const recentVolumes = history.slice(-10).map(s => s.totalBidVolume + s.totalAskVolume);
      const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

      if (spreadPercent > 1.0 && volume < avgVolume * 0.5) {
        anomalies.push({
          id: `${snapshot.ticker}-liquidity-crisis-${snapshot.timestamp}`,
          ticker: snapshot.ticker,
          type: 'liquidity_crisis',
          severity: 'high',
          timestamp: snapshot.timestamp,
          description: `Liquidity crisis: wide spread (${spreadPercent.toFixed(2)}%) + low volume (${volume.toFixed(0)} vs avg ${avgVolume.toFixed(0)})`,
          value: spreadPercent,
          threshold: 1.0,
          metadata: { spread: snapshot.spread, volume, avgVolume, volumeRatio: volume / avgVolume },
        });
      }
    }

    return anomalies;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const sorted_ = [...sorted].sort((a, b) => a - b);
    const index = (p / 100) * (sorted_.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sorted_[lower];
    }

    return sorted_[lower] * (1 - weight) + sorted_[upper] * weight;
  }

  getHistory(ticker: string): OrderBookSnapshot[] {
    return this.history.get(ticker) || [];
  }

  clearHistory(ticker: string): void {
    this.history.delete(ticker);
  }
}
