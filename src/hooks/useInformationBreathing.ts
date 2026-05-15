/**
 * useInformationBreathing Hook
 * Integration hook for Information Breathing System
 */

import { useState, useCallback } from 'react';
import {
  InformationBreathingConfig,
  FocusContext
} from '../services/focusGuidance/FocusGuidanceTypes';
import {
  informationBreathingSystem
} from '../services/focusGuidance/InformationBreathingSystem';

export function useInformationBreathing() {
  const [config, setConfig] = useState<InformationBreathingConfig>(
    informationBreathingSystem.getCurrentConfig()
  );

  const setContentDensity = useCallback((density: number) => {
    informationBreathingSystem.setContentDensity(density);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const setReadingMode = useCallback((enabled: boolean) => {
    informationBreathingSystem.setReadingMode(enabled);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const adaptToContext = useCallback((context: FocusContext) => {
    informationBreathingSystem.adaptToContext(context);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const resetToDefault = useCallback(() => {
    informationBreathingSystem.resetToDefault();
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const applyHolographicIsolation = useCallback(() => {
    informationBreathingSystem.applyHolographicIsolation();
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const removeHolographicIsolation = useCallback(() => {
    informationBreathingSystem.removeHolographicIsolation();
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const applyAdaptiveSpacing = useCallback((multiplier: number) => {
    informationBreathingSystem.applyAdaptiveSpacing(multiplier);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const applyModularBreathingRoom = useCallback((level: number) => {
    informationBreathingSystem.applyModularBreathingRoom(level);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const applyCalmSeparationZones = useCallback((level: number) => {
    informationBreathingSystem.applyCalmSeparationZones(level);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const applyLayoutDecompression = useCallback((level: number) => {
    informationBreathingSystem.applyLayoutDecompression(level);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const applyDynamicWhitespace = useCallback((level: number) => {
    informationBreathingSystem.applyDynamicWhitespace(level);
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  const getSpacingValue = useCallback((baseSpacing: number, elementComplexity: number): number => {
    return informationBreathingSystem.getSpacingValue(baseSpacing, elementComplexity);
  }, []);

  const getModuleBreathingRoom = useCallback((): number => {
    return informationBreathingSystem.getModuleBreathingRoom();
  }, []);

  const getSeparationZoneSize = useCallback((): number => {
    return informationBreathingSystem.getSeparationZoneSize();
  }, []);

  const getLayoutDecompression = useCallback((): number => {
    return informationBreathingSystem.getLayoutDecompression();
  }, []);

  const getDynamicWhitespace = useCallback((): number => {
    return informationBreathingSystem.getDynamicWhitespace();
  }, []);

  const isCramped = useCallback((): boolean => {
    return informationBreathingSystem.isCramped();
  }, []);

  const autoDecompress = useCallback(() => {
    informationBreathingSystem.autoDecompress();
    setConfig(informationBreathingSystem.getCurrentConfig());
  }, []);

  return {
    config,
    setContentDensity,
    setReadingMode,
    adaptToContext,
    resetToDefault,
    applyHolographicIsolation,
    removeHolographicIsolation,
    applyAdaptiveSpacing,
    applyModularBreathingRoom,
    applyCalmSeparationZones,
    applyLayoutDecompression,
    applyDynamicWhitespace,
    getSpacingValue,
    getModuleBreathingRoom,
    getSeparationZoneSize,
    getLayoutDecompression,
    getDynamicWhitespace,
    isCramped,
    autoDecompress,
  };
}
