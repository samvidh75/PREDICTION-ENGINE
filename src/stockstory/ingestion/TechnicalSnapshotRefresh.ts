/**
 * Technical Snapshot Refresh
 *
 * Maintains technical indicators and momentum inputs for the
 * intelligence engine. Uses existing price/candle sources.
 * Does NOT require live technical calculations at boot.
 * Validates minimum candle count before computing indicators.
 */

import type { JobOptions, JobResult, IngestionJob } from './IngestionTypes';
import { safeDbValue } from './IngestionTypes';

export interface PriceCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceProvider {
  name: string;
  fetchPrices(symbol: string, fromDate: string, toDate: string): Promise<PriceCandle[]>;
  available(): boolean;
}

export interface TechnicalSnapshotFields {
  lastPrice: number | null;
  change1d: number | null;
  momentum1m: number | null;
  momentum3m: number | null;
  momentum6m: number | null;
  volatility30d: number | null;
  drawdownFromHigh: number | null;
  volumeTrend: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  atr14: number | null;
  adx14: number | null;
  priceVs52wHigh: number | null;
  priceVs200Dma: number | null;
}

export class TechnicalSnapshotRefresh implements IngestionJob {
  readonly name = 'refresh-technicals';

  private priceProvider: PriceProvider;
  /** Minimum candles required to compute indicators */
  private readonly MIN_CANDLES = 20;

  constructor(priceProvider: PriceProvider) {
    this.priceProvider = priceProvider;
  }

