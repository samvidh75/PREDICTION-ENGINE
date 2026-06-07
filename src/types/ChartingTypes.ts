/**
 * Advanced Charting Universe
 * Core Types and Interfaces
 */

// Timeframe Types
export enum ChartTimeframe {
  INTRADAY = 'intraday',
  ONE_WEEK = '1w',
  ONE_MONTH = '1m',
  THREE_MONTHS = '3m',
  SIX_MONTHS = '6m',
  NINE_MONTHS = '9m',
  ONE_YEAR = '1y',
  THREE_YEARS = '3y',
  FIVE_YEARS = '5y',
  MAX = 'max'
}

// Candlestick Data
export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  institutionalFlow?: number;
  liquidityDensity?: number;
  volatilityScore?: number;
}

// Market Telemetry
export interface MarketTelemetry {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high52Week: number;
  low52Week: number;
  marketCap?: number;
  peRatio?: number;
  volatility: number;
  liquidityScore: number;
  institutionalActivity: number;
}

// Indicator Types
export enum IndicatorType {
  MOVING_AVERAGE = 'moving_average',
  RSI = 'rsi',
  MACD = 'macd',
  BOLLINGER_BANDS = 'bollinger_bands',
  VWAP = 'vwap',
  VOLUME_PROFILE = 'volume_profile',
  INSTITUTIONAL_FLOW = 'institutional_flow'
}

// Indicator Configuration
export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  parameters: Record<string, number>;
  color: string;
  style: 'line' | 'area' | 'bar';
}

// Indicator Data Point
export interface IndicatorDataPoint {
  timestamp: number;
  value: number;
  signal?: 'buy' | 'sell' | 'neutral';
}

// Overlay Types
export enum OverlayType {
  HEALTHOMETER = 'healthometer',
  INSTITUTIONAL_ACTIVITY = 'institutional_activity',
  MACRO_CONDITIONS = 'macro_conditions',
  VOLATILITY_PRESSURE = 'volatility_pressure',
  LIQUIDITY_EXPANSION = 'liquidity_expansion',
  SECTOR_LEADERSHIP = 'sector_leadership',
  EARNINGS_ENVIRONMENT = 'earnings_environment'
}

// Overlay Configuration
export interface OverlayConfig {
  type: OverlayType;
  enabled: boolean;
  intensity: number;
  position: 'top' | 'bottom' | 'left' | 'right' | 'overlay';
}

// Chart Interaction State
export interface ChartInteractionState {
  isHovering: boolean;
  hoverX: number | null;
  hoverY: number | null;
  isZooming: boolean;
  isPanning: boolean;
  selectedRange: { start: number; end: number } | null;
  crosshairEnabled: boolean;
}

// Chart Render Configuration
export interface ChartRenderConfig {
  showGrid: boolean;
  showVolume: boolean;
  showIndicators: boolean;
  showOverlays: boolean;
  candleStyle: 'standard' | 'hollow' | 'heikin_ashi';
  colorScheme: 'dark' | 'light' | 'holographic';
  animationEnabled: boolean;
  holographicIntensity: number;
}

// 52-Week Range Data
export interface Week52RangeData {
  low: number;
  high: number;
  current: number;
  relativePosition: number; // 0-1
  volatilityAtmosphere: number;
}

// Financial Histogram Data
export interface FinancialHistogramData {
  period: string;
  revenue: number;
  ebitda: number;
  profit: number;
  cashFlow: number;
  margin: number;
}

// Historical Replay Event
export interface HistoricalReplayEvent {
  timestamp: number;
  type: 'crash' | 'boom' | 'liquidity_expansion' | 'macro_shift' | 'earnings_cycle';
  description: string;
  impact: number;
}

// Comparative Data
export interface ComparativeData {
  symbol: string;
  name: string;
  healthometerScore: number;
  volatility: number;
  profitability: number;
  institutionalParticipation: number;
  macroResilience: number;
}

// AI Analysis Interpretation
export interface AIAnalysisInterpretation {
  type: 'volatility' | 'liquidity' | 'macro' | 'institutional' | 'structural';
  summary: string;
  confidence: number;
  educationalNote: string;
  visualCues: string[];
}

// Chart Atmosphere Configuration
export interface ChartAtmosphereConfig {
  pulseBreathing: boolean;
  pulseIntensity: number;
  telemetryDrift: boolean;
  driftSpeed: number;
  cinematicTransitions: boolean;
  neuralPropagation: boolean;
}

// Beginner Mode Configuration
export interface BeginnerModeConfig {
  enabled: boolean;
  simplifiedView: boolean;
  showExplanations: boolean;
  guidedOverlays: boolean;
  educationalHolograms: boolean;
}

// Chart Performance Metrics
export interface ChartPerformanceMetrics {
  renderTime: number;
  dataPoints: number;
  fps: number;
  memoryUsage: number;
}

// Complete Chart State
export interface ChartState {
  timeframe: ChartTimeframe;
  data: CandlestickData[];
  telemetry: MarketTelemetry;
  indicators: Map<IndicatorType, IndicatorDataPoint[]>;
  overlays: Map<OverlayType, OverlayConfig>;
  interaction: ChartInteractionState;
  renderConfig: ChartRenderConfig;
  week52Range: Week52RangeData;
  financialHistogram: FinancialHistogramData[];
  atmosphere: ChartAtmosphereConfig;
  beginnerMode: BeginnerModeConfig;
  performance: ChartPerformanceMetrics;
}
