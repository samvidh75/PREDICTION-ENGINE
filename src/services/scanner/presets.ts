/**
 * Enhanced Scanner Presets — Part 1.2 of Lensory Master Prompt
 *
 * 5 presets with weighted scoring algorithm:
 *   Quality Compounders → quality(0.40) + growth(0.25) + stability(0.20) + valuation(0.15)
 *   High Growth        → growth(0.45) + momentum(0.25) + quality(0.20) + risk(0.10)
 *   Value Opportunities → valuation(0.40) + quality(0.25) + risk(0.20) + growth(0.15)
 *   Dividend Champions  → dividend(0.35) + quality(0.25) + stability(0.25) + risk(0.15)
 *   Turnaround Stories  → momentum(0.30) + growth(0.25) + valuation(0.25) + quality(0.20)
 *
 * Each preset also has a human-readable description and threshold filters.
 */

import type { StockFundamentals } from './stockUniverse';
import { getScannerStocks } from '../../lib/stockResearch';

// ── Types ──────────────────────────────────────────────────────────────

export interface EnhancedFactorScores {
  quality: number;    // 0-100
  valuation: number;  // 0-100
  growth: number;     // 0-100
  risk: number;       // 0-100 (inverted: higher = less risky)
  momentum: number;   // 0-100
  stability: number;  // 0-100
  dividend: number;   // 0-100
  composite: number;  // 0-100 weighted sum
}

export interface EnhancedScannedStock extends StockFundamentals, EnhancedFactorScores {
  rank: number;
  scoreChange: number;     // vs previous scan (or 0)
  matchReason: string;     // why this stock qualifies
}

export type EnhancedScanType =
  | 'quality-compounders'
  | 'high-growth'
  | 'value-opportunities'
  | 'dividend-champions'
  | 'turnaround-stories';

export interface ScanPresetDefinition {
  id: EnhancedScanType;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;        // emoji
  weights: {
    quality: number;
    growth: number;
    momentum: number;
    valuation: number;
    risk: number;
    stability: number;
    dividend: number;
  };
  /** Minimum thresholds to qualify (0-100 factor scores; undefined = no minimum) */
  thresholds?: Partial<Record<keyof EnhancedFactorScores, number>>;
  /** Hard filters on raw fundamentals */
  filters?: {
    maxPe?: number;
    maxDebtToEquity?: number;
    minRevenueGrowth?: number;
    minDividendYield?: number;
    minRoe?: number;
  };
}

// ── Preset Definitions ─────────────────────────────────────────────────

export const SCAN_PRESETS: ScanPresetDefinition[] = [
  {
    id: 'quality-compounders',
    label: 'Quality Compounders',
    shortLabel: 'Quality',
    description: 'High ROE, low debt, consistent earners with reliable quality scores',
    icon: 'Q',
    weights: { quality: 0.40, growth: 0.25, stability: 0.20, valuation: 0.15, momentum: 0, risk: 0, dividend: 0 },
    thresholds: { quality: 60, stability: 45 },
    filters: { maxDebtToEquity: 2.5, minRoe: 12 },
  },
  {
    id: 'high-growth',
    label: 'High Growth',
    shortLabel: 'Growth',
    description: 'Revenue and profit accelerating — momentum meets expansion',
    icon: 'G',
    weights: { quality: 0.10, growth: 0.45, momentum: 0.25, valuation: 0, risk: 0.10, stability: 0.10, dividend: 0 },
    thresholds: { growth: 60, momentum: 50 },
    filters: { minRevenueGrowth: 10 },
  },
  {
    id: 'value-opportunities',
    label: 'Value Opportunities',
    shortLabel: 'Value',
    description: 'Low PE, low PB — stocks trading below intrinsic worth',
    icon: 'V',
    weights: { quality: 0.25, growth: 0.10, momentum: 0, valuation: 0.40, risk: 0.20, stability: 0.05, dividend: 0 },
    thresholds: { valuation: 60 },
    filters: { maxPe: 25 },
  },
  {
    id: 'dividend-champions',
    label: 'Dividend Champions',
    shortLabel: 'Dividend',
    description: 'High yield, stable payout, defensive quality',
    icon: 'D',
    weights: { quality: 0.25, growth: 0, momentum: 0, valuation: 0, risk: 0.15, stability: 0.25, dividend: 0.35 },
    thresholds: { dividend: 50, stability: 45, quality: 45 },
    filters: { minDividendYield: 1.5 },
  },
  {
    id: 'turnaround-stories',
    label: 'Turnaround Stories',
    shortLabel: 'Turnaround',
    description: 'Beaten down but showing price recovery and improving valuations',
    icon: 'T',
    weights: { quality: 0.20, growth: 0.15, momentum: 0.30, valuation: 0.25, risk: 0.10, stability: 0, dividend: 0 },
    thresholds: { momentum: 50, valuation: 40 },
  },
];

