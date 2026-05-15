/**
 * useTimeframe Hook
 * Integration hook for Timeframe System
 */

import { useState, useCallback } from 'react';
import {
  ChartTimeframe,
  CandlestickData
} from '../types/ChartingTypes';
import {
  timeframeSystem
} from '../services/charting/TimeframeSystem';

export function useTimeframe() {
  const [currentTimeframe, setCurrentTimeframeState] = useState<ChartTimeframe>(
    timeframeSystem.getCurrentTimeframe()
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [holographicIntensity, setHolographicIntensityState] = useState(0.5);

  const setTimeframe = useCallback(async (timeframe: ChartTimeframe) => {
    setIsTransitioning(true);
    await timeframeSystem.setTimeframe(timeframe);
    setCurrentTimeframeState(timeframeSystem.getCurrentTimeframe());
    setIsTransitioning(false);
    setTransitionProgress(0);
  }, []);

  const zoomIn = useCallback(async () => {
    await timeframeSystem.zoomIn();
    setCurrentTimeframeState(timeframeSystem.getCurrentTimeframe());
  }, []);

  const zoomOut = useCallback(async () => {
    await timeframeSystem.zoomOut();
    setCurrentTimeframeState(timeframeSystem.getCurrentTimeframe());
  }, []);

  const setHolographicIntensity = useCallback((intensity: number) => {
    timeframeSystem.setHolographicIntensity(intensity);
    setHolographicIntensityState(intensity);
  }, []);

  const filterDataByTimeframe = useCallback((data: CandlestickData[], timeframe: ChartTimeframe) => {
    return timeframeSystem.filterDataByTimeframe(data, timeframe);
  }, []);

  const getAvailableTimeframes = useCallback(() => {
    return timeframeSystem.getAvailableTimeframes();
  }, []);

  const getTimeframeDisplayName = useCallback((timeframe: ChartTimeframe) => {
    return timeframeSystem.getTimeframeDisplayName(timeframe);
  }, []);

  const getNextTimeframe = useCallback(() => {
    return timeframeSystem.getNextTimeframe();
  }, []);

  const getPreviousTimeframe = useCallback(() => {
    return timeframeSystem.getPreviousTimeframe();
  }, []);

  const calculateCinematicTransitionEffects = useCallback(() => {
    return timeframeSystem.calculateCinematicTransitionEffects();
  }, []);

  const resetToDefault = useCallback(() => {
    timeframeSystem.resetToDefault();
    setCurrentTimeframeState(timeframeSystem.getCurrentTimeframe());
    setHolographicIntensityState(0.5);
  }, []);

  return {
    currentTimeframe,
    isTransitioning,
    transitionProgress,
    holographicIntensity,
    setTimeframe,
    zoomIn,
    zoomOut,
    setHolographicIntensity,
    filterDataByTimeframe,
    getAvailableTimeframes,
    getTimeframeDisplayName,
    getNextTimeframe,
    getPreviousTimeframe,
    calculateCinematicTransitionEffects,
    resetToDefault
  };
}
