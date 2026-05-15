/**
 * useCognitiveLoad Hook
 * Integration hook for Cognitive Load Optimiser
 */

import { useState, useCallback } from 'react';
import {
  CognitiveLoadConfig,
  CognitiveLoadLevel,
  FocusContext
} from '../services/focusGuidance/FocusGuidanceTypes';
import {
  cognitiveLoadOptimiser
} from '../services/focusGuidance/CognitiveLoadOptimiser';

export function useCognitiveLoad() {
  const [config, setConfig] = useState<CognitiveLoadConfig>(
    cognitiveLoadOptimiser.getCurrentConfig()
  );
  const [loadLevel, setLoadLevelState] = useState<CognitiveLoadLevel>(
    cognitiveLoadOptimiser.getLoadLevel()
  );

  const setLoadMetric = useCallback((metric: string, value: number) => {
    cognitiveLoadOptimiser.setLoadMetric(metric, value);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
  }, []);

  const adaptToContext = useCallback((context: FocusContext) => {
    cognitiveLoadOptimiser.adaptToContext(context);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
  }, []);

  const resetToDefault = useCallback(() => {
    cognitiveLoadOptimiser.resetToDefault();
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
  }, []);

  const applyVisualSimplification = useCallback((level: number) => {
    cognitiveLoadOptimiser.applyVisualSimplification(level);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
  }, []);

  const applyAnimationReduction = useCallback((level: number) => {
    cognitiveLoadOptimiser.applyAnimationReduction(level);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
  }, []);

  const applyLayoutDecompression = useCallback((level: number) => {
    cognitiveLoadOptimiser.applyLayoutDecompression(level);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
  }, []);

  const applyHolographicSoftening = useCallback((level: number) => {
    cognitiveLoadOptimiser.applyHolographicSoftening(level);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
  }, []);

  const getVisualSimplification = useCallback((): number => {
    return cognitiveLoadOptimiser.getVisualSimplification();
  }, []);

  const getAnimationReduction = useCallback((): number => {
    return cognitiveLoadOptimiser.getAnimationReduction();
  }, []);

  const getLayoutDecompression = useCallback((): number => {
    return cognitiveLoadOptimiser.getLayoutDecompression();
  }, []);

  const getHolographicSoftening = useCallback((): number => {
    return cognitiveLoadOptimiser.getHolographicSoftening();
  }, []);

  const detectVisualOverload = useCallback((elementCount: number, complexityScore: number): number => {
    const overload = cognitiveLoadOptimiser.detectVisualOverload(elementCount, complexityScore);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
    return overload;
  }, []);

  const detectTelemetryDensity = useCallback((telemetryCount: number, areaSize: number): number => {
    const density = cognitiveLoadOptimiser.detectTelemetryDensity(telemetryCount, areaSize);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
    return density;
  }, []);

  const detectMotionCongestion = useCallback((activeAnimations: number): number => {
    const congestion = cognitiveLoadOptimiser.detectMotionCongestion(activeAnimations);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
    return congestion;
  }, []);

  const detectContrastConflicts = useCallback((contrastVariance: number): number => {
    cognitiveLoadOptimiser.detectContrastConflicts(contrastVariance);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
    return contrastVariance;
  }, []);

  const detectInfographicSaturation = useCallback((infographicCount: number, totalArea: number): number => {
    const saturation = cognitiveLoadOptimiser.detectInfographicSaturation(infographicCount, totalArea);
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
    return saturation;
  }, []);

  const autoOptimise = useCallback(() => {
    cognitiveLoadOptimiser.autoOptimise();
    setConfig(cognitiveLoadOptimiser.getCurrentConfig());
    setLoadLevelState(cognitiveLoadOptimiser.getLoadLevel());
  }, []);

  return {
    config,
    loadLevel,
    setLoadMetric,
    adaptToContext,
    resetToDefault,
    applyVisualSimplification,
    applyAnimationReduction,
    applyLayoutDecompression,
    applyHolographicSoftening,
    getVisualSimplification,
    getAnimationReduction,
    getLayoutDecompression,
    getHolographicSoftening,
    detectVisualOverload,
    detectTelemetryDensity,
    detectMotionCongestion,
    detectContrastConflicts,
    detectInfographicSaturation,
    autoOptimise,
  };
}