// ── Scoring Helpers ────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function normalize(value: number, min: number, max: number, invert = false): number {
  if (max === min) return 50;
  const raw = ((value - min) / (max - min)) * 100;
  return clamp(invert ? 100 - raw : raw);
}

/**
 * Compute all factor scores from raw fundamentals.
 * Each factor is normalised to 0-100 based on sensible Indian-market ranges.
 */
export function computeEnhancedScores(stock: StockFundamentals): EnhancedFactorScores {
  const quality = clamp(
    normalize(stock.roe, 0, 50) * 0.30 +
    normalize(50 - stock.debtToEquity, 0, 50) * 0.25 +
    normalize(stock.pe > 0 ? 50 - Math.min(stock.pe, 100) : 0, 0, 100) * 0.15 +
    normalize(stock.dividendYield, 0, 8) * 0.10 +
    normalize(stock.rsi, 20, 80) * 0.20
  );

  const valuation = clamp(
    normalize(30 - Math.min(stock.pe, 80), 0, 30) * 0.40 +
    normalize(3 - Math.min(stock.pb, 10), 0, 3) * 0.35 +
    normalize(stock.roe, 0, 40) * 0.25
  );

  const growth = clamp(
    normalize(stock.revenueGrowth, -10, 50) * 0.50 +
    normalize(stock.profitGrowth, -10, 50) * 0.50
  );

  const risk = clamp(
    normalize(50 - Math.min(stock.debtToEquity, 50), 0, 50) * 0.35 +
    normalize(stock.pe > 0 ? 50 - Math.min(stock.pe, 100) : 0, 0, 100) * 0.25 +
    normalize(80 - Math.min(stock.rsi, 80), 0, 60) * 0.20 +
    normalize(stock.profitGrowth, -20, 40) * 0.20
  );

  const momentum = clamp(
    normalize(stock.rsi, 20, 80) * 0.40 +
    normalize(stock.changePercent, -5, 10) * 0.30 +
    normalize(stock.revenueGrowth, -10, 40) * 0.30
  );

  const stability = clamp(
    normalize(50 - Math.min(stock.debtToEquity, 50), 0, 50) * 0.30 +
    normalize(stock.roe, 5, 45) * 0.25 +
    normalize(stock.pe > 0 ? 40 - Math.min(stock.pe, 80) : 0, 0, 40) * 0.20 +
    normalize(stock.dividendYield, 0, 6) * 0.15 +
    normalize(stock.rsi, 25, 75) * 0.10
  );

  const dividend = clamp(
    normalize(stock.dividendYield, 0, 8) * 0.50 +
    normalize(stock.roe, 5, 40) * 0.20 +
    normalize(50 - Math.min(stock.debtToEquity, 50), 0, 50) * 0.20 +
    normalize(stock.pe > 0 ? 40 - Math.min(stock.pe, 80) : 0, 0, 40) * 0.10
  );

  // Composite is preset-specific, computed in scanByPreset
  return { quality, valuation, growth, risk, momentum, stability, dividend, composite: 0 };
}

