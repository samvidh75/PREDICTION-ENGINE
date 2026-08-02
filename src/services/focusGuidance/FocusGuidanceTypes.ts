/**
 * Adaptive Focus Guidance System
 * Core Types and Interfaces
 */

// Visual Priority Levels
export enum VisualPriority {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  BACKGROUND = 'background',
  HIDDEN = 'hidden'
}

// Focus Context Types
export enum FocusContext {
  VOLATILITY = 'volatility',
  COMPANY_EXPLORATION = 'company_exploration',
  MACRO_INSTABILITY = 'macro_instability',
  CHART_ANALYSIS = 'chart_analysis',
  STORY_READING = 'story_reading',
  SCANNER_USAGE = 'scanner_usage',
  EARNINGS_FOCUS = 'earnings_focus',
  INSTITUTIONAL_ACTIVITY = 'institutional_activity',
  GENERAL = 'general'
}

// Cognitive Load States
export enum CognitiveLoadLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  OVERLOAD = 'overload'
}

// Motion Priority Levels
export enum MotionPriority {
  NONE = 'none',
  MINIMAL = 'minimal',
  SUBTLE = 'subtle',
  GENTLE = 'gentle',
  MODERATE = 'moderate'
}

// Focus State
export interface FocusState {
  currentContext: FocusContext;
  primaryElement: string | null;
  secondaryElements: string[];
  backgroundElements: string[];
  cognitiveLoad: CognitiveLoadLevel;
  isLocked: boolean;
  lockedElement: string | null;
}

// Visual Priority Configuration
export interface VisualPriorityConfig {
  brightness: number; // 0-1
  contrast: number; // 0-1
  glowIntensity: number; // 0-1
  opacity: number; // 0-1
  motionWeight: number; // 0-1
  spatialIsolation: number; // 0-1
}

// Adaptive Contrast Configuration
export interface AdaptiveContrastConfig {
  panelOpacity: number; // 0-1
  typographyBrightness: number; // 0-1
  environmentalShadow: number; // 0-1
  holographicGlow: number; // 0-1
  neonDiffusion: number; // 0-1
  sectionSeparation: number; // 0-1
}

// Cinematic Lighting Configuration
export interface CinematicLightingConfig {
  glowDiffusion: number; // 0-1
  volumetricFocus: number; // 0-1
  sectionIsolation: number; // 0-1
  spatialSpotlight: number; // 0-1
  laserEdgeEmphasis: number; // 0-1
}

// Information Breathing Configuration
export interface InformationBreathingConfig {
  adaptiveSpacing: number; // 0-1 multiplier
  modularBreathingRoom: number; // 0-1
  calmSeparationZones: number; // 0-1
  layoutDecompression: number; // 0-1
  dynamicWhitespace: number; // 0-1
}

// Motion Priority Configuration
export interface MotionPriorityConfig {
  pulseIntensity: number; // 0-1
  animationSpeed: number; // 0-1
  particleActivity: number; // 0-1
  transitionDuration: number; // ms
}

// Focus Lock Configuration
export interface FocusLockConfig {
  surroundingSoftening: number; // 0-1
  backgroundReduction: number; // 0-1
  unrelatedMotionSlowdown: number; // 0-1
  depthOfField: number; // 0-1
}

// Adaptive Emphasis Configuration
export interface AdaptiveEmphasisConfig {
  moduleScaling: number; // 0-1
  dynamicGlowElevation: number; // 0-1
  environmentalFocusShift: number; // 0-1
  contextualBrightness: number; // 0-1
}

// Spatial Calmness Configuration
export interface SpatialCalmnessConfig {
  transitionSoftening: number; // 0-1
  glowRestraint: number; // 0-1
  layoutDecompression: number; // 0-1
  visualBalance: number; // 0-1
  environmentalSmoothing: number; // 0-1
}

// Cognitive Load Configuration
export interface CognitiveLoadConfig {
  visualSimplification: number; // 0-1
  animationReduction: number; // 0-1
  layoutDecompression: number; // 0-1
  holographicSoftening: number; // 0-1
}

// Environmental Readability Configuration
export interface EnvironmentalReadabilityConfig {
  adaptiveBlur: number; // 0-1
  dynamicShadowCalibration: number; // 0-1
  contrastCorrection: number; // 0-1
  typographyReinforcement: number; // 0-1
  neonBalancing: number; // 0-1
}

// Complete Focus Guidance State
export interface FocusGuidanceState {
  focus: FocusState;
  visualPriority: Record<VisualPriority, VisualPriorityConfig>;
  adaptiveContrast: AdaptiveContrastConfig;
  cinematicLighting: CinematicLightingConfig;
  informationBreathing: InformationBreathingConfig;
  motionPriority: Record<MotionPriority, MotionPriorityConfig>;
  focusLock: FocusLockConfig;
  adaptiveEmphasis: AdaptiveEmphasisConfig;
  spatialCalmness: SpatialCalmnessConfig;
  cognitiveLoad: CognitiveLoadConfig;
  environmentalReadability: EnvironmentalReadabilityConfig;
}

// Focus Transition Configuration
export interface FocusTransitionConfig {
  duration: number; // ms
  easing: string;
  environmentalDissolve: boolean;
  gradualEmphasisMigration: boolean;
  adaptiveDepthTransition: boolean;
  neuralFocusPropagation: boolean;
}

// Micro-Focus Configuration
export interface MicroFocusConfig {
  edgeSharpening: number; // 0-1
  glowDiffusion: number; // 0-1
  shadowAdjustment: number; // 0-1
  typographyClarity: number; // 0-1
}

// Scroll-Based Focus Configuration
export interface ScrollFocusConfig {
  activeSectionPriority: number; // 0-1
  distantModuleSoftening: number; // 0-1
  contextEnhancement: number; // 0-1
  narrativeFlowMaintenance: number; // 0-1
}

// Mobile Focus Configuration
export interface MobileFocusConfig {
  adaptiveSimplification: number; // 0-1
  compressedMotion: number; // 0-1
  focusFirstHierarchy: boolean;
  contextualModuleIsolation: number; // 0-1
}

// Element Registration
export interface FocusElement {
  id: string;
  priority: VisualPriority;
  context: FocusContext[];
  motionPriority: MotionPriority;
  requiresFocusLock: boolean;
  cognitiveLoadImpact: number; // 0-1
}
