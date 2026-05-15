/**
 * useCinematicLighting Hook
 * Integration hook for Cinematic Focus Lighting
 */

import { useState, useCallback } from 'react';
import {
  CinematicLightingConfig,
  FocusContext,
  VisualPriority
} from '../services/focusGuidance/FocusGuidanceTypes';
import {
  cinematicFocusLighting
} from '../services/focusGuidance/CinematicFocusLighting';

export function useCinematicLighting() {
  const [config, setConfig] = useState<CinematicLightingConfig>(
    cinematicFocusLighting.getCurrentConfig()
  );

  const setFocusTarget = useCallback((elementId: string | null) => {
    cinematicFocusLighting.setFocusTarget(elementId);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const setLightingIntensity = useCallback((intensity: number) => {
    cinematicFocusLighting.setLightingIntensity(intensity);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const adaptToContext = useCallback((context: FocusContext) => {
    cinematicFocusLighting.adaptToContext(context);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const resetToDefault = useCallback(() => {
    cinematicFocusLighting.resetToDefault();
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const applyAdaptiveGlowDiffusion = useCallback((diffusionLevel: number) => {
    cinematicFocusLighting.applyAdaptiveGlowDiffusion(diffusionLevel);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const applyVolumetricFocus = useCallback((focusLevel: number) => {
    cinematicFocusLighting.applyVolumetricFocus(focusLevel);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const applySectionIsolation = useCallback((isolationLevel: number) => {
    cinematicFocusLighting.applySectionIsolation(isolationLevel);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const applySpatialSpotlight = useCallback((spotlightIntensity: number) => {
    cinematicFocusLighting.applySpatialSpotlight(spotlightIntensity);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const applyLaserEdgeEmphasis = useCallback((emphasisLevel: number) => {
    cinematicFocusLighting.applyLaserEdgeEmphasis(emphasisLevel);
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const getLightingForPriority = useCallback((priority: VisualPriority): CinematicLightingConfig => {
    return cinematicFocusLighting.getLightingForPriority(priority);
  }, []);

  const applyMicroFocusLighting = useCallback(() => {
    cinematicFocusLighting.applyMicroFocusLighting();
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const removeMicroFocusLighting = useCallback(() => {
    cinematicFocusLighting.removeMicroFocusLighting();
    setConfig(cinematicFocusLighting.getCurrentConfig());
  }, []);

  const getGlowDiffusion = useCallback((): number => {
    return cinematicFocusLighting.getGlowDiffusion();
  }, []);

  const getVolumetricFocus = useCallback((): number => {
    return cinematicFocusLighting.getVolumetricFocus();
  }, []);

  const getSectionIsolation = useCallback((): number => {
    return cinematicFocusLighting.getSectionIsolation();
  }, []);

  const getSpatialSpotlight = useCallback((): number => {
    return cinematicFocusLighting.getSpatialSpotlight();
  }, []);

  const getLaserEdgeEmphasis = useCallback((): number => {
    return cinematicFocusLighting.getLaserEdgeEmphasis();
  }, []);

  return {
    config,
    setFocusTarget,
    setLightingIntensity,
    adaptToContext,
    resetToDefault,
    applyAdaptiveGlowDiffusion,
    applyVolumetricFocus,
    applySectionIsolation,
    applySpatialSpotlight,
    applyLaserEdgeEmphasis,
    getLightingForPriority,
    applyMicroFocusLighting,
    removeMicroFocusLighting,
    getGlowDiffusion,
    getVolumetricFocus,
    getSectionIsolation,
    getSpatialSpotlight,
    getLaserEdgeEmphasis,
  };
}
