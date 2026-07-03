export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  atr14: number | null;
  stochasticK: number | null;
  stochasticD: number | null;
}

export interface IndicatorHistory<T = Float32Array> {
  values: T;
  label: string;
}

export interface TechnicalIndicatorResult {
  current: TechnicalIndicators;
  history: {
    sma20: IndicatorHistory;
    sma50: IndicatorHistory;
    sma200: IndicatorHistory;
    rsi14: IndicatorHistory;
    macd: IndicatorHistory;
    macdSignal: IndicatorHistory;
    macdHistogram: IndicatorHistory;
    bollingerUpper: IndicatorHistory;
    bollingerMiddle: IndicatorHistory;
    bollingerLower: IndicatorHistory;
    atr14: IndicatorHistory;
    stochasticK: IndicatorHistory;
    stochasticD: IndicatorHistory;
  };
}

async function getGPUAdapter(): Promise<GPUAdapter | null> {
  if (typeof navigator === 'undefined' || !navigator.gpu) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter;
  } catch {
    return null;
  }
}

async function withGPUDevice<T>(fn: (device: GPUDevice) => Promise<T>): Promise<T | null> {
  try {
    const adapter = await getGPUAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    try {
      return await fn(device);
    } finally {
      device.destroy();
    }
  } catch {
    return null;
  }
}

