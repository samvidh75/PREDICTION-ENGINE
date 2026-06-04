/**
 * useSearch Hook
 * Main integration hook for Universal Search Engine
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SearchState,
  SearchQuery,
  SearchResult,
  PredictionSuggestion,
  NavigationTarget
} from '../types/SearchTypes';
import {
  universalIntelligenceSearchEngine
} from '../services/search/UniversalIntelligenceSearchEngine';
import {
  predictiveDiscoveryArchitecture
} from '../services/search/PredictiveDiscoveryArchitecture';
import {
  cinematicSearchOverlay
} from '../services/search/CinematicSearchOverlay';
import {
  multiLayerNavigationEcosystem
} from '../services/search/MultiLayerNavigationEcosystem';
import {
  aiAssistedContextualSearch
} from '../services/search/AIAssistedContextualSearch';
import {
  adaptiveSearchMemoryEngine
} from '../services/search/AdaptiveSearchMemoryEngine';
import {
  instantIntelligencePreviewSystem
} from '../services/search/InstantIntelligencePreviewSystem';
import {
  desktopMobileSearchAdaptation
} from '../services/search/DesktopMobileSearchAdaptation';
import {
  searchAtmosphereInteractionEngine
} from '../services/search/SearchAtmosphereInteractionEngine';

export function useSearch() {
  const [state, setState] = useState<Partial<SearchState>>({
    query: '',
    results: [],
    predictions: [],
    memory: [],
    navigation: multiLayerNavigationEcosystem.getNavigationState(),
    overlay: cinematicSearchOverlay.getOverlayState(),
    atmosphere: searchAtmosphereInteractionEngine.getAtmosphereConfig(),
    device: desktopMobileSearchAdaptation.getDeviceConfig()
  });

  const [isSearching, setIsSearching] = useState(false);

  // Perform search
  const performSearch = useCallback(async (query: string, filters?: any) => {
    setIsSearching(true);
    
    const searchQuery: SearchQuery = {
      query,
      filters,
      limit: 20
    };

    const results = universalIntelligenceSearchEngine.search(searchQuery);
    
    // Add to memory
    if (query.trim()) {
      adaptiveSearchMemoryEngine.addToMemory(query, results[0]?.type || 'stock' as any);
      predictiveDiscoveryArchitecture.addToRecentSearches(query);
    }

    setState(prev => ({
      ...prev,
      query,
      results
    }));

    setIsSearching(false);
  }, []);

  // Generate predictions
  const generatePredictions = useCallback((partialInput: string) => {
    const predictions = predictiveDiscoveryArchitecture.generatePredictions(partialInput);
    setState(prev => ({ ...prev, predictions }));
  }, []);

  // Open search overlay
  const openSearchOverlay = useCallback(async () => {
    await cinematicSearchOverlay.openOverlay();
    setState(prev => ({
      ...prev,
      overlay: cinematicSearchOverlay.getOverlayState()
    }));
  }, []);

  // Close search overlay
  const closeSearchOverlay = useCallback(async () => {
    await cinematicSearchOverlay.closeOverlay();
    setState(prev => ({
      ...prev,
      overlay: cinematicSearchOverlay.getOverlayState()
    }));
  }, []);

  // Navigate to target
  const navigateTo = useCallback(async (target: NavigationTarget) => {
    await multiLayerNavigationEcosystem.navigateTo(target);
    setState(prev => ({
      ...prev,
      navigation: multiLayerNavigationEcosystem.getNavigationState()
    }));
  }, []);

  // Navigate back
  const navigateBack = useCallback(async () => {
    await multiLayerNavigationEcosystem.navigateBack();
    setState(prev => ({
      ...prev,
      navigation: multiLayerNavigationEcosystem.getNavigationState()
    }));
  }, []);

  // Process natural language query
  const processNaturalLanguageQuery = useCallback((query: string) => {
    const searchQuery = aiAssistedContextualSearch.processNaturalLanguageQuery(query);
    return searchQuery;
  }, []);

  // Get query interpretation
  const getQueryInterpretation = useCallback((query: string) => {
    return aiAssistedContextualSearch.generateQueryInterpretation(query);
  }, []);

  // Generate preview
  const generatePreview = useCallback((result: SearchResult) => {
    return instantIntelligencePreviewSystem.generatePreview(result);
  }, []);

  // Set holographic intensity
  const setHolographicIntensity = useCallback((intensity: number) => {
    universalIntelligenceSearchEngine.setHolographicIntensity(intensity);
    predictiveDiscoveryArchitecture.setHolographicIntensity(intensity);
    cinematicSearchOverlay.setHolographicIntensity(intensity);
    multiLayerNavigationEcosystem.setHolographicIntensity(intensity);
    aiAssistedContextualSearch.setHolographicIntensity(intensity);
    adaptiveSearchMemoryEngine.setHolographicIntensity(intensity);
    instantIntelligencePreviewSystem.setHolographicIntensity(intensity);
    desktopMobileSearchAdaptation.setHolographicIntensity(intensity);
    searchAtmosphereInteractionEngine.setHolographicIntensity(intensity);
    
    setState(prev => ({
      ...prev,
      atmosphere: searchAtmosphereInteractionEngine.getAtmosphereConfig()
    }));
  }, []);

  // Set atmosphere config
  const setAtmosphereConfig = useCallback((config: any) => {
    searchAtmosphereInteractionEngine.setAtmosphereConfig(config);
    setState(prev => ({
      ...prev,
      atmosphere: searchAtmosphereInteractionEngine.getAtmosphereConfig()
    }));
  }, []);

  // Get recent searches
  const getRecentSearches = useCallback(() => {
    return adaptiveSearchMemoryEngine.getRecentSearches();
  }, []);

  // Get frequent searches
  const getFrequentSearches = useCallback(() => {
    return adaptiveSearchMemoryEngine.getFrequentSearches();
  }, []);

  // Clear search memory
  const clearSearchMemory = useCallback(() => {
    adaptiveSearchMemoryEngine.clearAllMemory();
    setState(prev => ({ ...prev, memory: [] }));
  }, []);

  return {
    state,
    isSearching,
    performSearch,
    generatePredictions,
    openSearchOverlay,
    closeSearchOverlay,
    navigateTo,
    navigateBack,
    processNaturalLanguageQuery,
    getQueryInterpretation,
    generatePreview,
    setHolographicIntensity,
    setAtmosphereConfig,
    getRecentSearches,
    getFrequentSearches,
    clearSearchMemory
  };
}
