/**
 * Holographic Overlay Utilities
 * Geometric calculations and SVG path generation for probabilistic visualizations
 */
import React from 'react';

export interface ProbabilityPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

export interface HologramConfig {
  width: number;
  height: number;
  padding: number;
  gridSize: number;
  animationDuration: number;
}

const DEFAULT_CONFIG: HologramConfig = {
  width: Math.min(400, typeof window !== 'undefined' ? window.innerWidth - 32 : 400),
  height: 300,
  padding: 20,
  gridSize: 40,
  animationDuration: 0.6,
};

/**
 * Generate SVG path for probability distribution curve
 * Uses cubic Bezier curves for smooth visualization
 */
export const generateProbabilityPath = (
  probabilities: number[],
  config: HologramConfig = DEFAULT_CONFIG
): string => {
  const { width, height, padding } = config;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const pointCount = probabilities.length;
  const pointSpacing = chartWidth / (pointCount - 1);

  const points: ProbabilityPoint[] = probabilities.map((value, index) => ({
    x: padding + index * pointSpacing,
    y: padding + chartHeight - value * chartHeight,
    value,
    label: `P${index}`,
  }));

  return generateCubicBezierPath(points);
};

/**
 * Generate cubic Bezier curve through points
 * Creates smooth, continuous probability distribution visualization
 */
export const generateCubicBezierPath = (points: ProbabilityPoint[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    // Calculate control points for smooth curve
    const cp1x = current.x + (next.x - current.x) / 3;
    const cp1y = current.y;
    const cp2x = next.x - (next.x - current.x) / 3;
    const cp2y = next.y;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return path;
};

/**
 * Calculate gradient vector for telemetry visualization
 * Maps volatility and liquidity to visual intensity
 */
export const calculateGradientVector = (
  volatility: number,
  liquidity: number
): { angle: number; intensity: number } => {
  const volatilityNorm = Math.min(volatility / 100, 1);
  const liquidityNorm = Math.min(liquidity / 100, 1);

  // Calculate angle from volatility (0-360 degrees)
  const angle = volatilityNorm * 360;

  // Calculate intensity from combined metric
  const intensity = Math.sqrt(volatilityNorm ** 2 + liquidityNorm ** 2) / Math.sqrt(2);

  return { angle, intensity };
};

/**
 * Generate radial gradient for health visualization
 * Creates holographic "glow" effect based on confidence
 */
export const generateRadialGradient = (
  confidence: number,
  healthStatus: 'VERY_HEALTHY' | 'HEALTHY' | 'STABLE' | 'WEAKENING' | 'UNHEALTHY'
): { startColor: string; endColor: string; opacity: number } => {
  const opacityMap = {
    VERY_HEALTHY: 0.9,
    HEALTHY: 0.8,
    STABLE: 0.6,
    WEAKENING: 0.7,
    UNHEALTHY: 0.8,
  };

  const colorMap = {
    VERY_HEALTHY: { start: '#06B6D4', end: '#0EA5E9' },
    HEALTHY: { start: '#06B6D4', end: '#0EA5E9' },
    STABLE: { start: '#A3A3A3', end: '#737373' },
    WEAKENING: { start: '#D946EF', end: '#EC4899' },
    UNHEALTHY: { start: '#D946EF', end: '#EC4899' },
  };

  return {
    startColor: colorMap[healthStatus].start,
    endColor: colorMap[healthStatus].end,
    opacity: opacityMap[healthStatus] * confidence,
  };
};

/**
 * Generate volumetric data points for 3D visualization
 * Creates depth perception through opacity and scaling
 */
export const generateVolumetricPoints = (
  baseData: number[],
  layerCount: number = 3
): Array<{ x: number; y: number; z: number; opacity: number; scale: number }> => {
  const points: Array<{ x: number; y: number; z: number; opacity: number; scale: number }> = [];

  for (let layer = 0; layer < layerCount; layer++) {
    const layerOpacity = 1 - layer / layerCount;
    const layerScale = 1 + layer * 0.15;

    for (let i = 0; i < baseData.length; i++) {
      points.push({
        x: i,
        y: baseData[i],
        z: layer,
        opacity: layerOpacity * 0.6,
        scale: layerScale,
      });
    }
  }

  return points;
};

/**
 * Calculate telemetry density (visual complexity)
 * Determines GPU load and animation performance
 */
export const calculateTelemetryDensity = (
  dataPoints: number,
  timeWindow: number
): number => {
  // Density = points per second
  // Target: 60fps = 16.67ms per frame
  return dataPoints / timeWindow;
};

/**
 * Throttle animation frame rate for performance
 * Ensures 60fps visualization even with dense data
 */
export const calculateOptimalFrameRate = (density: number): number => {
  const targetFps = 60;
  const maxDensity = 1000; // Points per second

  if (density <= maxDensity / targetFps) {
    return targetFps; // Full 60fps
  } else if (density <= (maxDensity / targetFps) * 2) {
    return 30; // Half rate
  } else {
    return 15; // Quarter rate
  }
};

/**
 * Generate confidence contour line
 * Visual indicator of prediction confidence threshold
 */
export const generateConfidenceContour = (
  confidence: number,
  width: number,
  height: number
): string => {
  // Contour line at confidence threshold
  const y = height * (1 - confidence);
  return `M 0 ${y} L ${width} ${y}`;
};

/**
 * Map probability to visual coordinate
 * Converts probability value to SVG coordinate system
 */
export const mapProbabilityToCoordinate = (
  probability: number,
  width: number,
  height: number,
  padding: number = 20
): { x: number; y: number } => {
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  return {
    x: padding + chartWidth / 2, // Center X
    y: padding + (1 - probability) * chartHeight,
  };
};

/**
 * Calculate SVG filter for holographic effect
 * Blur + glow combination
 */
export const getHolographicFilter = (): JSX.Element => (
  <defs>
    <filter id="holographicGlow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="holographicBlur">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
    </filter>

    <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#06B6D4" stopOpacity="1" />
      <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.5" />
      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
    </linearGradient>
  </defs>
);

/**
 * Utility: Format confidence percentage with styling
 */
export const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

/**
 * Utility: Get confidence category
 */
export const getConfidenceCategory = (
  confidence: number
): 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW' => {
  if (confidence >= 0.85) return 'VERY_HIGH';
  if (confidence >= 0.70) return 'HIGH';
  if (confidence >= 0.50) return 'MEDIUM';
  if (confidence >= 0.30) return 'LOW';
  return 'VERY_LOW';
};

export default {
  generateProbabilityPath,
  generateCubicBezierPath,
  calculateGradientVector,
  generateRadialGradient,
  generateVolumetricPoints,
  calculateTelemetryDensity,
  calculateOptimalFrameRate,
  generateConfidenceContour,
  mapProbabilityToCoordinate,
  getHolographicFilter,
  formatConfidence,
  getConfidenceCategory,
};
