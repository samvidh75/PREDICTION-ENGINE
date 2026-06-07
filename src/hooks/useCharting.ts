/**
 * useCharting Hook
 * Main integration hook for the Advanced Charting Universe
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChartState,
  ChartTimeframe,
  CandlestickData,
  ChartRenderConfig,
  ChartAtmosphereConfig
} from '../types/ChartingTypes';
import {
  cinematicChartUniverse
} from '../services/charting/CinematicChartUniverse';
import {
  liveTelemetryRenderingEngine
} from '../services/charting/LiveTelemetryRenderingEngine';
import {
  adaptiveCandlestickEcosystem
} from '../services/charting/AdaptiveCandlestickEcosystem';
import {
  multiLayerMarketIntelligenceOverlays
} from '../services/charting/MultiLayerMarketIntelligenceOverlays';
import {
  holographicIndicatorEnvironment
} from '../services/charting/HolographicIndicatorEnvironment';
import {
  laserGuidedChartInteraction
} from '../services/charting/LaserGuidedChartInteraction';
import {
  timeframeSystem
} from '../services/charting/TimeframeSystem';
import {
  week52RangeSystem
} from '../services/charting/Week52RangeSystem';
import {
  financialHistogramSystem
} from '../services/charting/FinancialHistogramSystem';
import {
  motionAtmosphereSystem
} from '../services/charting/MotionAtmosphereSystem';
import {
  beginnerInterpretationLayer
} from '../services/charting/BeginnerInterpretationLayer';
import {
  historicalReplayEngine
} from '../services/charting/HistoricalReplayEngine';
import {
  comparativeIntelligenceMapping
} from '../services/charting/ComparativeIntelligenceMapping';
import {
  aiAssistedVisualAnalysis
} from '../services/charting/AIAssistedVisualAnalysis';
import {
  mobileChartingExperience
} from '../services/charting/MobileChartingExperience';

export function useCharting() {
  const [state, setState] = useState<Partial<ChartState>>(() => ({
    ...cinematicChartUniverse.getChartState()
  }));
  const [isLive, setIsLive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize canvas on mount
  useEffect(() => {
    if (canvasRef.current) {
      cinematicChartUniverse.initializeCanvas(canvasRef.current);
    }
  }, []);

  // Set chart data
  const setData = useCallback((data: CandlestickData[]) => {
    cinematicChartUniverse.setData(data);
    adaptiveCandlestickEcosystem.setCandles(data);
    liveTelemetryRenderingEngine.clearLiveData();
    
    setState(prev => ({
      ...prev,
      data
    }));
  }, []);

  // Set timeframe
  const setTimeframe = useCallback(async (timeframe: ChartTimeframe) => {
    await timeframeSystem.setTimeframe(timeframe);
    
    setState(prev => ({
      ...prev,
      timeframe
    }));
  }, []);

  // Start live streaming
  const startLiveStreaming = useCallback(() => {
    liveTelemetryRenderingEngine.startStreaming();
    setIsLive(true);
  }, []);

  // Stop live streaming
  const stopLiveStreaming = useCallback(() => {
    liveTelemetryRenderingEngine.stopStreaming();
    setIsLive(false);
  }, []);

  // Update live data
  const updateLiveData = useCallback((data: CandlestickData) => {
    liveTelemetryRenderingEngine.updateLiveData(data);
    adaptiveCandlestickEcosystem.setCandles([
      ...adaptiveCandlestickEcosystem.getCandles(),
      data
    ]);
  }, []);

  // Set holographic intensity
  const setHolographicIntensity = useCallback((intensity: number) => {
    cinematicChartUniverse.setHolographicIntensity(intensity);
    adaptiveCandlestickEcosystem.setHolographicIntensity(intensity);
    multiLayerMarketIntelligenceOverlays.setHolographicIntensity(intensity);
    holographicIndicatorEnvironment.setHolographicIntensity(intensity);
    laserGuidedChartInteraction.setHolographicIntensity(intensity);
    week52RangeSystem.setHolographicIntensity(intensity);
    financialHistogramSystem.setHolographicIntensity(intensity);
    motionAtmosphereSystem.setHolographicIntensity(intensity);
    beginnerInterpretationLayer.setHolographicIntensity(intensity);
    historicalReplayEngine.setHolographicIntensity(intensity);
    comparativeIntelligenceMapping.setHolographicIntensity(intensity);
    aiAssistedVisualAnalysis.setHolographicIntensity(intensity);
    mobileChartingExperience.setHolographicIntensity(intensity);
  }, []);

  // Set render configuration
  const setRenderConfig = useCallback((config: Partial<ChartRenderConfig>) => {
    cinematicChartUniverse.setRenderConfig(config);
    
    setState(prev => ({
      ...prev,
      renderConfig: { ...cinematicChartUniverse.getRenderConfig(), ...config }
    }));
  }, []);

  // Set atmosphere configuration
  const setAtmosphereConfig = useCallback((config: Partial<ChartAtmosphereConfig>) => {
    cinematicChartUniverse.setAtmosphereConfig(config);
    motionAtmosphereSystem.setPulseBreathing(
      config.pulseBreathing ?? true,
      config.pulseIntensity ?? 0.3
    );
    motionAtmosphereSystem.setTelemetryDrift(
      config.telemetryDrift ?? true,
      config.driftSpeed ?? 0.5
    );
    
    setState(prev => ({
      ...prev,
      atmosphere: { ...cinematicChartUniverse.getAtmosphereConfig(), ...config }
    }));
  }, []);

  // Enable overlay
  const enableOverlay = useCallback((type: any) => {
    multiLayerMarketIntelligenceOverlays.enableOverlay(type);
  }, []);

  // Disable overlay
  const disableOverlay = useCallback((type: any) => {
    multiLayerMarketIntelligenceOverlays.disableOverlay(type);
  }, []);

  // Enable indicator
  const enableIndicator = useCallback((type: any) => {
    holographicIndicatorEnvironment.enableIndicator(type);
  }, []);

  // Disable indicator
  const disableIndicator = useCallback((type: any) => {
    holographicIndicatorEnvironment.disableIndicator(type);
  }, []);

  // Set hover position
  const setHoverPosition = useCallback((x: number, y: number) => {
    laserGuidedChartInteraction.setHoverPosition(x, y);
  }, []);

  // Clear hover
  const clearHover = useCallback(() => {
    laserGuidedChartInteraction.clearHover();
  }, []);

  // Set zoom level
  const setZoomLevel = useCallback((level: number) => {
    laserGuidedChartInteraction.setZoomLevel(level);
  }, []);

  // Enable beginner mode
  const enableBeginnerMode = useCallback(() => {
    beginnerInterpretationLayer.enableBeginnerMode();
  }, []);

  // Disable beginner mode
  const disableBeginnerMode = useCallback(() => {
    beginnerInterpretationLayer.disableBeginnerMode();
  }, []);

  // Start historical replay
  const startHistoricalReplay = useCallback(async () => {
    await historicalReplayEngine.startReplay();
  }, []);

  // Stop historical replay
  const stopHistoricalReplay = useCallback(() => {
    historicalReplayEngine.stopReplay();
  }, []);

  // Add company to comparison
  const addCompanyToComparison = useCallback((data: any) => {
    comparativeIntelligenceMapping.addCompanyToComparison(data);
  }, []);

  // Remove company from comparison
  const removeCompanyFromComparison = useCallback((symbol: string) => {
    comparativeIntelligenceMapping.removeCompanyFromComparison(symbol);
  }, []);

  // Generate AI analysis
  const generateAIAnalysis = useCallback((data: CandlestickData[], type: string) => {
    switch (type) {
      case 'volatility':
        return aiAssistedVisualAnalysis.generateVolatilityInterpretation(data);
      case 'liquidity':
        return aiAssistedVisualAnalysis.generateLiquidityInterpretation(data);
      case 'structural':
        return aiAssistedVisualAnalysis.generateStructuralTrendAnalysis(data);
      default:
        return null;
    }
  }, []);

  return {
    state,
    isLive,
    canvasRef,
    setData,
    setTimeframe,
    startLiveStreaming,
    stopLiveStreaming,
    updateLiveData,
    setHolographicIntensity,
    setRenderConfig,
    setAtmosphereConfig,
    enableOverlay,
    disableOverlay,
    enableIndicator,
    disableIndicator,
    setHoverPosition,
    clearHover,
    setZoomLevel,
    enableBeginnerMode,
    disableBeginnerMode,
    startHistoricalReplay,
    stopHistoricalReplay,
    addCompanyToComparison,
    removeCompanyFromComparison,
    generateAIAnalysis
  };
}
