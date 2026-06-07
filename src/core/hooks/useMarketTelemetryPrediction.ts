/**
 * useMarketTelemetryPrediction Hook
 * High-level hook combining telemetry fetching and prediction generation
 * This is the primary interface for dashboard components to access market intelligence
 */

import { useMemo, useCallback } from 'react';
import { useMarketTelemetry, useMultipleTelemetry } from './useMarketData';
import PredictionEngine from '../../services/PredictionEngine';
import { PredictionPayload, ICompanyTelemetry } from '../../types/market';

/**
 * Single company telemetry + prediction hook
 */
export const useCompanyIntelligence = (
  symbol: string | null,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  // Fetch telemetry data
  const telemetryQuery = useMarketTelemetry(symbol, {
    enabled: !!symbol && options?.enabled !== false,
    refetchInterval: options?.refetchInterval,
  });

  // Generate prediction from telemetry
  const prediction = useMemo<PredictionPayload | null>(() => {
    if (!telemetryQuery.data) {
      return null;
    }

    return PredictionEngine.generatePrediction(telemetryQuery.data);
  }, [telemetryQuery.data]);

  // Check if prediction meets confidence threshold
  const meetsThreshold = useMemo(() => {
    if (!prediction) {
      return false;
    }
    return PredictionEngine.meetsPredictionThreshold(prediction);
  }, [prediction]);

  return {
    // Telemetry state
    telemetry: telemetryQuery.data,
    isLoadingTelemetry: telemetryQuery.isLoading,
    telemetryError: telemetryQuery.error,

    // Prediction state
    prediction,
    meetsConfidenceThreshold: meetsThreshold,
    confidencePercent: prediction ? Math.round(prediction.confidenceScore * 100) : 0,

    // Status indicators
    isHealthy:
      prediction &&
      (prediction.healthStatus === 'VERY_HEALTHY' || prediction.healthStatus === 'HEALTHY'),
    isStable: prediction && prediction.healthStatus === 'STABLE',
    isWeakening:
      prediction &&
      (prediction.healthStatus === 'WEAKENING' || prediction.healthStatus === 'UNHEALTHY'),

    // Refetch controls
    refetch: telemetryQuery.refetch,
  };
};

/**
 * Multiple companies telemetry + predictions hook
 * Ideal for watchlists and sector overviews
 */
export const useBatchIntelligence = (
  symbols: string[] | null,
  options?: {
    enabled?: boolean;
  }
) => {
  const { queries, data, isLoading, isError } = useMultipleTelemetry(symbols, {
    enabled: !!symbols && symbols.length > 0 && options?.enabled !== false,
  });

  // Generate predictions for all telemetries
  const predictions = useMemo<Map<string, PredictionPayload>>(() => {
    const map = new Map<string, PredictionPayload>();

    for (let i = 0; i < (symbols?.length || 0); i++) {
      const symbol = symbols?.[i];
      const telemetry = data[i];

      if (symbol && telemetry) {
        const prediction = PredictionEngine.generatePrediction(telemetry);
        map.set(symbol, prediction);
      }
    }

    return map;
  }, [data, symbols]);

  // Aggregate health statistics
  const healthStats = useMemo(
    () => {
      let veryHealthy = 0;
      let healthy = 0;
      let stable = 0;
      let weakening = 0;
      let unhealthy = 0;

      for (const prediction of predictions.values()) {
        switch (prediction.healthStatus) {
          case 'VERY_HEALTHY':
            veryHealthy++;
            break;
          case 'HEALTHY':
            healthy++;
            break;
          case 'STABLE':
            stable++;
            break;
          case 'WEAKENING':
            weakening++;
            break;
          case 'UNHEALTHY':
            unhealthy++;
            break;
        }
      }

      const total = veryHealthy + healthy + stable + weakening + unhealthy;

      return {
        veryHealthy,
        healthy,
        stable,
        weakening,
        unhealthy,
        total,
        healthyPercent: total > 0 ? Math.round(((veryHealthy + healthy) / total) * 100) : 0,
        weakPercent: total > 0 ? Math.round(((weakening + unhealthy) / total) * 100) : 0,
      };
    },
    [predictions]
  );

  // Get individual predictions by symbol
  const getPrediction = useCallback(
    (symbol: string): PredictionPayload | undefined => {
      return predictions.get(symbol);
    },
    [predictions]
  );

  return {
    // Telemetries
    telemetries: data,
    symbols: symbols || [],

    // Predictions
    predictions,
    getPrediction,

    // Statistics
    healthStats,
    totalSymbols: symbols?.length || 0,
    successCount: queries.filter((q) => q.isSuccess).length,
    errorCount: queries.filter((q) => q.isError).length,

    // Status
    isLoading,
    isError,
  };
};

/**
 * Utility hook for formatting prediction data for display
 */
export const useFormattedPrediction = (prediction: PredictionPayload | null) => {
  return useMemo(
    () => ({
      status: prediction?.healthStatus || 'UNKNOWN',
      statusColor: prediction ? PredictionEngine.getHealthStatusColor(prediction.healthStatus) : '#A3A3A3',
      statusDescription: prediction
        ? PredictionEngine.getHealthStatusDescription(prediction.healthStatus)
        : 'No data available',
      disclaimerText: prediction?.disclaimerText || '',
      confidencePercent: prediction ? Math.round(prediction.confidenceScore * 100) : 0,
      volatility: prediction?.volatilityIndex || 0,
      trend: prediction?.trendDirection || 'NEUTRAL',
    }),
    [prediction]
  );
};

export default {
  useCompanyIntelligence,
  useBatchIntelligence,
  useFormattedPrediction,
};