async function gpuSMA(prices: Float32Array, window: number): Promise<Float32Array | null> {
  return withGPUDevice(async (device) => {
    const resultLen = prices.length - window + 1;
    if (resultLen <= 0) return new Float32Array(0);

    const shader = `
      @group(0) @binding(0) var<storage, read> prices: array<f32>;
      @group(0) @binding(1) var<storage, read> params: array<f32>;
      @group(0) @binding(2) var<storage, read_write> output: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        let idx = id.x;
        let window = u32(params[0]);
        let len = arrayLength(&prices);
        if (idx + window > len) { return; }
        var sum = 0.0;
        for (var i = 0u; i < window; i = i + 1u) {
          sum = sum + prices[idx + i];
        }
        output[idx] = sum / f32(window);
      }
    `;

    const shaderModule = device.createShaderModule({ code: shader });
    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    const pricesBuffer = device.createBuffer({
      size: prices.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(pricesBuffer, 0, new Float32Array(prices));

    const params = new Float32Array([window]);
    const paramsBuffer = device.createBuffer({
      size: params.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(paramsBuffer, 0, params);

    const outputSize = resultLen * Float32Array.BYTES_PER_ELEMENT;
    const outputBuffer = device.createBuffer({
      size: outputSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: pricesBuffer } },
        { binding: 1, resource: { buffer: paramsBuffer } },
        { binding: 2, resource: { buffer: outputBuffer } },
      ],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(resultLen / 64));
    pass.end();

    const readBuffer = device.createBuffer({
      size: outputSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    encoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize);
    device.queue.submit([encoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const mapped = new Float32Array(readBuffer.getMappedRange().slice(0, outputSize));
    const result = new Float32Array(mapped);
    readBuffer.unmap();
    return result;
  });
}

function cpuSMA(prices: Float32Array, window: number): Float32Array {
  const resultLen = prices.length - window + 1;
  const result = new Float32Array(Math.max(0, resultLen));
  for (let i = 0; i < result.length; i++) {
    let sum = 0;
    for (let j = 0; j < window; j++) sum += prices[i + j];
    result[i] = sum / window;
  }
  return result;
}

async function computeSMA(prices: Float32Array, window: number): Promise<Float32Array> {
  if (prices.length < window) return new Float32Array(0);
  if (prices.length < 200) return cpuSMA(prices, window);
  const gpu = await gpuSMA(prices, window);
  return gpu ?? cpuSMA(prices, window);
}

function calcEMA(prices: Float32Array, period: number): Float32Array {
  const result = new Float32Array(prices.length);
  result.fill(NaN);
  if (prices.length === 0) return result;

  let startIdx = 0;
  while (startIdx < prices.length && (prices[startIdx] == null || isNaN(prices[startIdx]))) {
    startIdx++;
  }
  if (startIdx >= prices.length) return result;

  const multiplier = 2 / (period + 1);
  result[startIdx] = prices[startIdx];
  for (let i = startIdx + 1; i < prices.length; i++) {
    const prev = result[i - 1];
    if (isNaN(prev) || prices[i] == null || isNaN(prices[i])) {
      result[i] = isNaN(prev) ? prices[i] : prev;
    } else {
      result[i] = (prices[i] - prev) * multiplier + prev;
    }
  }
  return result;
}

function calcRSI(prices: Float32Array, period: number = 14): Float32Array {
  const result = new Float32Array(prices.length);
  result.fill(NaN);
  if (prices.length < period + 1) return result;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

function calcMACD(prices: Float32Array): {
  macd: Float32Array;
  signal: Float32Array;
  histogram: Float32Array;
} {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const macdLine = new Float32Array(prices.length);
  for (let i = 0; i < prices.length; i++) {
    macdLine[i] = !isNaN(ema12[i]) && !isNaN(ema26[i]) ? ema12[i] - ema26[i] : NaN;
  }
  const signal = calcEMA(macdLine, 9);
  const histogram = new Float32Array(prices.length);
  for (let i = 0; i < prices.length; i++) {
    histogram[i] = !isNaN(macdLine[i]) && !isNaN(signal[i]) ? macdLine[i] - signal[i] : NaN;
  }
  return { macd: macdLine, signal, histogram };
}

function calcBollingerBands(
  prices: Float32Array,
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: Float32Array; middle: Float32Array; lower: Float32Array } {
  const sma = cpuSMA(prices, period);
  const padLen = period - 1;
  const upper = new Float32Array(prices.length);
  const middle = new Float32Array(prices.length);
  const lower = new Float32Array(prices.length);
  upper.fill(NaN);
  middle.fill(NaN);
  lower.fill(NaN);

  for (let i = 0; i < sma.length; i++) {
    const idx = padLen + i;
    const subset = prices.slice(idx - period + 1, idx + 1);
    const mean = sma[i];
    const variance = subset.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    middle[idx] = mean;
    upper[idx] = mean + stdDev * stdDevMultiplier;
    lower[idx] = mean - stdDev * stdDevMultiplier;
  }
  return { upper, middle, lower };
}

function calcATR(
  prices: Float32Array,
  highs: Float32Array,
  lows: Float32Array,
  period: number = 14
): Float32Array {
  const result = new Float32Array(prices.length);
  result.fill(NaN);
  if (prices.length < 2) return result;

  const tr = new Float32Array(prices.length);
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < prices.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - prices[i - 1]);
    const lc = Math.abs(lows[i] - prices[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
  }

  let atr = tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  result[period] = atr;
  for (let i = period + 1; i < prices.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    result[i] = atr;
  }
  return result;
}

function calcStochastic(
  highs: Float32Array,
  lows: Float32Array,
  closes: Float32Array,
  kPeriod: number = 14,
  kSmoothing: number = 3,
  dSmoothing: number = 3
): { k: Float32Array; d: Float32Array } {
  const rawK = new Float32Array(closes.length);
  rawK.fill(NaN);
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const high = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const low = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    const range = high - low;
    rawK[i] = range === 0 ? 50 : ((closes[i] - low) / range) * 100;
  }
  const k = calcEMA(rawK, kSmoothing);
  const d = calcEMA(k, dSmoothing);
  return { k, d };
}

function computeSMAForLast(prices: Float32Array, window: number): number | null {
  if (prices.length < window) return null;
  let sum = 0;
  for (let i = prices.length - window; i < prices.length; i++) {
    sum += prices[i];
  }
  return sum / window;
}

export async function calculateIndicators(
  prices: Float32Array,
  highs?: Float32Array,
  lows?: Float32Array
): Promise<TechnicalIndicatorResult> {
  const MIN_DATA = 50;
  const dataOk = prices.length >= MIN_DATA;
  const hi = highs || prices;
  const lo = lows || prices;
  const one = new Float32Array(1);

  async function computeSafe<T>(fn: () => T): Promise<T> {
    try { return fn(); } catch { return null as unknown as T; }
  }

  const sma20Arr = dataOk ? await computeSMA(prices, 20) : one;
  const sma50Arr = dataOk ? await computeSMA(prices, 50) : one;
  const sma200Arr = dataOk ? await computeSMA(prices, 200) : one;
  const rsiArr = dataOk ? await computeSafe(() => calcRSI(prices, 14)) : one;
  const macdResult = dataOk ? await computeSafe(() => calcMACD(prices)) : null;
  const bbResult = dataOk ? await computeSafe(() => calcBollingerBands(prices, 20, 2)) : null;
  const atrArr = dataOk ? await computeSafe(() => calcATR(prices, hi, lo, 14)) : one;
  const stochResult = dataOk ? await computeSafe(() => calcStochastic(hi, lo, prices, 14, 3, 3)) : null;

  const lastIdx = prices.length - 1;

  function val(arr: Float32Array | null, idx?: number): number | null {
    if (!arr || arr.length === 0) return null;
    const i = idx !== undefined ? Math.min(idx, arr.length - 1) : lastIdx;
    const v = arr[i];
    return v != null && !isNaN(v) && isFinite(v) ? Math.round(v * 100) / 100 : null;
  }

  function smaIdx(window: number): number {
    return Math.min(sma20Arr.length - 1, lastIdx - window + 1);
  }

  const current: TechnicalIndicators = {
    sma20: val(sma20Arr, smaIdx(20)),
    sma50: val(sma50Arr, smaIdx(50)),
    sma200: val(sma200Arr, smaIdx(200)),
    rsi14: val(rsiArr),
    macd: macdResult ? val(macdResult.macd) : null,
    macdSignal: macdResult ? val(macdResult.signal) : null,
    macdHistogram: macdResult ? val(macdResult.histogram) : null,
    bollingerUpper: bbResult ? val(bbResult.upper) : null,
    bollingerMiddle: bbResult ? val(bbResult.middle) : null,
    bollingerLower: bbResult ? val(bbResult.lower) : null,
    atr14: val(atrArr),
    stochasticK: stochResult ? val(stochResult.k) : null,
    stochasticD: stochResult ? val(stochResult.d) : null,
  };

  const wrap = (arr: Float32Array, label: string): IndicatorHistory => ({
    values: arr,
    label,
  });

  const empty = new Float32Array(0);
  const history = {
    sma20: wrap(sma20Arr || empty, 'SMA-20'),
    sma50: wrap(sma50Arr || empty, 'SMA-50'),
    sma200: wrap(sma200Arr || empty, 'SMA-200'),
    rsi14: wrap(rsiArr instanceof Float32Array ? rsiArr : empty, 'RSI-14'),
    macd: wrap(macdResult?.macd || empty, 'MACD'),
    macdSignal: wrap(macdResult?.signal || empty, 'MACD Signal'),
    macdHistogram: wrap(macdResult?.histogram || empty, 'MACD Histogram'),
    bollingerUpper: wrap(bbResult?.upper || empty, 'Bollinger Upper'),
    bollingerMiddle: wrap(bbResult?.middle || empty, 'Bollinger Middle'),
    bollingerLower: wrap(bbResult?.lower || empty, 'Bollinger Lower'),
    atr14: wrap(atrArr instanceof Float32Array ? atrArr : empty, 'ATR-14'),
    stochasticK: wrap(stochResult?.k || empty, 'Stochastic %K'),
    stochasticD: wrap(stochResult?.d || empty, 'Stochastic %D'),
  };

  return { current, history };
}

export function rsify(rsi: Float32Array): { rsi: number | null; signal: 'overbought' | 'oversold' | 'neutral' } {
  if (rsi.length === 0) return { rsi: null, signal: 'neutral' };
  const v = rsi[rsi.length - 1];
  if (v == null || isNaN(v)) return { rsi: null, signal: 'neutral' };
  const rounded = Math.round(v * 100) / 100;
  return {
    rsi: rounded,
    signal: rounded >= 70 ? 'overbought' : rounded <= 30 ? 'oversold' : 'neutral',
  };
}

export function interpretMACD(macd: Float32Array, signal: Float32Array): {
  crossover: 'bullish' | 'bearish' | 'none';
  strength: number;
} {
  const len = Math.min(macd.length, signal.length);
  if (len < 3) return { crossover: 'none', strength: 0 };
  const curr = macd[len - 1] - signal[len - 1];
  const prev = macd[len - 2] - signal[len - 2];
  return {
    crossover: curr >= 0 && prev < 0 ? 'bullish' : curr < 0 && prev >= 0 ? 'bearish' : 'none',
    strength: Math.round(Math.abs(curr) * 1000) / 1000,
  };
}

export function interpretBollinger(
  price: number,
  upper: number | null,
  lower: number | null
): { position: 'above' | 'below' | 'inside' | 'unknown'; bandwidth: number | null } {
  if (upper == null || lower == null || upper === lower) {
    return { position: 'unknown', bandwidth: null };
  }
  const bandwidth = Math.round(((upper - lower) / ((upper + lower) / 2)) * 10000) / 100;
  return {
    position: price > upper ? 'above' : price < lower ? 'below' : 'inside',
    bandwidth,
  };
}