  async run(options: JobOptions): Promise<JobResult> {
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    const symbols = options.symbols ?? [];
    const limit = options.limit ?? symbols.length;

    if (!this.priceProvider.available()) {
      return { success: true, jobName: this.name, startedAt, endedAt: new Date().toISOString(),
        durationMs: 0, symbolsProcessed: 0, successCount: 0, failureCount: 0, errors: [] };
    }

    const toProcess = symbols.slice(0, limit);

    for (const symbol of toProcess) {
      try {
        const technicals = await this.computeTechnicals(symbol);
        if (!options.dryRun && technicals) {
          await this.persistSnapshot(symbol, technicals);
        }
        successCount++;
      } catch (err) {
        failureCount++;
        errors.push(`${symbol}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const endedAt = new Date().toISOString();
    return {
      success: errors.length === 0,
      jobName: this.name,
      startedAt,
      endedAt,
      durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
      symbolsProcessed: toProcess.length,
      successCount,
      failureCount,
      errors,
    };
  }

  async computeTechnicals(symbol: string): Promise<TechnicalSnapshotFields | null> {
    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - 400 * 86400000).toISOString().slice(0, 10);

    const candles = await this.priceProvider.fetchPrices(symbol, fromDate, toDate);
    if (candles.length < this.MIN_CANDLES) {
      // Insufficient data — store nulls
      return this.emptyResult();
    }

    const closes = candles.map((c) => c.close);
    const lastPrice = closes[closes.length - 1];
    const high52w = Math.max(...candles.slice(-252).map((c) => c.high));
    const dma200 = this.sma(closes, Math.min(200, closes.length));

    return {
      lastPrice: safeDbValue(lastPrice),
      change1d: closes.length >= 2 ? safeDbValue(((closes[closes.length - 1] / closes[closes.length - 2]) - 1) * 100) : null,
      momentum1m: this.periodReturn(closes, 21),
      momentum3m: this.periodReturn(closes, 63),
      momentum6m: this.periodReturn(closes, 126),
      volatility30d: this.volatility(closes, 30),
      drawdownFromHigh: safeDbValue(((lastPrice / Math.max(...candles.slice(-63).map((c) => c.high))) - 1) * 100),
      volumeTrend: this.volumeTrend(candles),
      rsi14: this.rsi(closes, 14),
      macd: safeDbValue(this.macdLine(closes) - this.macdSignal(closes)),
      macdSignal: safeDbValue(this.macdSignal(closes)),
      atr14: safeDbValue(this.atr(candles, 14)),
      adx14: safeDbValue(this.adx(candles, 14)),
      priceVs52wHigh: safeDbValue(lastPrice && high52w ? ((lastPrice / high52w) - 1) * 100 : null),
      priceVs200Dma: safeDbValue(lastPrice && dma200 ? ((lastPrice / dma200) - 1) * 100 : null),
    };
  }

  /** Returns all-null result when insufficient data */
  private emptyResult(): TechnicalSnapshotFields {
    return {
      lastPrice: null, change1d: null, momentum1m: null, momentum3m: null,
      momentum6m: null, volatility30d: null, drawdownFromHigh: null,
      volumeTrend: null, rsi14: null, macd: null, macdSignal: null,
      atr14: null, adx14: null, priceVs52wHigh: null, priceVs200Dma: null,
    };
  }

  // ── Technical Indicator Utilities ──

  private sma(values: number[], period: number): number | null {
    if (values.length < period) return null;
    const slice = values.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private periodReturn(closes: number[], days: number): number | null {
    if (closes.length < days + 1) return null;
    const start = closes[closes.length - 1 - days];
    return safeDbValue(((closes[closes.length - 1] / start) - 1) * 100);
  }

  private volatility(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;
    const returns: number[] = [];
    for (let i = closes.length - period; i < closes.length; i++) {
      returns.push((closes[i] / closes[i - 1]) - 1);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / returns.length;
    return safeDbValue(Math.sqrt(variance) * Math.sqrt(252) * 100);
  }

  private volumeTrend(candles: PriceCandle[]): number | null {
    if (candles.length < 42) return null;
    const recent = candles.slice(-21).reduce((a, c) => a + c.volume, 0) / 21;
    const older = candles.slice(-42, -21).reduce((a, c) => a + c.volume, 0) / 21;
    return older > 0 ? safeDbValue(((recent / older) - 1) * 100) : null;
  }

  private rsi(closes: number[], period: number): number | null {
    if (closes.length < period + 1) return null;
    const gains: number[] = [];
    const losses: number[] = [];
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? -diff : 0);
    }
    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return safeDbValue(100 - (100 / (1 + rs)));
  }

  private macdLine(closes: number[]): number | null {
    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);
    return ema12 !== null && ema26 !== null ? ema12 - ema26 : null;
  }

  private macdSignal(closes: number[]): number | null {
    // MACD signal is 9-day EMA of MACD line
    const macdVals: number[] = [];
    for (let i = 33; i < closes.length; i++) {
      const slice = closes.slice(i - 26, i);
      const ema12 = this.ema(slice, 12);
      const ema26 = this.ema(slice, 26);
      if (ema12 !== null && ema26 !== null) macdVals.push(ema12 - ema26);
    }
    return macdVals.length > 0 ? this.ema(macdVals, 9) : null;
  }

  private ema(values: number[], period: number): number | null {
    if (values.length < period) return null;
    const k = 2 / (period + 1);
    const sma = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let ema = sma;
    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private atr(candles: PriceCandle[], period: number): number | null {
    if (candles.length < period + 1) return null;
    const trs: number[] = [];
    for (let i = candles.length - period; i < candles.length; i++) {
      const prevClose = candles[i - 1].close;
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose),
      );
      trs.push(tr);
    }
    return trs.reduce((a, b) => a + b, 0) / period;
  }

  private adx(candles: PriceCandle[], period: number): number | null {
    if (candles.length < period * 2) return null;
    const dxs: number[] = [];
    for (let i = candles.length - period; i < candles.length; i++) {
      const prev = candles[i - 1];
      const curr = candles[i];
      const upMove = curr.high - prev.high;
      const downMove = prev.low - curr.low;
      const plusDm = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDm = downMove > upMove && downMove > 0 ? downMove : 0;
      const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
      if (tr === 0) continue;
      const plusDi = (plusDm / tr) * 100;
      const minusDi = (minusDm / tr) * 100;
      const diDiff = Math.abs(plusDi - minusDi);
      const diSum = plusDi + minusDi;
      dxs.push(diSum > 0 ? (diDiff / diSum) * 100 : 0);
    }
    return dxs.length >= period ? dxs.reduce((a, b) => a + b, 0) / dxs.length : null;
  }

  private async persistSnapshot(_symbol: string, _data: TechnicalSnapshotFields): Promise<void> {
    // NOTE: Actual DB persistence handled by calling script
  }
}
