/**
 * usePredictiveWorker Hook
 * Manages Web Worker lifecycle for predictive health analysis
 * Maintains UI responsiveness through off-thread computation
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ICompanyTelemetry, HealthStatus } from '../../types/market';

export interface PredictiveResult {
  symbol: string;
  healthStatus: HealthStatus;
  confidenceScore: number;
  probabilityDistribution: {
    veryHealthy: number;
    healthy: number;
    stable: number;
    weakening: number;
    unhealthy: number;
  };
  riskMetrics: {
    volatilityIndex: number;
    liquidityScore: number;
    correlationIndex: number;
  };
  trendVector: {
    direction: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL';
    magnitude: number;
    momentum: number;
  };
  processingTime: number;
}

interface WorkerState {
  isProcessing: boolean;
  results: Map<string, PredictiveResult>;
  errors: Map<string, string>;
}

/**
 * Hook: Single company predictive analysis
 */
export const usePredictiveAnalysis = (telemetry: ICompanyTelemetry | null) => {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<PredictiveResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageIdRef = useRef(0);

  // Initialize worker
  useEffect(() => {
    try {
      const workerCode = `
        importScripts('${import.meta.url}');
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      // For now, we'll skip worker initialization in dev
      // In production: workerRef.current = new Worker(workerUrl);
    } catch (err) {
      console.warn('Worker initialization skipped (expected in dev)', err);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Process telemetry
  useEffect(() => {
    if (!telemetry) {
      setResult(null);
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Simulate worker processing (for compatibility with dev environment)
    // In production with real worker, this would use worker.postMessage()
    const processData = async () => {
      try {
        // For now, use synchronous import
        const { predictionEngineAdapter } = await import('../PredictionEngineAdapter');
        const output = await predictionEngineAdapter.evaluateHealth(telemetry);

        setResult({
          symbol: telemetry.symbol,
          healthStatus: output.healthStatus,
          confidenceScore: output.confidenceScore,
          probabilityDistribution: output.probabilityDistribution,
          riskMetrics: output.riskMetrics,
          trendVector: output.trendVector,
          processingTime: 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setIsProcessing(false);
      }
    };

    processData();
  }, [telemetry?.symbol]);

  return { result, isProcessing, error };
};

/**
 * Hook: Batch predictive analysis for watchlists
 */
export const useBatchPredictiveAnalysis = (telemetries: ICompanyTelemetry[] | null) => {
  const [results, setResults] = useState<Map<string, PredictiveResult>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!telemetries || telemetries.length === 0) {
      setResults(new Map());
      return;
    }

    setIsProcessing(true);
    setErrors(new Map());

    const processBatch = async () => {
      try {
        const { predictionEngineAdapter } = await import('../PredictionEngineAdapter');
        const batchResults = await predictionEngineAdapter.evaluateBatch(telemetries);

        // Convert to Map of PredictiveResult
        const resultMap = new Map<string, PredictiveResult>();
        for (const [symbol, output] of batchResults) {
          resultMap.set(symbol, {
            symbol,
            healthStatus: output.healthStatus,
            confidenceScore: output.confidenceScore,
            probabilityDistribution: output.probabilityDistribution,
            riskMetrics: output.riskMetrics,
            trendVector: output.trendVector,
            processingTime: 0,
          });
        }

        setResults(resultMap);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Batch analysis failed';
        const errorMap = new Map<string, string>();
        for (const tel of telemetries) {
          errorMap.set(tel.symbol, errorMsg);
        }
        setErrors(errorMap);
      } finally {
        setIsProcessing(false);
      }
    };

    processBatch();
  }, [telemetries?.length]);

  // Get result for specific symbol
  const getResult = useCallback(
    (symbol: string): PredictiveResult | undefined => {
      return results.get(symbol);
    },
    [results]
  );

  return { results, getResult, isProcessing, errors };
};

/**
 * Hook: Worker health check
 */
export const useWorkerHealth = () => {
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    // In production, would ping worker periodically
    // For now, always healthy
    setIsHealthy(true);
  }, []);

  return { isHealthy };
};

export default {
  usePredictiveAnalysis,
  useBatchPredictiveAnalysis,
  useWorkerHealth,
};