function getMatchReason(stock: StockFundamentals, scores: EnhancedFactorScores, preset: ScanPresetDefinition): string {
  const parts: string[] = [];
  if (preset.id === 'quality-compounders') {
    if (stock.roe > 20) parts.push('ROE > 20%');
    if (stock.debtToEquity < 1) parts.push('Low debt');
    if (scores.quality > 70) parts.push('Strong quality');
  } else if (preset.id === 'high-growth') {
    if (stock.revenueGrowth > 20) parts.push('Rev growth > 20%');
    if (stock.profitGrowth > 15) parts.push('Profit growth > 15%');
    if (scores.momentum > 65) parts.push('Strong momentum');
  } else if (preset.id === 'value-opportunities') {
    if (stock.pe < 15) parts.push('PE < 15');
    if (stock.pb < 2) parts.push('PB < 2');
    if (scores.valuation > 70) parts.push('Undervalued');
  } else if (preset.id === 'dividend-champions') {
    if (stock.dividendYield > 3) parts.push('Yield > 3%');
    if (stock.debtToEquity < 1.5) parts.push('Low debt');
    if (scores.stability > 60) parts.push('High stability');
  } else if (preset.id === 'turnaround-stories') {
    if (scores.momentum > 60) parts.push('Price recovering');
    if (scores.valuation > 50) parts.push('Improving valuation');
    if (stock.pe < 30) parts.push('PE < 30');
  }
  return parts.length > 0 ? parts.join(' · ') : `${preset.shortLabel} qualifier`;
}

// ── Main Scan Entry Point ──────────────────────────────────────────────

/**
 * Run the enhanced scanner with 5 presets and weighted scoring.
 * Replaces the old scanByType(ScanType) with a richer, AI‑ready result.
 */
export function scanByPreset(type: EnhancedScanType, limit = 50): EnhancedScannedStock[] {
  const preset = SCAN_PRESETS.find((p) => p.id === type);
  if (!preset) return [];

  const allStocks = getScannerStocks('quality' as any) as StockFundamentals[];
  const {
    weights,
    filters,
    thresholds,
  } = preset;

  const scored: EnhancedScannedStock[] = [];

  for (const stock of allStocks) {
    // Apply hard filters
    if (filters) {
      if (filters.maxPe !== undefined && stock.pe > filters.maxPe) continue;
      if (filters.maxDebtToEquity !== undefined && stock.debtToEquity > filters.maxDebtToEquity) continue;
      if (filters.minRevenueGrowth !== undefined && stock.revenueGrowth < filters.minRevenueGrowth) continue;
      if (filters.minDividendYield !== undefined && stock.dividendYield < filters.minDividendYield) continue;
      if (filters.minRoe !== undefined && stock.roe < filters.minRoe) continue;
    }

    const scores = computeEnhancedScores(stock);

    // Apply threshold filters
    if (thresholds) {
      if (thresholds.quality !== undefined && scores.quality < thresholds.quality) continue;
      if (thresholds.growth !== undefined && scores.growth < thresholds.growth) continue;
      if (thresholds.momentum !== undefined && scores.momentum < thresholds.momentum) continue;
      if (thresholds.valuation !== undefined && scores.valuation < thresholds.valuation) continue;
      if (thresholds.risk !== undefined && scores.risk < thresholds.risk) continue;
      if (thresholds.stability !== undefined && scores.stability < thresholds.stability) continue;
      if (thresholds.dividend !== undefined && scores.dividend < thresholds.dividend) continue;
    }

    // Weighted composite score
    const composite = clamp(
      (scores.quality * weights.quality) +
      (scores.growth * weights.growth) +
      (scores.momentum * weights.momentum) +
      (scores.valuation * weights.valuation) +
      (scores.risk * weights.risk) +
      (scores.stability * weights.stability) +
      (scores.dividend * weights.dividend)
    );

    scored.push({
      ...stock,
      ...scores,
      composite,
      rank: 0,
      scoreChange: 0,
      matchReason: getMatchReason(stock, scores, preset),
    });
  }

  // Sort by composite descending, assign rank
  scored.sort((a, b) => b.composite - a.composite);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored.slice(0, limit);
}

/** Count qualifying stocks per preset (for leaderboard / AI context) */
export function getPresetCounts(): Record<EnhancedScanType, number> {
  return Object.fromEntries(
    SCAN_PRESETS.map((p) => [p.id, scanByPreset(p.id, 200).length])
  ) as Record<EnhancedScanType, number>;
}
