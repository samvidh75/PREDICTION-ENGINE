/**
 * PredictiveWorker.ts
 * Web Worker for off-thread probabilistic market-health analysis
 * Maintains UI responsiveness by processing heavy computations in background
 */

import { ICompanyTelemetry } from '../types/market';
import { predictionEngineAdapter, PredictiveEngineOutput } from './PredictionEngineAdapter';

/**
 * Message types for worker communication
 */
export interface WorkerMessage {
  type: 'ANALYZE_MARKET_HEALTH' | 'ANALYZE_BATCH' | 'PING' | 'SHUTDOWN';
  payload?: any;
  id?: string;
}

export interface WorkerResponse {
  type: 'HEALTH_STATUS_UPDATE' | 'BATCH_UPDATE' | 'PONG' | 'ENGINE_ERROR';
  id?: string;
  status?: string;
  healthStatus?: string;
  confidenceScore?: number;
  probabilityDistribution?: any;
  riskMetrics?: any;
  trendVector?: any;
  results?: Map<string, PredictiveEngineOutput>;
  error?: string;
  processingTime?: number;
}

/**
 * Telemetry processing state
 */
let isProcessing = false;
let processingStartTime = 0;

/**
 * Worker message handler
 * Processes incoming telemetry data and returns probabilistic health analysis
 */
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = event.data;

  try {
    switch (type) {
      case 'ANALYZE_MARKET_HEALTH':
        await handleSingleAnalysis(payload, id);
        break;

      case 'ANALYZE_BATCH':
        await handleBatchAnalysis(payload, id);
        break;

      case 'PING':
        self.postMessage({
          type: 'PONG',
          id,
          status: isProcessing ? 'PROCESSING' : 'IDLE',
        });
        break;

      case 'SHUTDOWN':
        self.close();
        break;

      default:
        self.postMessage({
          type: 'ENGINE_ERROR',
          id,
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'ENGINE_ERROR',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Handle single market health analysis
 */
async function handleSingleAnalysis(
  telemetry: ICompanyTelemetry,
  id?: string
): Promise<void> {
  if (!telemetry || !telemetry.symbol) {
    self.postMessage({
      type: 'ENGINE_ERROR',
      id,
      error: 'Invalid telemetry data',
    });
    return;
  }

  isProcessing = true;
  processingStartTime = performance.now();

  try {
    const output = await predictionEngineAdapter.evaluateHealth(telemetry);
    const processingTime = performance.now() - processingStartTime;

    self.postMessage({
      type: 'HEALTH_STATUS_UPDATE',
      id,
      symbol: telemetry.symbol,
      healthStatus: output.healthStatus,
      confidenceScore: output.confidenceScore,
      probabilityDistribution: output.probabilityDistribution,
      riskMetrics: output.riskMetrics,
      trendVector: output.trendVector,
      processingTime,
    } as any);
  } finally {
    isProcessing = false;
  }
}

/**
 * Handle batch market health analysis
 */
async function handleBatchAnalysis(
  telemetries: ICompanyTelemetry[],
  id?: string
): Promise<void> {
  if (!Array.isArray(telemetries) || telemetries.length === 0) {
    self.postMessage({
      type: 'ENGINE_ERROR',
      id,
      error: 'Invalid telemetry batch',
    });
    return;
  }

  isProcessing = true;
  processingStartTime = performance.now();

  try {
    const results = await predictionEngineAdapter.evaluateBatch(telemetries);
    const processingTime = performance.now() - processingStartTime;

    // Convert Map to object for serialization
    const resultsObj: Record<string, PredictiveEngineOutput> = {};
    for (const [symbol, output] of results) {
      resultsObj[symbol] = output;
    }

    self.postMessage({
      type: 'BATCH_UPDATE',
      id,
      results: resultsObj,
      count: telemetries.length,
      processingTime,
    } as any);
  } finally {
    isProcessing = false;
  }
}

/**
 * Initialize worker
 */
console.log('🚀 PredictiveWorker initialized');

export {};
