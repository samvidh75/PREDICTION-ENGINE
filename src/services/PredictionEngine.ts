/**
 * StockStory Health Engine Service
 * Bridges ICompanyTelemetry data with StockStory Health / Research Signals
 * Outputs SEBI-safe formatted health assessments with confidence scores
 */

import {
  ICompanyTelemetry,
  PredictionPayload,
  PredictionEngineInput,
  HealthStatus,
  PredictionEngineInput as PredEngineInput,
} from '../types/market';
import MarketConfig from '../core/MarketConfig';

/**
 * Health status classification algorithm
 * Maps confidence scores and volatility to health states
 */
const classifyHealthStatus = (
  priceChange: number,
  volatility: number,
  peRatio: number,
  dividendYield: number
): { status: HealthStatus; confidence: number } => {
  // Normalize inputs
  const changeWeight = Math.abs(priceChange) > 5 ? 0.3 : Math.abs(priceChange) > 2 ? 0.5 : 0.8;
  const volatilityScore = Math.min(volatility / 100, 1.0); // 0-1
  const peScore = peRatio > 0 ? Math.min(peRatio / 50, 1.0) : 0.5; // Lower PE is healthier
  const divScore = dividendYield > 0 ? Math.min(dividendYield / 5, 1.0) : 0.3; // Higher div yield is healthier

  // Composite health score (0-1)
  const healthScore =
    changeWeight * 0.3 + (1 - volatilityScore) * 0.3 + (1 - peScore) * 0.2 + divScore * 0.2;

  // Confidence is based on data completeness
  const hasCompleteData = Number(peRatio > 0) + Number(dividendYield > 0) + Number(volatility > 0);
  const confidence = 0.6 + (hasCompleteData / 3) * 0.4; // 60-100% confidence

  // Map health score to status
  let status: HealthStatus;
  if (healthScore >= 0.85) {
    status = 'VERY_HEALTHY';
  } else if (healthScore >= 0.70) {
    status = 'HEALTHY';
  } else if (healthScore >= 0.50) {
    status = 'STABLE';
  } else if (healthScore >= 0.30) {
    status = 'WEAKENING';
  } else {
    status = 'UNHEALTHY';
  }

  return { status, confidence: Math.round(confidence * 100) / 100 };
};

/**
 * Calculate volatility from price change
 * Simplified estimate based on daily change percentage
 */
const calculateVolatilityIndex = (priceChangePercent: number): number => {
  // Map price change to VIX-like scale (0-100)
  // Typical daily moves are ±2-3%, which translates to VIX ~20-30
  const volatility = Math.abs(priceChangePercent) * 15; // Scale up daily change
  return Math.min(volatility, 100);
};

/**
 * Determine trend direction
 */
const determineTrendDirection = (
  priceChange: number
): 'UPTREND' | 'DOWNTREND' | 'NEUTRAL' => {
  if (Math.abs(priceChange) < 0.5) {
    return 'NEUTRAL';
  }
  return priceChange > 0 ? 'UPTREND' : 'DOWNTREND';
};

/**
 * Format SEBI-safe disclaimer text
 */
const formatDisclaimerText = (status: HealthStatus, confidence: number): string => {
  const statusDescriptions: Record<HealthStatus, string> = {
    VERY_HEALTHY: 'very healthy',
    HEALTHY: 'healthy',
    STABLE: 'structurally stable',
    WEAKENING: 'weakening',
    UNHEALTHY: 'deteriorating',
  };

  return (
    `Market data suggests ${statusDescriptions[status]} structural conditions, ` +
    `with a historical confidence interval of ${confidence}%. ` +
    `This represents a historical analytical trend and does not constitute financial advice.`
  );
};

/**
 * Core prediction engine
 * Takes ICompanyTelemetry and produces PredictionPayload
 */
export const generatePrediction = (
  telemetry: ICompanyTelemetry,
  historicalContext?: {
    previous52WeekHigh?: number;
    previous52WeekLow?: number;
    ma50?: number;
    ma200?: number;
  }
): PredictionPayload => {
  try {
    // Validate input
    if (!telemetry || !telemetry.symbol) {
      throw new Error('Invalid telemetry data');
    }

    // Calculate volatility
    const volatility = calculateVolatilityIndex(telemetry.priceChangePercent);

    // Classify health status
    const { status, confidence } = classifyHealthStatus(
      telemetry.priceChange,
      volatility,
      telemetry.peRatio,
      telemetry.dividendYield
    );

    // Determine trend
    const trendDirection = determineTrendDirection(telemetry.priceChange);

    // Format disclaimer
    const disclaimerText = formatDisclaimerText(status, confidence);

    // Generate unique prediction ID
    const predictionId = `PRED_${telemetry.symbol}_${Date.now()}`;

    return {
      predictionId,
      symbol: telemetry.symbol,
      timestamp: telemetry.timestamp,
      confidenceScore: confidence / 100, // Convert to 0-1 scale
      healthStatus: status,
      trendDirection,
      volatilityIndex: Math.round(volatility),
      disclaimerText,
    };
  } catch (error) {
    console.error('Prediction generation error:', error);

    // Fallback prediction
    return {
      predictionId: `PRED_ERROR_${Date.now()}`,
      symbol: telemetry?.symbol || 'UNKNOWN',
      timestamp: Date.now(),
      confidenceScore: 0,
      healthStatus: 'STABLE',
      trendDirection: 'NEUTRAL',
      volatilityIndex: 50,
      disclaimerText:
        'Telemetry unavailable. This represents a historical analytical trend and does not constitute financial advice.',
    };
  }
};

/**
 * Batch predictions for multiple telemetries
 */
export const generateBatchPredictions = (
  telemetries: ICompanyTelemetry[]
): Map<string, PredictionPayload> => {
  const predictions = new Map<string, PredictionPayload>();

  for (const telemetry of telemetries) {
    const prediction = generatePrediction(telemetry);
    predictions.set(telemetry.symbol, prediction);
  }

  return predictions;
};

/**
 * Validate prediction meets confidence threshold
 */
export const meetsPredictionThreshold = (prediction: PredictionPayload): boolean => {
  return prediction.confidenceScore >= MarketConfig.confidenceThreshold;
};

/**
 * Get color code for health status
 * Used by UI components for consistent visualization
 */
export const getHealthStatusColor = (status: HealthStatus): string => {
  const colorMap: Record<HealthStatus, string> = {
    VERY_HEALTHY: '#06B6D4', // Cyan
    HEALTHY: '#06B6D4', // Cyan
    STABLE: '#A3A3A3', // Neutral gray
    WEAKENING: '#D946EF', // Magenta
    UNHEALTHY: '#D946EF', // Magenta
  };

  return colorMap[status];
};

/**
 * Get human-readable description of health status
 */
export const getHealthStatusDescription = (status: HealthStatus): string => {
  const descriptions: Record<HealthStatus, string> = {
    VERY_HEALTHY: 'Excellent structural conditions',
    HEALTHY: 'Strong market positioning',
    STABLE: 'Neutral structural equilibrium',
    WEAKENING: 'Declining operational metrics',
    UNHEALTHY: 'Deteriorating fundamental position',
  };

  return descriptions[status];
};

export default {
  generatePrediction,
  generateBatchPredictions,
  meetsPredictionThreshold,
  getHealthStatusColor,
  getHealthStatusDescription,
};
