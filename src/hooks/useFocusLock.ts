/**
 * useFocusLock Hook
 * Integration hook for Focus Lock Environment
 */

import { useState, useCallback } from 'react';
import {
  FocusLockConfig,
  FocusContext
} from '../services/focusGuidance/FocusGuidanceTypes';
import {
  focusLockEnvironment
} from '../services/focusGuidance/FocusLockEnvironment';

export function useFocusLock() {
  const [config, setConfig] = useState<FocusLockConfig>(
    focusLockEnvironment.getCurrentConfig()
  );
  const [isLocked, setIsLocked] = useState(false);
  const [lockedElement, setLockedElement] = useState<string | null>(null);

  const lockFocus = useCallback((elementId: string) => {
    focusLockEnvironment.lockFocus(elementId);
    setConfig(focusLockEnvironment.getCurrentConfig());
    setIsLocked(true);
    setLockedElement(elementId);
  }, []);

  const unlockFocus = useCallback(() => {
    focusLockEnvironment.unlockFocus();
    setConfig(focusLockEnvironment.getCurrentConfig());
    setIsLocked(false);
    setLockedElement(null);
  }, []);

  const adaptToContext = useCallback((context: FocusContext) => {
    focusLockEnvironment.adaptToContext(context);
    setConfig(focusLockEnvironment.getCurrentConfig());
  }, []);

  const resetToDefault = useCallback(() => {
    focusLockEnvironment.resetToDefault();
    setConfig(focusLockEnvironment.getCurrentConfig());
  }, []);

  const applySurroundingSoftening = useCallback((level: number) => {
    focusLockEnvironment.applySurroundingSoftening(level);
    setConfig(focusLockEnvironment.getCurrentConfig());
  }, []);

  const applyBackgroundReduction = useCallback((level: number) => {
    focusLockEnvironment.applyBackgroundReduction(level);
    setConfig(focusLockEnvironment.getCurrentConfig());
  }, []);

  const applyUnrelatedMotionSlowdown = useCallback((level: number) => {
    focusLockEnvironment.applyUnrelatedMotionSlowdown(level);
    setConfig(focusLockEnvironment.getCurrentConfig());
  }, []);

  const applyDepthOfField = useCallback((level: number) => {
    focusLockEnvironment.applyDepthOfField(level);
    setConfig(focusLockEnvironment.getCurrentConfig());
  }, []);

  const getSurroundingSoftening = useCallback((): number => {
    return focusLockEnvironment.getSurroundingSoftening();
  }, []);

  const getBackgroundReduction = useCallback((): number => {
    return focusLockEnvironment.getBackgroundReduction();
  }, []);

  const getUnrelatedMotionSlowdown = useCallback((): number => {
    return focusLockEnvironment.getUnrelatedMotionSlowdown();
  }, []);

  const getDepthOfField = useCallback((): number => {
    return focusLockEnvironment.getDepthOfField();
  }, []);

  const getElementOpacity = useCallback((isLockedElement: boolean, isRelated: boolean): number => {
    return focusLockEnvironment.getElementOpacity(isLockedElement, isRelated);
  }, []);

  const getElementMotionSpeed = useCallback((isLockedElement: boolean, isRelated: boolean): number => {
    return focusLockEnvironment.getElementMotionSpeed(isLockedElement, isRelated);
  }, []);

  return {
    config,
    isLocked,
    lockedElement,
    lockFocus,
    unlockFocus,
    adaptToContext,
    resetToDefault,
    applySurroundingSoftening,
    applyBackgroundReduction,
    applyUnrelatedMotionSlowdown,
    applyDepthOfField,
    getSurroundingSoftening,
    getBackgroundReduction,
    getUnrelatedMotionSlowdown,
    getDepthOfField,
    getElementOpacity,
    getElementMotionSpeed,
  };
}
