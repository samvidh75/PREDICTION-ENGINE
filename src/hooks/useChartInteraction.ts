/**
 * useChartInteraction Hook
 * Integration hook for Laser-Guided Chart Interaction
 */

import { useState, useCallback } from 'react';
import {
  ChartInteractionState
} from '../types/ChartingTypes';
import {
  laserGuidedChartInteraction
} from '../services/charting/LaserGuidedChartInteraction';

export function useChartInteraction() {
  const [interactionState, setInteractionStateState] = useState<ChartInteractionState>(
    laserGuidedChartInteraction.getInteractionState()
  );
  const [zoomLevel, setZoomLevelState] = useState(1);
  const [panOffset, setPanOffsetState] = useState({ x: 0, y: 0 });
  const [holographicIntensity, setHolographicIntensityState] = useState(0.5);

  const setHoverPosition = useCallback((x: number, y: number) => {
    laserGuidedChartInteraction.setHoverPosition(x, y);
    setInteractionStateState(laserGuidedChartInteraction.getInteractionState());
  }, []);

  const clearHover = useCallback(() => {
    laserGuidedChartInteraction.clearHover();
    setInteractionStateState(laserGuidedChartInteraction.getInteractionState());
  }, []);

  const setCrosshairEnabled = useCallback((enabled: boolean) => {
    laserGuidedChartInteraction.setCrosshairEnabled(enabled);
    setInteractionStateState(laserGuidedChartInteraction.getInteractionState());
  }, []);

  const setZoomLevel = useCallback((level: number) => {
    laserGuidedChartInteraction.setZoomLevel(level);
    setZoomLevelState(laserGuidedChartInteraction.getZoomLevel());
  }, []);

  const setPanOffset = useCallback((x: number, y: number) => {
    laserGuidedChartInteraction.setPanOffset(x, y);
    setPanOffsetState(laserGuidedChartInteraction.getPanOffset());
  }, []);

  const setSelectedRange = useCallback((start: number, end: number) => {
    laserGuidedChartInteraction.setSelectedRange(start, end);
    setInteractionStateState(laserGuidedChartInteraction.getInteractionState());
  }, []);

  const clearSelectedRange = useCallback(() => {
    laserGuidedChartInteraction.clearSelectedRange();
    setInteractionStateState(laserGuidedChartInteraction.getInteractionState());
  }, []);

  const setHolographicIntensity = useCallback((intensity: number) => {
    laserGuidedChartInteraction.setHolographicIntensity(intensity);
    setHolographicIntensityState(intensity);
  }, []);

  const calculateHolographicCrosshair = useCallback(() => {
    return laserGuidedChartInteraction.calculateHolographicCrosshair();
  }, []);

  const calculateAdaptiveTelemetryFocus = useCallback(() => {
    return laserGuidedChartInteraction.calculateAdaptiveTelemetryFocus();
  }, []);

  const calculateVolumetricHoverSystem = useCallback(() => {
    return laserGuidedChartInteraction.calculateVolumetricHoverSystem();
  }, []);

  const calculateCinematicZoomTransition = useCallback((fromLevel: number, toLevel: number) => {
    return laserGuidedChartInteraction.calculateCinematicZoomTransition(fromLevel, toLevel);
  }, []);

  const calculateNeuralInteractionPropagation = useCallback(() => {
    return laserGuidedChartInteraction.calculateNeuralInteractionPropagation();
  }, []);

  const calculateEdgeSharpening = useCallback(() => {
    return laserGuidedChartInteraction.calculateEdgeSharpening();
  }, []);

  const calculateGlowDiffusion = useCallback(() => {
    return laserGuidedChartInteraction.calculateGlowDiffusion();
  }, []);

  const calculateEnvironmentalShadowAdjustment = useCallback(() => {
    return laserGuidedChartInteraction.calculateEnvironmentalShadowAdjustment();
  }, []);

  const calculateTypographyClarity = useCallback(() => {
    return laserGuidedChartInteraction.calculateTypographyClarity();
  }, []);

  const resetToDefault = useCallback(() => {
    laserGuidedChartInteraction.resetToDefault();
    setInteractionStateState(laserGuidedChartInteraction.getInteractionState());
    setZoomLevelState(1);
    setPanOffsetState({ x: 0, y: 0 });
    setHolographicIntensityState(0.5);
  }, []);

  return {
    interactionState,
    zoomLevel,
    panOffset,
    holographicIntensity,
    setHoverPosition,
    clearHover,
    setCrosshairEnabled,
    setZoomLevel,
    setPanOffset,
    setSelectedRange,
    clearSelectedRange,
    setHolographicIntensity,
    calculateHolographicCrosshair,
    calculateAdaptiveTelemetryFocus,
    calculateVolumetricHoverSystem,
    calculateCinematicZoomTransition,
    calculateNeuralInteractionPropagation,
    calculateEdgeSharpening,
    calculateGlowDiffusion,
    calculateEnvironmentalShadowAdjustment,
    calculateTypographyClarity,
    resetToDefault
  };
}
