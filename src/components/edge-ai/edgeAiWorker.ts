// src/components/edge-ai/edgeAiWorker.ts
// Phase 8 — Web Worker runtime for edge AI inference.
// Phase 18 — Extended with client-side pattern scanner (Bollinger, MACD, volume divergence).
//
// Runs inside a dedicated Web Worker. Accepts either chat queries (EdgeAiWorkerInput)
// or scanner requests (ScannerWorkerInput) via discriminated type field.
// =========================================================================

import type {
  EdgeAiWorkerInput,
  EdgeAiWorkerResult,
  ScannerWorkerInput,
  ScannerWorkerResult,
  IndicatorWorkerInput,
  IndicatorWorkerResult,
  BackendFallbackInput,
  BackendFallbackResult,
  WorkerMessage,
} from './edgeAiTypes';

/* ── Self-registering worker ───────────────────────────────────────── */

// eslint-disable-next-line no-restricted-globals
self.onmessage = async (event: MessageEvent<WorkerMessage | { type: string; payload: any }>): Promise<void> => {
  const input = event.data;

  try {
    // Phase 35: GPU order-flow delta computation
    if ('type' in input && input.type === 'compute_gpu_order_flow') {
      try {
        const res = await computeGpuOrderFlowDelta(
          input.payload.callVols as number[],
          input.payload.putVols as number[],
        );
        // eslint-disable-next-line no-restricted-globals
        self.postMessage({ type: 'gpu_order_flow_result', payload: res });
      } catch {
        // eslint-disable-next-line no-restricted-globals
        self.postMessage({
          type: 'gpu_order_flow_result',
          payload: { delta: 0, signal: 'CPU_FALLBACK_ACTIVE' },
        });
      }
      return;
    }

    // Phase 41: Bulk option Greeks computation
    if ('type' in input && input.type === 'compute_option_greeks_bulk') {
      const { spot, strikesData } = input.payload as {
        spot: number;
        strikesData: Array<{ strike: number; iv: number; isCall: boolean }>;
      };
      const results = strikesData.map((item) => ({
        strike: item.strike,
        isCall: item.isCall,
        greeks: computeClientOptionGreeks(spot, item.strike, 30, 0.07, item.iv, item.isCall),
      }));
      // eslint-disable-next-line no-restricted-globals
      self.postMessage({ type: 'greeks_bulk_result', results });
      return;
    }

    // Phase 53: WebGPU sentiment scoring
    if ('type' in input && input.type === 'compute_gpu_sentiment') {
      const scores = input.payload.scores as number[];
      const sentimentIndex = await executeWebGpuSentimentScan(scores);
      // eslint-disable-next-line no-restricted-globals
      self.postMessage({ type: 'gpu_sentiment_result', sentimentIndex });
      return;
    }

    if ('type' in input && input.type === 'compute_indicators') {
      const indicatorInput = input as IndicatorWorkerInput;
      const result = computeIndicators(indicatorInput.prices, indicatorInput.volumes);
      // eslint-disable-next-line no-restricted-globals
      self.postMessage(result);
      return;
    }

    if ('type' in input && input.type === 'backend_fallback') {
      const fbInput = input as BackendFallbackInput;
      const result = await callBackendAgent(fbInput.ticker, fbInput.prompt);
      // eslint-disable-next-line no-restricted-globals
      self.postMessage(result);
      return;
    }

    if ('type' in input && input.type === 'scan') {
      const result = runScanner(input as ScannerWorkerInput);
      // eslint-disable-next-line no-restricted-globals
      self.postMessage(result);
    } else {
      const chatInput = input as EdgeAiWorkerInput;
      const rawReply = generateReply(chatInput);
      const result: EdgeAiWorkerResult = { rawReply };
      // eslint-disable-next-line no-restricted-globals
      self.postMessage(result);
    }
  } catch (err) {
    const fallback = err instanceof Error ? err.message : 'Unknown worker error';
    // eslint-disable-next-line no-restricted-globals
    self.postMessage({ rawReply: fallback });
  }
};

/* ── Client-Side Indicator Computation (Phase 80) ─────────────────── */

function computeRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50.0;
  const deltas: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    deltas.push(prices[i] - prices[i - 1]);
  }
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (deltas[i] > 0) avgGain += deltas[i];
    else avgLoss -= deltas[i];
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period; i < deltas.length; i++) {
    const gain = deltas[i] > 0 ? deltas[i] : 0;
    const loss = deltas[i] < 0 ? -deltas[i] : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100.0;
  const rs = avgGain / avgLoss;
  return parseFloat((100.0 - 100.0 / (1.0 + rs)).toFixed(3));
}

function computeSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return parseFloat((slice.reduce((a, b) => a + b, 0) / period).toFixed(3));
}

function computeMACD(prices: number[]): { macdLine: number; signal: number } {
  if (prices.length < 26) return { macdLine: 0, signal: 0 };
  const ema12 = computeEma(prices, 12);
  const ema26 = computeEma(prices, 26);
  const macdLine = ema12 - ema26;
  const signalPrices = prices.map((_, i, arr) => {
    const slice = arr.slice(0, i + 1);
    return computeEma(slice, 12) - computeEma(slice, 26);
  });
  const signal = signalPrices.length >= 9
    ? signalPrices.slice(-9).reduce((a, b) => a + b, 0) / 9
    : macdLine;
  return { macdLine: parseFloat(macdLine.toFixed(4)), signal: parseFloat(signal.toFixed(4)) };
}

function computeIndicators(prices: number[], volumes: number[]): IndicatorWorkerResult {
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const sma50 = computeSMA(prices, 50);
  const sma200 = computeSMA(prices, 200);
  const rsi14 = computeRSI(prices, 14);
  const bands = computeBollingerBands(prices, 20, 2);
  const macd = computeMACD(prices);
  const divergence = detectPriceVolumeDivergence(prices, volumes.length === prices.length ? volumes : []);

  let scannerFlag = 'CONSOLIDATION_STATE';
  let signalStrength = 50;
  if (currentPrice > bands.upper) { scannerFlag = 'MEAN_REVERSION_SHORTSIDE_ALERT'; signalStrength = 20; }
  else if (currentPrice < bands.lower) { scannerFlag = 'MEAN_REVERSION_BUYSIDE_ALERT'; signalStrength = 85; }
  if (divergence === 'BULLISH_ACCUMULATION_DIVERGENCE') { scannerFlag = 'CRITICAL_INSTITUTIONAL_ACCUMULATION'; signalStrength = 95; }

  return {
    type: 'indicator_result',
    currentPrice: parseFloat(currentPrice.toFixed(3)),
    sma50,
    sma200,
    rsi14,
    bollingerUpper: bands.upper,
    bollingerLower: bands.lower,
    bollingerMiddle: bands.middle,
    macdLine: macd.macdLine,
    macdSignal: macd.signal,
    divergencePattern: divergence,
    healthometer: Math.min(Math.max(signalStrength, 10), 100),
    scannerFlag,
  };
}

/* ── Backend REST Fallback (Phase 80) ──────────────────────────────── */

async function callBackendAgent(ticker: string, prompt: string): Promise<BackendFallbackResult> {
  try {
    const res = await fetch('/api/v1/chat/agent-interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      return { type: 'backend_fallback_result', response: data.response || '' };
    }
  } catch {
    // worker has no access to console — return empty
  }
  return { type: 'backend_fallback_result', response: '' };
}

/* ── Scanner functions (Phase 18) ──────────────────────────────────── */

