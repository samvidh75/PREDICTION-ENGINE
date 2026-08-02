/**
 * StockEngine Web Worker
 *
 * Client-side technical analysis engine that runs off the main thread.
 * Computes Bollinger Bands, MACD, price-volume divergence signals
 * using the user's CPU — zero server load.
 *
 * Message protocol:
 *   { type: 'compute', payload: { prices: number[], volumes?: number[] } }
 *   → { type: 'result', payload: { healthometer, scanner_flag, technical_metrics } }
 */

interface TechScanResult {
  healthometer: number;
  scanner_flag: string;
  technical_metrics: {
    upper_band: number;
    lower_band: number;
    macd_divergence: number;
    divergence_pattern: string;
  } | null;
}

function computeClientBollingerBands(
  prices: number[],
  period = 20,
  multiplier = 2
): { upper: number; lower: number; middle: number } {
  if (!prices || prices.length < period) {
    return { upper: 0, lower: 0, middle: 0 };
  }

  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;

  const variance =
    slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    middle: parseFloat(middle.toFixed(2)),
    upper: parseFloat((middle + multiplier * stdDev).toFixed(2)),
    lower: parseFloat((middle - multiplier * stdDev).toFixed(2)),
  };
}

function computeClientEma(prices: number[], period: number): number {
  if (!prices || prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function detectPriceVolumeDivergence(
  prices: number[],
  volumes: number[]
): string {
  if (!prices || !volumes || prices.length < 5 || volumes.length < 5) {
    return "STABLE_FLOW";
  }

  const priceDescending =
    prices[prices.length - 1] < prices[prices.length - 3] &&
    prices[prices.length - 3] < prices[prices.length - 5];

  const volumeAscending =
    volumes[volumes.length - 1] > volumes[volumes.length - 3] &&
    volumes[volumes.length - 3] > volumes[volumes.length - 5];

  if (priceDescending && volumeAscending) {
    return "BULLISH_ACCUMULATION_DIVERGENCE";
  }
  return "STABLE_FLOW";
}

function executeOnDeviceTechnicalScanners(prices: number[], volumes: number[]): TechScanResult {
  if (prices.length < 20) {
    return {
      healthometer: 50,
      scanner_flag: "DATA_SYNCHRONIZING",
      technical_metrics: null,
    };
  }

  const currentPrice = prices[prices.length - 1];

  const bands = computeClientBollingerBands(prices, 20, 2);

  const ema12 = computeClientEma(prices, 12);
  const ema26 = computeClientEma(prices, 26);
  const macdLine = ema12 - ema26;

  const divergencePattern = detectPriceVolumeDivergence(prices, volumes);

  let flag = "NEUTRAL_TREND";
  let calculatedRank = 55;

  if (currentPrice > bands.upper) {
    flag = "MEAN_REVERSION_OVERBOUGHT_CEILING";
    calculatedRank = 25;
  } else if (currentPrice < bands.lower) {
    flag = "MEAN_REVERSION_OVERSOLD_FLOOR";
    calculatedRank = 80;
  }

  if (divergencePattern === "BULLISH_ACCUMULATION_DIVERGENCE") {
    flag = "CRITICAL_INSTITUTIONAL_BREAKOUT_EDGE";
    calculatedRank = 95;
  }

  return {
    healthometer: calculatedRank,
    scanner_flag: flag,
    technical_metrics: {
      upper_band: bands.upper,
      lower_band: bands.lower,
      macd_divergence: parseFloat(macdLine.toFixed(4)),
      divergence_pattern: divergencePattern,
    },
  };
}

self.onmessage = (e: MessageEvent<{ type: string; payload: { prices: number[]; volumes?: number[] } }>) => {
  const { type, payload } = e.data;

  if (type === "compute") {
    const { prices, volumes = [] } = payload;
    const volumesArray =
      volumes.length === prices.length
        ? volumes
        : Array(prices.length).fill(5000);

    const result = executeOnDeviceTechnicalScanners(prices, volumesArray);
    self.postMessage({ type: "result", payload: result });
  }
};
