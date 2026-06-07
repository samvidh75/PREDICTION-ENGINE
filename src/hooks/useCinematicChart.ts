/**
 * useCinematicChart Hook
 * Integration hook for Cinematic Chart Universe
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ChartRenderConfig,
  ChartAtmosphereConfig,
  CandlestickData,
  ChartTimeframe
} from '../types/ChartingTypes';
import {
  cinematicChartUniverse
} from '../services/charting/CinematicChartUniverse';

export function useCinematicChart() {
  const [renderConfig, setRenderConfigState] = useState<ChartRenderConfig>(
    cinematicChartUniverse.getRenderConfig()
  );
  const [atmosphereConfig, setAtmosphereConfigState] = useState<ChartAtmosphereConfig>(
    cinematicChartUniverse.getAtmosphereConfig()
  );
  const [holographicIntensity, setHolographicIntensityState] = useState(0.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      cinematicChartUniverse.initializeCanvas(canvasRef.current);
    }
  }, []);

  const setData = useCallback((data: CandlestickData[]) => {
    cinematicChartUniverse.setData(data);
  }, []);

  const setTimeframe = useCallback((timeframe: ChartTimeframe) => {
    cinematicChartUniverse.setTimeframe(timeframe);
  }, []);

  const setRenderConfig = useCallback((config: Partial<ChartRenderConfig>) => {
    cinematicChartUniverse.setRenderConfig(config);
    setRenderConfigState(cinematicChartUniverse.getRenderConfig());
  }, []);

  const setAtmosphereConfig = useCallback((config: Partial<ChartAtmosphereConfig>) => {
    cinematicChartUniverse.setAtmosphereConfig(config);
    setAtmosphereConfigState(cinematicChartUniverse.getAtmosphereConfig());
  }, []);

  const setHolographicIntensity = useCallback((intensity: number) => {
    cinematicChartUniverse.setHolographicIntensity(intensity);
    setHolographicIntensityState(intensity);
  }, []);

  const applyVolumetricDepth = useCallback((depth: number) => {
    cinematicChartUniverse.applyVolumetricDepth(depth);
  }, []);

  const applyCinematicLighting = useCallback((intensity: number) => {
    cinematicChartUniverse.applyCinematicLighting(intensity);
  }, []);

  const applyAtmosphericDrift = useCallback((enabled: boolean, speed: number) => {
    cinematicChartUniverse.applyAtmosphericDrift(enabled, speed);
  }, []);

  const setPulseBreathing = useCallback((enabled: boolean, intensity: number) => {
    cinematicChartUniverse.setPulseBreathing(enabled, intensity);
  }, []);

  const setNeuralPropagation = useCallback((enabled: boolean) => {
    cinematicChartUniverse.setNeuralPropagation(enabled);
  }, []);

  const getPriceRange = useCallback(() => {
    return cinematicChartUniverse.getPriceRange();
  }, []);

  const getTimeRange = useCallback(() => {
    return cinematicChartUniverse.getTimeRange();
  }, []);

  const getChartDimensions = useCallback(() => {
    return cinematicChartUniverse.getChartDimensions();
  }, []);

  const resetToDefault = useCallback(() => {
    cinematicChartUniverse.resetToDefault();
    setRenderConfigState(cinematicChartUniverse.getRenderConfig());
    setAtmosphereConfigState(cinematicChartUniverse.getAtmosphereConfig());
    setHolographicIntensityState(0.5);
  }, []);

  return {
    renderConfig,
    atmosphereConfig,
    holographicIntensity,
    canvasRef,
    setData,
    setTimeframe,
    setRenderConfig,
    setAtmosphereConfig,
    setHolographicIntensity,
    applyVolumetricDepth,
    applyCinematicLighting,
    applyAtmosphericDrift,
    setPulseBreathing,
    setNeuralPropagation,
    getPriceRange,
    getTimeRange,
    getChartDimensions,
    resetToDefault
  };
}