function computeBollingerBands(
  prices: number[],
  period = 20,
  multiplier = 2,
): { upper: number; lower: number; middle: number } {
  if (prices.length < period) return { upper: 0, lower: 0, middle: 0 };

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

function computeEma(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function detectPriceVolumeDivergence(
  prices: number[],
  volumes: number[],
): string {
  if (prices.length < 5 || volumes.length < 5) return 'NORMAL';

  const pl = prices.length;
  const priceDescending =
    prices[pl - 1] < prices[pl - 3] && prices[pl - 3] < prices[pl - 5];

  const volumeAscending =
    volumes[pl - 1] > volumes[pl - 3] && volumes[pl - 3] > volumes[pl - 5];

  if (priceDescending && volumeAscending) {
    return 'BULLISH_ACCUMULATION_DIVERGENCE';
  }
  return 'STABLE_FLOW';
}

function runScanner(input: ScannerWorkerInput): ScannerWorkerResult {
  const prices = input.priceHistory;
  const volumes =
    input.volumeHistory.length === prices.length
      ? input.volumeHistory
      : Array(prices.length).fill(10000);
  const currentPrice = prices[prices.length - 1];

  const bands = computeBollingerBands(prices, 20, 2);

  const ema12 = computeEma(prices, 12);
  const ema26 = computeEma(prices, 26);
  const macdLine = ema12 - ema26;

  const structuralDivergence = detectPriceVolumeDivergence(prices, volumes);

  let scannerFlag = 'CONSOLIDATION_STATE';
  let signalStrength = 50;

  if (currentPrice > bands.upper) {
    scannerFlag = 'MEAN_REVERSION_SHORTSIDE_ALERT';
    signalStrength = 20;
  } else if (currentPrice < bands.lower) {
    scannerFlag = 'MEAN_REVERSION_BUYSIDE_ALERT';
    signalStrength = 85;
  }

  if (structuralDivergence === 'BULLISH_ACCUMULATION_DIVERGENCE') {
    scannerFlag = 'CRITICAL_INSTITUTIONAL_ACCUMULATION';
    signalStrength = 95;
  }

  const healthometer = Math.min(Math.max(signalStrength, 10), 100);

  return {
    type: 'scan',
    healthometer,
    scannerFlag,
    signalStrength,
    technicalMetrics: {
      upperBand: bands.upper,
      lowerBand: bands.lower,
      middleBand: bands.middle,
      macdLine: parseFloat(macdLine.toFixed(4)),
      divergencePattern: structuralDivergence,
    },
  };
}

/* ── Chat prompt gating logic (unchanged from Phase 8) ─────────────── */

function generateReply(input: EdgeAiWorkerInput): string {
  const { context, history, query } = input;
  const lower = query.toLowerCase().trim();

  if (!context.symbol) {
    return 'No research context loaded for this symbol.';
  }

  const narrativeSnippet = context.narrative.slice(0, 3).join(' ');
  const riskCount = context.risksToReview.length;
  const watchCount = context.whatToWatch.length;
  const formatVal = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '—';
    return value.toFixed(2);
  };

  const contextPrompt = [
    `Company: ${context.companyName} (${context.symbol})`,
    `Sector: ${context.sector}`,
    `Price: \u20b9${formatVal(context.currentPrice)} (${(context.changePercent ?? 0) >= 0 ? '+' : ''}${formatVal(context.changePercent)}%)`,
    narrativeSnippet ? `Narrative: ${narrativeSnippet}` : '',
    riskCount > 0 ? `Risks flagged: ${riskCount} item(s).` : '',
    watchCount > 0 ? `What to watch: ${watchCount} item(s).` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (lower.includes('risk') || lower.includes('debt') || lower.includes('concern')) {
    const items = context.risksToReview;
    if (items.length > 0) {
      return [
        `Based on the research, here are the flagged risks for ${context.companyName}:`,
        ...items.map((r) => `\u2022 ${r}`),
        '',
        'These are drawn from the latest available research context.',
      ].join('\n');
    }
    return 'The current research does not highlight any specific risks for this stock.';
  }

  if (lower.includes('watch') || lower.includes('catalyst') || lower.includes('monitor')) {
    const items = context.whatToWatch;
    if (items.length > 0) {
      return [
        `Here is what the research suggests monitoring for ${context.companyName}:`,
        ...items.map((w) => `\u2022 ${w}`),
        '',
        'These are drawn from the latest available research context.',
      ].join('\n');
    }
    return 'There are no active watch items in the current research.';
  }

  if (lower.includes('narrative') || lower.includes('story') || lower.includes('thesis')) {
    if (context.narrative.length > 0) {
      return [
        `The research narrative for ${context.companyName}:`,
        '',
        ...context.narrative,
        '',
        'This narrative summarises the available research context.',
      ].join('\n');
    }
    return 'No narrative is currently available for this stock.';
  }

  if (lower.includes('price') || lower.includes('return') || lower.includes('performance')) {
    return [
      `${context.companyName} is currently at \u20b9${formatVal(context.currentPrice)}.`,
      `Today: ${(context.changePercent ?? 0) >= 0 ? '+' : ''}${formatVal(context.changePercent)}%`,
      '',
      'Past performance is not indicative of future results. The research context covers fundamentals, sector trends, and flagged risks.',
    ].join('\n');
  }

  return [
    `Here is the research context I have for ${context.companyName}:`,
    '',
    contextPrompt,
    '',
    'You can ask about risks, what to watch, the narrative, or price performance.',
  ].join('\n');
}

// Export for testability
export { runScanner, computeBollingerBands, computeEma, detectPriceVolumeDivergence, generateReply, runWebGpuScanner, computeIndicators, computeRSI, computeSMA };

/* ── WebGPU-Accelerated Scanner (Phase 30) ──────────────────────────── */

/**
 * GPU-accelerated Bollinger Band mean computation using WebGPU compute shaders.
 * Falls back to CPU if WebGPU is unavailable.
 *
 * @param priceHistory - Array of recent closing prices (minimum 20)
 * @returns Computed health score (0-100) based on price position relative to bands
 */
async function runWebGpuScanner(priceHistory: number[]): Promise<number> {
  // Fallback to CPU if WebGPU is not supported
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return computeCpuFallback(priceHistory);
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return computeCpuFallback(priceHistory);

    const device = await adapter.requestDevice();
    if (!device) return computeCpuFallback(priceHistory);

    // WGSL Compute Shader: calculates 20-period SMA on GPU
    const computeShaderCode = `
      @group(0) @binding(0) var<storage, read> prices: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output: array<f32>;

      @compute @workgroup_size(1)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        var sum: f32 = 0.0;
        let len: u32 = arrayLength(&prices);
        let period: u32 = min(20u, len);
        let start: u32 = len - period;

        for (var i: u32 = 0u; i < period; i = i + 1u) {
          sum = sum + prices[start + i];
        }
        let mean: f32 = sum / f32(period);

        // Calculate standard deviation
        var sumSq: f32 = 0.0;
        for (var i: u32 = 0u; i < period; i = i + 1u) {
          let diff = prices[start + i] - mean;
          sumSq = sumSq + diff * diff;
        }
        let stdDev: f32 = sqrt(sumSq / f32(period));

        // Output: [0] = mean, [1] = upper band, [2] = lower band
        output[0] = mean;
        output[1] = mean + 2.0 * stdDev;
        output[2] = mean - 2.0 * stdDev;
      }
    `;

    const shaderModule = device.createShaderModule({ code: computeShaderCode });

    const inputBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * priceHistory.length,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(inputBuffer.getMappedRange()).set(priceHistory);
    inputBuffer.unmap();

    const outputBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * 3,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const computePipeline = device.createComputePipeline({
      layout: "auto",
      compute: { module: shaderModule, entryPoint: "main" },
    });

    const bindGroup = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(1);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    await outputBuffer.mapAsync(GPUMapMode.READ);

    const resultData = new Float32Array(outputBuffer.getMappedRange());
    const mean = resultData[0];
    const upperBand = resultData[1];
    const lowerBand = resultData[2];
    outputBuffer.unmap();

    // Cleanup GPU resources
    inputBuffer.destroy();
    outputBuffer.destroy();
    device.destroy();

    // Map current price position to health score
    const currentPrice = priceHistory[priceHistory.length - 1];
    if (currentPrice <= lowerBand) return 85;  // Below lower band — oversold
    if (currentPrice >= upperBand) return 20;  // Above upper band — overbought

    // Linear interpolation between bands
    const bandRange = upperBand - lowerBand;
    if (bandRange <= 0) return 50;
    const position = (currentPrice - lowerBand) / bandRange;
    return Math.round(85 - position * 65); // 85 at bottom, 20 at top

  } catch {
    return computeCpuFallback(priceHistory);
  }
}

/* ── Black-Scholes Option Greeks (Phase 41) ────────────────────────── */

/**
 * Standard normal cumulative distribution function (A&S 26.2.17).
 * High-precision polynomial approximation computed locally — no server calls.
 */
function standardNormalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.39894228 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

/** Normal probability density function. */
function normalPDF(x: number): number {
  return 0.3989422804014327 * Math.exp(-0.5 * x * x);
}

export interface GreeksOutput {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

/**
 * Compute Black-Scholes option Greeks for a single strike.
 * All calculations run client-side — zero server cost, zero API tokens.
 *
 * @param spotPrice - Current underlying price
 * @param strikePrice - Option strike price
 * @param daysToExpiry - Days until expiration
 * @param riskFreeRate - Risk-free rate (default 7% for INR)
 * @param impliedVol - Implied volatility percentage (e.g. 18.5)
 * @param isCall - true for Call, false for Put
 */
export function computeClientOptionGreeks(
  spotPrice: number,
  strikePrice: number,
  daysToExpiry: number,
  riskFreeRate: number = 0.07,
  impliedVol: number,
  isCall: boolean,
): GreeksOutput {
  const t = Math.max(daysToExpiry, 0.5) / 365;
  const v = Math.max(impliedVol, 0.01) / 100;

  const d1 =
    (Math.log(spotPrice / strikePrice) + (riskFreeRate + (v * v) / 2) * t) /
    (v * Math.sqrt(t));
  const d2 = d1 - v * Math.sqrt(t);

  const nd1 = standardNormalCDF(d1);
  const nd2 = standardNormalCDF(d2);
  const nPrimeD1 = normalPDF(d1);

  const delta = isCall ? nd1 : nd1 - 1;
  const gamma = nPrimeD1 / (spotPrice * v * Math.sqrt(t));
  const vega = (spotPrice * Math.sqrt(t) * nPrimeD1) / 100;

  let theta: number;
  if (isCall) {
    theta =
      (-spotPrice * v * nPrimeD1) / (2 * Math.sqrt(t)) -
      riskFreeRate * strikePrice * Math.exp(-riskFreeRate * t) * nd2;
  } else {
    theta =
      (-spotPrice * v * nPrimeD1) / (2 * Math.sqrt(t)) +
      riskFreeRate * strikePrice * Math.exp(-riskFreeRate * t) * (1 - nd2);
  }

  return {
    delta: parseFloat(delta.toFixed(3)),
    gamma: parseFloat(gamma.toFixed(4)),
    theta: parseFloat((theta / 365).toFixed(3)),
    vega: parseFloat(vega.toFixed(3)),
  };
}

/* ── WebGPU Order-Flow Delta (Phase 35) ────────────────────────────── */

/**
 * GPU-accelerated options order-flow delta computation using WebGPU compute shaders.
 * Calculates net institutional call vs. put volume differentials on the GPU.
 * Falls back to CPU if WebGPU is unavailable.
 *
 * @param callVols - Array of call option volumes at each strike
 * @param putVols  - Array of put option volumes at each strike
 * @returns Net delta and momentum signal string
 */
export async function computeGpuOrderFlowDelta(
  callVols: number[],
  putVols: number[],
): Promise<{ delta: number; signal: string }> {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return computeOrderFlowCpuFallback(callVols, putVols);
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return computeOrderFlowCpuFallback(callVols, putVols);

    const device = await adapter.requestDevice();
    if (!device) return computeOrderFlowCpuFallback(callVols, putVols);

    const count = Math.min(callVols.length, putVols.length, 64);

    // WGSL compute shader: sums call volumes, subtracts put volumes
    const wgslShader = `
      @group(0) @binding(0) var<storage, read> calls: array<f32>;
      @group(0) @binding(1) var<storage, read> puts: array<f32>;
      @group(0) @binding(2) var<storage, read_write> net_delta: array<f32>;

      @compute @workgroup_size(1)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        var call_total: f32 = 0.0;
        var put_total: f32 = 0.0;
        let len: u32 = arrayLength(&calls);
        for (var i: u32 = 0u; i < len; i = i + 1u) {
          call_total = call_total + calls[i];
          put_total = put_total + puts[i];
        }
        net_delta[0] = call_total - put_total;
      }
    `;

    const shaderModule = device.createShaderModule({ code: wgslShader });

    const callBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * count,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(callBuffer.getMappedRange()).set(callVols.slice(0, count));
    callBuffer.unmap();

    const putBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT * count,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(putBuffer.getMappedRange()).set(putVols.slice(0, count));
    putBuffer.unmap();

    const resultBuffer = device.createBuffer({
      size: Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const computePipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    const bindGroup = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: callBuffer } },
        { binding: 1, resource: { buffer: putBuffer } },
        { binding: 2, resource: { buffer: resultBuffer } },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(1);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    await resultBuffer.mapAsync(GPUMapMode.READ);

    const output = new Float32Array(resultBuffer.getMappedRange());
    const netDelta = output[0];
    resultBuffer.unmap();

    callBuffer.destroy();
    putBuffer.destroy();
    resultBuffer.destroy();
    device.destroy();

    const rounded = parseFloat(netDelta.toFixed(2));
    let signal = 'NEUTRAL_FLOW';
    if (rounded > 150000) signal = 'HEAVY_CALL_ACCUMULATION_BULLISH';
    else if (rounded > 50000) signal = 'MODERATE_CALL_BIAS';
    else if (rounded < -150000) signal = 'HEAVY_PUT_ACCUMULATION_BEARISH';
    else if (rounded < -50000) signal = 'MODERATE_PUT_BIAS';

    return { delta: rounded, signal };
  } catch {
    return computeOrderFlowCpuFallback(callVols, putVols);
  }
}

/** CPU fallback for WebGPU order-flow delta calculation */
function computeOrderFlowCpuFallback(
  callVols: number[],
  putVols: number[],
): { delta: number; signal: string } {
  const count = Math.min(callVols.length, putVols.length);
  let callTotal = 0;
  let putTotal = 0;

  for (let i = 0; i < count; i++) {
    callTotal += callVols[i];
    putTotal += putVols[i];
  }

  const netDelta = callTotal - putTotal;
  let signal = 'NEUTRAL_FLOW';
  if (netDelta > 150000) signal = 'HEAVY_CALL_ACCUMULATION_BULLISH';
  else if (netDelta > 50000) signal = 'MODERATE_CALL_BIAS';
  else if (netDelta < -150000) signal = 'HEAVY_PUT_ACCUMULATION_BEARISH';
  else if (netDelta < -50000) signal = 'MODERATE_PUT_BIAS';

  return { delta: netDelta, signal };
}

/** CPU fallback for WebGPU-unavailable browsers */
function computeCpuFallback(prices: number[]): number {
  if (prices.length < 20) return 50;
  const bands = computeBollingerBands(prices, 20, 2);
  const current = prices[prices.length - 1];
  if (current <= bands.lower) return 85;
  if (current >= bands.upper) return 20;
  const range = bands.upper - bands.lower;
  if (range <= 0) return 50;
  const pos = (current - bands.lower) / range;
  return Math.round(85 - pos * 65);
}

/**
 * Phase 53: GPU-accelerated sentiment index scoring via WebGPU WGSL compute shader.
 * Converts raw text-score vectors into a normalized 10–99 sentiment index.
 * Falls back to neutral (50) if WebGPU is unavailable.
 */
export async function executeWebGpuSentimentScan(textScores: number[]): Promise<number> {
  if (typeof navigator === 'undefined' || !navigator.gpu) return 50;

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) return 50;

  const shaderSource = `
    @group(0) @binding(0) var<storage, read> scores: array<f32>;
    @group(0) @binding(1) var<storage, read_write> net_score: array<f32>;

    @compute @workgroup_size(1)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      var total: f32 = 0.0;
      for (var i = 0u; i < 5u; i = i + 1u) {
        total = total + scores[i];
      }
      net_score[0] = (total / 5.0) * 100.0;
    }
  `;

  const module = device.createShaderModule({ code: shaderSource });

  const inputBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * textScores.length,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });
  new Float32Array(inputBuffer.getMappedRange()).set(textScores);
  inputBuffer.unmap();

  const outputBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const pipeline = device.createComputePipeline({
    layout: 'auto',
    compute: { module, entryPoint: 'main' },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: inputBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
    ],
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(1);
  pass.end();

  device.queue.submit([encoder.finish()]);
  await outputBuffer.mapAsync(GPUMapMode.READ);

  const result = new Float32Array(outputBuffer.getMappedRange());
  const finalScore = result[0];
  outputBuffer.unmap();

  return Math.min(Math.max(Math.round(finalScore), 10), 99);
}
