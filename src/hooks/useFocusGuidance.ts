/**
 * useFocusGuidance Hook
 * Main integration hook for the Adaptive Focus Guidance System
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FocusContext,
  VisualPriority,
  MotionPriority,
  FocusGuidanceState,
  FocusElement
} from '../services/focusGuidance/FocusGuidanceTypes';
import {
  visualPriorityEngine
} from '../services/focusGuidance/VisualPriorityEngine';
import {
  adaptiveContrastIntelligence
} from '../services/focusGuidance/AdaptiveContrastIntelligence';
import {
  cinematicFocusLighting
} from '../services/focusGuidance/CinematicFocusLighting';
import {
  informationBreathingSystem
} from '../services/focusGuidance/InformationBreathingSystem';
import {
  hierarchicalMotionPriority
} from '../services/focusGuidance/HierarchicalMotionPriority';
import {
  focusLockEnvironment
} from '../services/focusGuidance/FocusLockEnvironment';
import {
  adaptiveEmphasisEngine
} from '../services/focusGuidance/AdaptiveEmphasisEngine';
import {
  spatialCalmnessArchitecture
} from '../services/focusGuidance/SpatialCalmnessArchitecture';
import {
  cognitiveLoadOptimiser
} from '../services/focusGuidance/CognitiveLoadOptimiser';
import {
  environmentalReadabilityLayer
} from '../services/focusGuidance/EnvironmentalReadabilityLayer';

export function useFocusGuidance() {
  const [state, setState] = useState<FocusGuidanceState>(() => ({
    focus: visualPriorityEngine.getFocusState(),
    visualPriority: Object.fromEntries(
      visualPriorityEngine.getAllPriorityConfigs()
    ) as any,
    adaptiveContrast: adaptiveContrastIntelligence.getCurrentConfig(),
    cinematicLighting: cinematicFocusLighting.getCurrentConfig(),
    informationBreathing: informationBreathingSystem.getCurrentConfig(),
    motionPriority: {
      [MotionPriority.NONE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.NONE),
      [MotionPriority.MINIMAL]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.MINIMAL),
      [MotionPriority.SUBTLE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.SUBTLE),
      [MotionPriority.GENTLE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.GENTLE),
      [MotionPriority.MODERATE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.MODERATE),
    } as any,
    focusLock: focusLockEnvironment.getCurrentConfig(),
    adaptiveEmphasis: adaptiveEmphasisEngine.getCurrentConfig(),
    spatialCalmness: spatialCalmnessArchitecture.getCurrentConfig(),
    cognitiveLoad: cognitiveLoadOptimiser.getCurrentConfig(),
    environmentalReadability: environmentalReadabilityLayer.getCurrentConfig(),
  }));

  const [currentContext, setCurrentContextState] = useState<FocusContext>(FocusContext.GENERAL);

  // Update state when context changes
  const setFocusContext = useCallback((context: FocusContext) => {
    setCurrentContextState(context);
    
    // Update all systems with new context
    visualPriorityEngine.setFocusContext(context);
    adaptiveContrastIntelligence.adaptToContext(context);
    cinematicFocusLighting.adaptToContext(context);
    informationBreathingSystem.adaptToContext(context);
    hierarchicalMotionPriority.adaptToContext(context);
    focusLockEnvironment.adaptToContext(context);
    adaptiveEmphasisEngine.adaptToContext(context);
    spatialCalmnessArchitecture.adaptToContext(context);
    cognitiveLoadOptimiser.adaptToContext(context);
    environmentalReadabilityLayer.adaptToContext(context);

    // Update state
    setState({
      focus: visualPriorityEngine.getFocusState(),
      visualPriority: Object.fromEntries(
        visualPriorityEngine.getAllPriorityConfigs()
      ) as any,
      adaptiveContrast: adaptiveContrastIntelligence.getCurrentConfig(),
      cinematicLighting: cinematicFocusLighting.getCurrentConfig(),
      informationBreathing: informationBreathingSystem.getCurrentConfig(),
      motionPriority: {
        [MotionPriority.NONE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.NONE),
        [MotionPriority.MINIMAL]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.MINIMAL),
        [MotionPriority.SUBTLE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.SUBTLE),
        [MotionPriority.GENTLE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.GENTLE),
        [MotionPriority.MODERATE]: hierarchicalMotionPriority.getMotionConfig(MotionPriority.MODERATE),
      } as any,
      focusLock: focusLockEnvironment.getCurrentConfig(),
      adaptiveEmphasis: adaptiveEmphasisEngine.getCurrentConfig(),
      spatialCalmness: spatialCalmnessArchitecture.getCurrentConfig(),
      cognitiveLoad: cognitiveLoadOptimiser.getCurrentConfig(),
      environmentalReadability: environmentalReadabilityLayer.getCurrentConfig(),
    });
  }, []);

  // Register an element for focus tracking
  const registerElement = useCallback((element: FocusElement) => {
    visualPriorityEngine.registerElement(element);
  }, []);

  // Unregister an element
  const unregisterElement = useCallback((elementId: string) => {
    visualPriorityEngine.unregisterElement(elementId);
  }, []);

  // Lock focus on an element
  const lockFocus = useCallback((elementId: string) => {
    focusLockEnvironment.lockFocus(elementId);
    cinematicFocusLighting.setFocusTarget(elementId);
    
    setState(prev => ({
      ...prev,
      focusLock: focusLockEnvironment.getCurrentConfig(),
      cinematicLighting: cinematicFocusLighting.getCurrentConfig(),
    }));
  }, []);

  // Unlock focus
  const unlockFocus = useCallback(() => {
    focusLockEnvironment.unlockFocus();
    cinematicFocusLighting.setFocusTarget(null);
    
    setState(prev => ({
      ...prev,
      focusLock: focusLockEnvironment.getCurrentConfig(),
      cinematicLighting: cinematicFocusLighting.getCurrentConfig(),
    }));
  }, []);

  // Set reading mode
  const setReadingMode = useCallback((enabled: boolean) => {
    informationBreathingSystem.setReadingMode(enabled);
    
    setState(prev => ({
      ...prev,
      informationBreathing: informationBreathingSystem.getCurrentConfig(),
    }));
  }, []);

  // Set content density
  const setContentDensity = useCallback((density: number) => {
    informationBreathingSystem.setContentDensity(density);
    adaptiveContrastIntelligence.setInfographicDensity(density);
    
    setState(prev => ({
      ...prev,
      informationBreathing: informationBreathingSystem.getCurrentConfig(),
      adaptiveContrast: adaptiveContrastIntelligence.getCurrentConfig(),
    }));
  }, []);

  // Set holographic intensity
  const setHolographicIntensity = useCallback((intensity: number) => {
    adaptiveContrastIntelligence.setHolographicIntensity(intensity);
    environmentalReadabilityLayer.setHolographicIntensity(intensity);
    
    setState(prev => ({
      ...prev,
      adaptiveContrast: adaptiveContrastIntelligence.getCurrentConfig(),
      environmentalReadability: environmentalReadabilityLayer.getCurrentConfig(),
    }));
  }, []);

  // Set stress level
  const setStressLevel = useCallback((level: number) => {
    spatialCalmnessArchitecture.setStressLevel(level);
    
    setState(prev => ({
      ...prev,
      spatialCalmness: spatialCalmnessArchitecture.getCurrentConfig(),
    }));
  }, []);

  // Set cognitive load metric
  const setCognitiveLoadMetric = useCallback((metric: string, value: number) => {
    cognitiveLoadOptimiser.setLoadMetric(metric, value);
    
    setState(prev => ({
      ...prev,
      cognitiveLoad: cognitiveLoadOptimiser.getCurrentConfig(),
    }));
  }, []);

  // Set emphasis target
  const setEmphasisTarget = useCallback((elementId: string, level: number) => {
    adaptiveEmphasisEngine.setEmphasisTarget(elementId, level);
    
    setState(prev => ({
      ...prev,
      adaptiveEmphasis: adaptiveEmphasisEngine.getCurrentConfig(),
    }));
  }, []);

  // Remove emphasis target
  const removeEmphasisTarget = useCallback((elementId: string) => {
    adaptiveEmphasisEngine.removeEmphasisTarget(elementId);
    
    setState(prev => ({
      ...prev,
      adaptiveEmphasis: adaptiveEmphasisEngine.getCurrentConfig(),
    }));
  }, []);

  // Apply micro-focus
  const applyMicroFocus = useCallback(() => {
    cinematicFocusLighting.applyMicroFocusLighting();
    
    setState(prev => ({
      ...prev,
      cinematicLighting: cinematicFocusLighting.getCurrentConfig(),
    }));
  }, []);

  // Remove micro-focus
  const removeMicroFocus = useCallback(() => {
    cinematicFocusLighting.removeMicroFocusLighting();
    
    setState(prev => ({
      ...prev,
      cinematicLighting: cinematicFocusLighting.getCurrentConfig(),
    }));
  }, []);

  // Auto-optimise cognitive load
  const autoOptimise = useCallback(() => {
    cognitiveLoadOptimiser.autoOptimise();
    informationBreathingSystem.autoDecompress();
    spatialCalmnessArchitecture.autoCalm();
    
    setState(prev => ({
      ...prev,
      cognitiveLoad: cognitiveLoadOptimiser.getCurrentConfig(),
      informationBreathing: informationBreathingSystem.getCurrentConfig(),
      spatialCalmness: spatialCalmnessArchitecture.getCurrentConfig(),
    }));
  }, []);

  return {
    state,
    currentContext,
    setFocusContext,
    registerElement,
    unregisterElement,
    lockFocus,
    unlockFocus,
    setReadingMode,
    setContentDensity,
    setHolographicIntensity,
    setStressLevel,
    setCognitiveLoadMetric,
    setEmphasisTarget,
    removeEmphasisTarget,
    applyMicroFocus,
    removeMicroFocus,
    autoOptimise,
  };
}
