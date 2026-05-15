/**
 * Universal Search Engine
 * Core Types and Interfaces
 */

// Search Result Types
export enum SearchResultType {
  STOCK = 'stock',
  COMPANY = 'company',
  SECTOR = 'sector',
  FOUNDER = 'founder',
  CEO = 'ceo',
  MACRO_THEME = 'macro_theme',
  INSTITUTIONAL_TREND = 'institutional_trend',
  SCANNER = 'scanner',
  HEALTHOMETER_STATE = 'healthometer_state',
  EDUCATIONAL_TOPIC = 'educational_topic',
  MARKET_EVENT = 'market_event',
  HISTORICAL_ENVIRONMENT = 'historical_environment'
}

// Navigation Target Types
export enum NavigationTarget {
  DASHBOARD = 'dashboard',
  COMPANY_UNIVERSE = 'company_universe',
  SCANNERS = 'scanners',
  MACRO_ENVIRONMENTS = 'macro_environments',
  AI_ASSISTANT = 'ai_assistant',
  EDUCATIONAL_SYSTEMS = 'educational_systems',
  COMMUNITY_INTELLIGENCE = 'community_intelligence',
  PREMIUM_INTELLIGENCE = 'premium_intelligence'
}

// Search Result Interface
export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  description: string;
  confidence: number;
  telemetry: {
    healthometerScore?: number;
    volatility?: number;
    institutionalConfidence?: number;
    sectorPositioning?: string;
  };
  preview: {
    livePrice?: number;
    change?: number;
    changePercent?: number;
  };
  metadata: {
    symbol?: string;
    sector?: string;
    theme?: string;
    lastUpdated: number;
  };
}

// Search Query Interface
export interface SearchQuery {
  query: string;
  type?: SearchResultType;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

// Search Filters
export interface SearchFilters {
  sector?: string;
  theme?: string;
  healthometerRange?: [number, number];
  volatilityRange?: [number, number];
  institutionalConfidence?: number;
}

// Prediction Suggestion
export interface PredictionSuggestion {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  confidence: number;
  category: 'ticker' | 'company' | 'macro_theme' | 'sector' | 'behavioural';
}

// Search Memory Entry
export interface SearchMemoryEntry {
  id: string;
  query: string;
  resultType: SearchResultType;
  timestamp: number;
  frequency: number;
  lastAccessed: number;
}

// Navigation State
export interface NavigationState {
  currentTarget: NavigationTarget;
  previousTarget: NavigationTarget | null;
  navigationHistory: NavigationTarget[];
  isTransitioning: boolean;
  transitionProgress: number;
}

// Search Overlay State
export interface SearchOverlayState {
  isOpen: boolean;
  opacity: number;
  blur: number;
  scale: number;
  position: { x: number; y: number };
}

// Intelligence Preview Data
export interface IntelligencePreview {
  id: string;
  type: SearchResultType;
  healthometerState: {
    score: number;
    label: string;
    color: string;
  };
  volatilityEnvironment: {
    level: 'low' | 'medium' | 'high';
    score: number;
  };
  institutionalConfidence: {
    level: 'low' | 'medium' | 'high';
    score: number;
  };
  sectorPositioning: {
    rank: number;
    total: number;
    percentile: number;
  };
  companyStorySummary: string;
}

// Sector Discovery Theme
export interface SectorDiscoveryTheme {
  id: string;
  title: string;
  description: string;
  companies: string[];
  healthometerAverage: number;
  institutionalParticipation: number;
  volatility: number;
  color: string;
}

// Keyboard Command
export interface KeyboardCommand {
  key: string;
  modifiers: string[];
  action: string;
  description: string;
}

// Search Atmosphere Config
export interface SearchAtmosphereConfig {
  glowIntensity: number;
  pulseBreathing: boolean;
  pulseSpeed: number;
  holographicIntensity: number;
  neuralPropagation: boolean;
}

// Device Adaptation Config
export interface DeviceAdaptationConfig {
  isMobile: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  touchEnabled: boolean;
}

// Complete Search State
export interface SearchState {
  query: string;
  results: SearchResult[];
  predictions: PredictionSuggestion[];
  memory: SearchMemoryEntry[];
  navigation: NavigationState;
  overlay: SearchOverlayState;
  atmosphere: SearchAtmosphereConfig;
  device: DeviceAdaptationConfig;
}
