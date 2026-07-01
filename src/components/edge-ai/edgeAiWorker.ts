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
  WorkerMessage,
} from './edgeAiTypes';

/* ── Self-registering worker ───────────────────────────────────────── */

// eslint-disable-next-line no-restricted-globals
self.onmessage = (event: MessageEvent<WorkerMessage>): void => {
  const input: WorkerMessage = event.data;

  try {
    if ('type' in input && input.type === 'scan') {
      const result = runScanner(input);
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
  const formatPrice = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '—';
    return value.toFixed(2);
  };
  const formatPct = (value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return '—';
    return value.toFixed(2);
  };

  const contextPrompt = [
    `Company: ${context.companyName} (${context.symbol})`,
    `Sector: ${context.sector}`,
    `Price: \u20b9${formatPrice(context.currentPrice)} (${(context.changePercent ?? 0) >= 0 ? '+' : ''}${formatPct(context.changePercent)}%)`,
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
      `${context.companyName} is currently at \u20b9${formatPrice(context.currentPrice)}.`,
      `Today: ${(context.changePercent ?? 0) >= 0 ? '+' : ''}${formatPct(context.changePercent)}%`,
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
export { runScanner, computeBollingerBands, computeEma, detectPriceVolumeDivergence, generateReply };
