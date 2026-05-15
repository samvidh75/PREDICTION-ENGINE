/**
 * useVisualPriority Hook
 * Integration hook for Visual Priority Engine
 */

import { useState, useCallback, useEffect } from 'react';
import {
  VisualPriority,
  FocusContext,
  VisualPriorityConfig,
  FocusElement
} from '../services/focusGuidance/FocusGuidanceTypes';
import {
  visualPriorityEngine
} from '../services/focusGuidance/VisualPriorityEngine';

export function useVisualPriority() {
  const [priorityConfigs, setPriorityConfigs] = useState<Map<VisualPriority, VisualPriorityConfig>>(
    visualPriorityEngine.getAllPriorityConfigs()
  );
  const [currentContext, setCurrentContext] = useState<FocusContext>(FocusContext.GENERAL);

  const setFocusContext = useCallback((context: FocusContext) => {
    setCurrentContext(context);
    visualPriorityEngine.setFocusContext(context);
    setPriorityConfigs(new Map(visualPriorityEngine.getAllPriorityConfigs()));
  }, []);

  const registerElement = useCallback((element: FocusElement) => {
    visualPriorityEngine.registerElement(element);
  }, []);

  const unregisterElement = useCallback((elementId: string) => {
    visualPriorityEngine.unregisterElement(elementId);
  }, []);

  const getElementPriority = useCallback((elementId: string): VisualPriorityConfig | null => {
    return visualPriorityEngine.getElementPriority(elementId);
  }, []);

  const setElementPriority = useCallback((elementId: string, priority: VisualPriority) => {
    visualPriorityEngine.setElementPriority(elementId, priority);
    setPriorityConfigs(new Map(visualPriorityEngine.getAllPriorityConfigs()));
  }, []);

  const getElementsByPriority = useCallback((priority: VisualPriority): FocusElement[] => {
    return visualPriorityEngine.getElementsByPriority(priority);
  }, []);

  const applyAdaptiveBrightness = useCallback((density: number) => {
    visualPriorityEngine.applyAdaptiveBrightness(density);
    setPriorityConfigs(new Map(visualPriorityEngine.getAllPriorityConfigs()));
  }, []);

  const applyContrastScaling = useCallback((readabilityScore: number) => {
    visualPriorityEngine.applyContrastScaling(readabilityScore);
    setPriorityConfigs(new Map(visualPriorityEngine.getAllPriorityConfigs()));
  }, []);

  const applyGlowPrioritisation = useCallback((attentionScore: number) => {
    visualPriorityEngine.applyGlowPrioritisation(attentionScore);
    setPriorityConfigs(new Map(visualPriorityEngine.getAllPriorityConfigs()));
  }, []);

  const applyMotionEmphasis = useCallback((motionImportance: number) => {
    visualPriorityEngine.applyMotionEmphasis(motionImportance);
    setPriorityConfigs(new Map(visualPriorityEngine.getAllPriorityConfigs()));
  }, []);

  const applyEnvironmentalIsolation = useCallback((isolationLevel: number) => {
    visualPriorityEngine.applyEnvironmentalIsolation(isolationLevel);
    setPriorityConfigs(new Map(visualPriorityEngine.getAllPriorityConfigs()));
  }, []);

  return {
    priorityConfigs: Object.fromEntries(priorityConfigs) as Record<VisualPriority, VisualPriorityConfig>,
    currentContext,
    setFocusContext,
    registerElement,
    unregisterElement,
    getElementPriority,
    setElementPriority,
    getElementsByPriority,
    applyAdaptiveBrightness,
    applyContrastScaling,
    applyGlowPrioritisation,
    applyMotionEmphasis,
    applyEnvironmentalIsolation,
  };
}
