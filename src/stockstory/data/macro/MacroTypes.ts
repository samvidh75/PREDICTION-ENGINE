/**
 * Macro Types
 *
 * Defines types for macroeconomic indicators and their contextual impact
 * on sectors. Missing macro data never blocks research — these types
 * support optional, best-effort inclusion.
 */

export type MacroIndicator =
  | 'interest_rate'
  | 'inflation'
  | 'crude_oil'
  | 'usd_inr'
  | 'gdp'
  | 'industrial_production'
  | 'cpi'
  | 'gst_collection'
  | 'pmI_manufacturing'
  | 'pmL_services'
  | 'fii_flow'
  | 'dil_flow';

/** A single macro indicator data point */
export interface MacroIndicatorValue {
  indicator: MacroIndicator;
  value: number;
  unit: string;
  date: string;
  source: string;
  /** Optional description or context */
  note?: string;
}

/** Aggregate macro context for research analysis */
export interface MacroContext {
  /** All available indicator values, keyed by indicator name */
  indicators: Partial<Record<MacroIndicator, MacroIndicatorValue[]>>;
  /** Timestamp when this context was assembled */
  asOf: string;
  /** Overall macro sentiment if derivable */
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

/** Describes how a macro indicator broadly impacts a given sector */
export interface SectorMacroImpact {
  sectorId: string;
  indicator: MacroIndicator;
  /** Direction of impact: positive, negative, neutral */
  impactDirection: 'positive' | 'negative' | 'neutral';
  /** Optional explanation */
  rationale?: string;
}