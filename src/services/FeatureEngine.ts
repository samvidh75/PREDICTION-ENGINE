// src/services/FeatureEngine.ts
// Production-grade feature calculation engine with pure mathematical logic (no deep learning dependencies).

import { query } from "../db/index";

export interface StockFeatureSnapshot {
  symbol: string;
  tradeDate: string;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  adx: number | null;
  atr: number | null;
  bollingerWidth: number | null;
  momentum: number | null;
  volatility: number | null;
  relativeStrength: number | null;
  movingAverageDistance: number | null;
  trendStrength: number | null;
}

export class FeatureEngine {
  /**
   * Generates and stores feature snapshots for a given symbol.
   * Assumes historical price data is already stored in the daily_prices table.
   */
  async calculateAndStoreFeatures(symbol: string): Promise<StockFeatureSnapshot[]> {
    // 1. Fetch historical prices from DB ordered by trade_date ascending
    const priceRes = await query(
      `SELECT trade_date::text as date, open, high, low, close, volume
       FROM daily_prices
       WHERE symbol = $1
       ORDER BY trade_date ASC`,
      [symbol]
    );

    const rows = priceRes.rows;
    if (rows.length < 2) {
      console.warn(`⚠️ Insufficient data to calculate features for ${symbol} (found ${rows.length} rows)`);
      return [];
    }

    const n = rows.length;
    const dates = rows.map(r => r.date);
    const opens = rows.map(r => Number(r.open));
    const highs = rows.map(r => Number(r.high));
    const lows = rows.map(r => Number(r.low));
    const closes = rows.map(r => Number(r.close));
    const volumes = rows.map(r => Number(r.volume));

    // Initialize feature arrays
    const rsiArr = new Array(n).fill(null);
    const macdArr = new Array(n).fill(null);
    const macdSigArr = new Array(n).fill(null);
    const macdHistArr = new Array(n).fill(null);
    const adxArr = new Array(n).fill(null);
    const atrArr = new Array(n).fill(null);
    const bbWidthArr = new Array(n).fill(null);
    const momArr = new Array(n).fill(null);
    const volArr = new Array(n).fill(null);
    const relStrArr = new Array(n).fill(null);
    const maDistArr = new Array(n).fill(null);
    const trendStrArr = new Array(n).fill(null);

    // ── 1. Calculate RSI (14-period) ──────────────────────────────────
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i < n; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      if (i < 15) {
        avgGain += gain;
        avgLoss += loss;
        if (i === 14) {
          avgGain /= 14;
          avgLoss /= 14;
          rsiArr[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        }
      } else {
        avgGain = (avgGain * 13 + gain) / 14;
        avgLoss = (avgLoss * 13 + loss) / 14;
        rsiArr[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
    }

    // ── 2. Calculate MACD (12, 26, 9) ──────────────────────────────────
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      if (ema12[i] !== null && ema26[i] !== null) {
        macdLine[i] = ema12[i]! - ema26[i]!;
      }
    }
    const macdSignal = this.calculateEMA(macdLine.map(v => v ?? 0), 9);
    for (let i = 0; i < n; i++) {
      if (macdLine[i] !== null && macdSignal[i] !== null) {
        macdArr[i] = macdLine[i];
        macdSigArr[i] = macdSignal[i];
        macdHistArr[i] = macdLine[i]! - macdSignal[i]!;
      }
    }

    // ── 3. Calculate ATR (14-period) ──────────────────────────────────
    const tr = new Array(n).fill(0);
    tr[0] = highs[0] - lows[0];
    for (let i = 1; i < n; i++) {
      tr[i] = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
    }
    let sumTR = 0;
    for (let i = 0; i < n; i++) {
      if (i < 14) {
        sumTR += tr[i];
        if (i === 13) {
          atrArr[i] = sumTR / 14;
        }
      } else {
        atrArr[i] = (atrArr[i - 1]! * 13 + tr[i]) / 14;
      }
    }

    // ── 4. Calculate ADX (14-period) ──────────────────────────────────
    const plusDM = new Array(n).fill(0);
    const minusDM = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      if (upMove > downMove && upMove > 0) {
        plusDM[i] = upMove;
      } else if (downMove > upMove && downMove > 0) {
        minusDM[i] = downMove;
      }
    }
    let smoothedTR = 0;
    let smoothedPlusDM = 0;
    let smoothedMinusDM = 0;
    const dxArr = new Array(n).fill(null);

    for (let i = 0; i < n; i++) {
      if (i < 14) {
        smoothedTR += tr[i];
        smoothedPlusDM += plusDM[i];
        smoothedMinusDM += minusDM[i];
        if (i === 13) {
          smoothedTR = smoothedTR / 14;
          smoothedPlusDM = smoothedPlusDM / 14;
          smoothedMinusDM = smoothedMinusDM / 14;
          const plusDI = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100;
          const minusDI = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100;
          dxArr[i] = Math.abs(plusDI - minusDI) / Math.max(1, plusDI + minusDI) * 100;
        }
      } else {
        smoothedTR = (smoothedTR * 13 + tr[i]) / 14;
        smoothedPlusDM = (smoothedPlusDM * 13 + plusDM[i]) / 14;
        smoothedMinusDM = (smoothedMinusDM * 13 + minusDM[i]) / 14;
        const plusDI = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100;
        const minusDI = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100;
        dxArr[i] = Math.abs(plusDI - minusDI) / Math.max(1, plusDI + minusDI) * 100;
      }
    }
    let sumDX = 0;
    for (let i = 0; i < n; i++) {
      if (dxArr[i] !== null) {
        if (adxArr[i - 1] === null || adxArr[i - 1] === undefined) {
          sumDX += dxArr[i]!;
          // First ADX is the average of first 14 DX values (so at index 27)
          let validDxCount = 0;
          for (let j = 0; j <= i; j++) {
            if (dxArr[j] !== null) validDxCount++;
          }
          if (validDxCount === 14) {
            adxArr[i] = sumDX / 14;
          }
        } else {
          adxArr[i] = (adxArr[i - 1]! * 13 + dxArr[i]!) / 14;
        }
      }
    }

    // ── 5. Calculate Bollinger Width (20-period) ──────────────────────
    for (let i = 19; i < n; i++) {
      const window = closes.slice(i - 19, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / 20;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      bbWidthArr[i] = mean === 0 ? 0 : (stdDev * 4) / mean;
    }

    // ── 6. Calculate Momentum (10-day rate of change) ─────────────────
    for (let i = 10; i < n; i++) {
      momArr[i] = (closes[i] - closes[i - 10]) / closes[i - 10];
    }

    // ── 7. Calculate Volatility (20-day daily return standard deviation annualized) ──
    const dailyReturns = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
      dailyReturns[i] = (closes[i] - closes[i - 1]) / closes[i - 1];
    }
    for (let i = 20; i < n; i++) {
      const window = dailyReturns.slice(i - 19, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / 20;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      // Annualized volatility
      volArr[i] = stdDev * Math.sqrt(252);
    }

    // ── 8. Calculate Relative Strength (Asset vs Market Avg Return) ──
    // Fetch average market returns for each date to compute relative performance
    const marketAvgRes = await query(
      `SELECT trade_date::text as date, AVG((close - open) / open) as avg_return
       FROM daily_prices
       GROUP BY trade_date`
    );
    const marketAvgMap = new Map<string, number>();
    for (const r of marketAvgRes.rows) {
      marketAvgMap.set(r.date, Number(r.avg_return));
    }
    for (let i = 0; i < n; i++) {
      const date = dates[i];
      const assetReturn = opens[i] === 0 ? 0 : (closes[i] - opens[i]) / opens[i];
      const marketReturn = marketAvgMap.get(date) ?? 0;
      relStrArr[i] = assetReturn - marketReturn;
    }

    // ── 9. Calculate Moving Average Distance (50-day SMA distance) ──
    for (let i = 49; i < n; i++) {
      const window = closes.slice(i - 49, i + 1);
      const sma50 = window.reduce((a, b) => a + b, 0) / 50;
      maDistArr[i] = sma50 === 0 ? 0 : (closes[i] - sma50) / sma50;
    }

    // ── 10. Calculate Trend Strength ──────────────────────────────────
    // Combo indicator: (EMA_20 - EMA_50) / Close normalized by ADX
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    for (let i = 0; i < n; i++) {
      if (ema20[i] !== null && ema50[i] !== null && closes[i] !== 0) {
        const emaDiff = (ema20[i]! - ema50[i]!) / closes[i];
        const adxWeight = adxArr[i] !== null ? adxArr[i]! / 100 : 0.25;
        trendStrArr[i] = emaDiff * (1 + adxWeight);
      }
    }

    // ── 11. Save Snapshots to DB ──────────────────────────────────────
    const snapshots: StockFeatureSnapshot[] = [];
    for (let i = 0; i < n; i++) {
      // Create snapshot object
      const snapshot: StockFeatureSnapshot = {
        symbol,
        tradeDate: dates[i],
        rsi: rsiArr[i],
        macd: macdArr[i],
        macdSignal: macdSigArr[i],
        macdHistogram: macdHistArr[i],
        adx: adxArr[i],
        atr: atrArr[i],
        bollingerWidth: bbWidthArr[i],
        momentum: momArr[i],
        volatility: volArr[i],
        relativeStrength: relStrArr[i],
        movingAverageDistance: maDistArr[i],
        trendStrength: trendStrArr[i]
      };

      snapshots.push(snapshot);

      // Only save if enough indicators are calculated (e.g. at least RSI and MACD exist)
      if (snapshot.rsi !== null && snapshot.macd !== null) {
        await query(
          `INSERT INTO feature_snapshots (
             symbol, trade_date, rsi, macd, macd_signal, macd_histogram,
             adx, atr, bollinger_width, momentum, volatility, relative_strength,
             moving_average_distance, trend_strength
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (symbol, trade_date) DO UPDATE SET
             rsi=$3, macd=$4, macd_signal=$5, macd_histogram=$6, adx=$7, atr=$8,
             bollinger_width=$9, momentum=$10, volatility=$11, relative_strength=$12,
             moving_average_distance=$13, trend_strength=$14`,
          [
            symbol,
            snapshot.tradeDate,
            snapshot.rsi,
            snapshot.macd,
            snapshot.macdSignal,
            snapshot.macdHistogram,
            snapshot.adx,
            snapshot.atr,
            snapshot.bollingerWidth,
            snapshot.momentum,
            snapshot.volatility,
            snapshot.relativeStrength,
            snapshot.movingAverageDistance,
            snapshot.trendStrength
          ]
        );
      }
    }

    return snapshots;
  }

  /**
   * Helper: Calculate Exponential Moving Average (EMA)
   */
  private calculateEMA(values: number[], period: number): (number | null)[] {
    const n = values.length;
    const ema = new Array(n).fill(null);
    if (n < period) return ema;

    const k = 2 / (period + 1);
    
    // Initial SMA is average of first 'period' values
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    ema[period - 1] = sum / period;

    // Remaining EMAs
    for (let i = period; i < n; i++) {
      ema[i] = values[i] * k + ema[i - 1] * (1 - k);
    }

    return ema;
  }
}

export const featureEngine = new FeatureEngine();
export default featureEngine;
