/**
 * useAdaptiveContrast Hook
 * Integration hook for Adaptive Contrast Intelligence
 */

import { useState, useCallback } from 'react';
import {
  AdaptiveContrastConfig,
  FocusContext
} from '../services/focusGuidance/FocusGuidanceTypes';
import {
  adaptiveContrastIntelligence
} from '../services/focusGuidance/AdaptiveContrastIntelligence';

export function useAdaptiveContrast() {
  const [config, setConfig] = useState<AdaptiveContrastConfig>(
    adaptiveContrastIntelligence.getCurrentConfig()
  );

  const setHolographicIntensity = useCallback((intensity: number) => {
    adaptiveContrastIntelligence.setHolographicIntensity(intensity);
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const setTelemetryDensity = useCallback((density: number) => {
    adaptiveContrastIntelligence.setTelemetryDensity(density);
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const setInfographicDensity = useCallback((density: number) => {
    adaptiveContrastIntelligence.setInfographicDensity(density);
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const adaptToContext = useCallback((context: FocusContext) => {
    adaptiveContrastIntelligence.adaptToContext(context);
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const resetToDefault = useCallback(() => {
    adaptiveContrastIntelligence.resetToDefault();
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const applyAmbientLightAdaptation = useCallback((ambientLightLevel: number) => {
    adaptiveContrastIntelligence.applyAmbientLightAdaptation(ambientLightLevel);
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const applyContentBasedAdjustment = useCallback((complexity: number) => {
    adaptiveContrastIntelligence.applyContentBasedAdjustment(complexity);
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const applyNeonBalancing = useCallback((neonIntensity: number) => {
    adaptiveContrastIntelligence.applyNeonBalancing(neonIntensity);
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const applyHolographicReadabilityRules = useCallback(() => {
    adaptiveContrastIntelligence.applyHolographicReadabilityRules();
    setConfig(adaptiveContrastIntelligence.getCurrentConfig());
  }, []);

  const getPanelOpacity = useCallback((elementPriority: number): number => {
    return adaptiveContrastIntelligence.getPanelOpacity(elementPriority);
  }, []);

  const getTypographyBrightness = useCallback((elementPriority: number): number => {
    return adaptiveContrastIntelligence.getTypographyBrightness(elementPriority);
  }, []);

  const getEnvironmentalShadow = useCallback((): number => {
    return adaptiveContrastIntelligence.getEnvironmentalShadow();
  }, []);

  const getHolographicGlow = useCallback((): number => {
    return adaptiveContrastIntelligence.getHolographicGlow();
  }, []);

  const getNeonDiffusion = useCallback((): number => {
    return adaptiveContrastIntelligence.getNeonDiffusion();
  }, []);

  const getSectionSeparation = useCallback((): number => {
    return adaptiveContrastIntelligence.getSectionSeparation();
  }, []);

  return {
    config,
    setHolographicIntensity,
    setTelemetryDensity,
    setInfographicDensity,
    adaptToContext,
    resetToDefault,
    applyAmbientLightAdaptation,
    applyContentBasedAdjustment,
    applyNeonBalancing,
    applyHolographicReadabilityRules,
    getPanelOpacity,
    getTypographyBrightness,
    getEnvironmentalShadow,
    getHolographicGlow,
    getNeonDiffusion,
    getSectionSeparation,
  };
}
