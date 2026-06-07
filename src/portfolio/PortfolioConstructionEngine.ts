/**
 * PortfolioConstructionEngine — TRACK-34 Phase 5
 *
 * Builds a style-weighted portfolio from a candidate universe by scoring
 * each symbol against the requested style and applying hard constraints:
 *   - Max 15% sector concentration (via symbols table join)
 *   - Max 5% per position cap
 *   - Liquidity filter: market_cap > 500 cr (from financial_snapshots)
 *   - Confidence filter: confidence_level != 'Low' (from factor_snapshots)
 *
 * Returns a Portfolio containing the final position allocations and a
 * constraints report with any violations that were tripped.
 */

import pool from '../db/index';
import {
  PortfolioType,
  Portfolio,
  PositionAllocation,
  ConstraintsReport,
  SizingMethod,
} from './types';

/** Default constraint thresholds. */
const DEFAULT_MAX_SECTOR_EXPOSURE = 0.15;
const DEFAULT_PER_POSITION_CAP = 0.05;
const DEFAULT_LIQUIDITY_MIN_CR = 500;
const DEFAULT_CONFIDENCE_MIN = 'Medium'; // exclude 'Low'

/** Maps each style to the factor columns that drive scoring. */
type FactorWeights = {
  quality: number;
  value: number;
  growth: number;
  momentum: number;
  risk: number;
};

const STYLE_WEIGHTS: Record<PortfolioType, FactorWeights> = {
  Conservative: { quality: 0.35, value: 0.15, growth: 0.05, momentum: 0.05, risk: -0.40 },
  Balanced:     { quality: 0.20, value: 0.20, growth: 0.20, momentum: 0.20, risk: -0.20 },
  Growth:       { quality: 0.10, value: 0.05, growth: 0.45, momentum: 0.30, risk: -0.10 },
  Momentum:     { quality: 0.05, value: 0.05, growth: 0.10, momentum: 0.70, risk: -0.10 },
  Value:        { quality: 0.10, value: 0.60, growth: 0.05, momentum: 0.05, risk: -0.20 },
};

export class PortfolioConstructionEngine {
  /**
   * Build a style-weighted portfolio from the candidate universe.
   *
   * @param style        - Portfolio construction style.
   * @param universe     - Candidate symbol list (uppercase).
   * @param maxPositions - Maximum number of positions in the final portfolio.
   * @returns            - Fully constrained portfolio with allocations and violations.
   */
  async build(
    style: PortfolioType,
    universe: string[],
    maxPositions: number,
  ): Promise<Portfolio> {
    const violations: string[] = [];

    if (!universe || universe.length === 0) {
      violations.push('Empty universe supplied. No positions generated.');
      return {
        style,
        positions: [],
        constraints: {
          max_sector_exposure: DEFAULT_MAX_SECTOR_EXPOSURE,
          per_position_cap: DEFAULT_PER_POSITION_CAP,
          liquidity_min: DEFAULT_LIQUIDITY_MIN_CR,
          confidence_min: DEFAULT_CONFIDENCE_MIN,
          violations,
        },
      };
    }

    // ------------------------------------------------------------------
    // 1. Fetch latest factor snapshots for the entire universe
    // ------------------------------------------------------------------
    const factorRes = await pool.query(
      `SELECT DISTINCT ON (symbol) *
       FROM factor_snapshots
       WHERE symbol = ANY($1)
         AND confidence_level != $2
       ORDER BY symbol, trade_date DESC`,
      [universe, 'Low'],
    );

    const factorMap = new Map<string, any>();
    for (const row of factorRes.rows) {
      factorMap.set(row.symbol, row);
    }

    const confidenceFiltered = factorRes.rows.map(r => r.symbol);
    const excludedByConfidence = universe.filter(s => !confidenceFiltered.includes(s));
    for (const sym of excludedByConfidence) {
      violations.push(`${sym} excluded: confidence_level is 'Low'.`);
    }

    // ------------------------------------------------------------------
    // 2. Fetch sector info and financial snapshots for remaining symbols
    // ------------------------------------------------------------------
    const candidates = confidenceFiltered;
    if (candidates.length === 0) {
      violations.push('No symbols passed confidence filter.');
      return {
        style,
        positions: [],
        constraints: {
          max_sector_exposure: DEFAULT_MAX_SECTOR_EXPOSURE,
          per_position_cap: DEFAULT_PER_POSITION_CAP,
          liquidity_min: DEFAULT_LIQUIDITY_MIN_CR,
          confidence_min: DEFAULT_CONFIDENCE_MIN,
          violations,
        },
      };
    }

    const [symRes, finRes] = await Promise.all([
      pool.query(
        `SELECT symbol, sector FROM symbols WHERE symbol = ANY($1)`,
        [candidates],
      ),
      pool.query(
        `SELECT DISTINCT ON (symbol) symbol, market_cap
         FROM financial_snapshots
         WHERE symbol = ANY($1)
         ORDER BY symbol, period_end DESC`,
        [candidates],
      ),
    ]);

    const sectorMap = new Map<string, string>();
    for (const row of symRes.rows) {
      sectorMap.set(row.symbol, row.sector);
    }

    const mcapMap = new Map<string, number>();
    for (const row of finRes.rows) {
      if (row.market_cap !== null) {
        mcapMap.set(row.symbol, Number(row.market_cap));
      }
    }

    // ------------------------------------------------------------------
    // 3. Apply liquidity filter: market_cap > 500 cr
    //    (market_cap in financial_snapshots is presumed in crores)
    // ------------------------------------------------------------------
    const liquidCandidates = candidates.filter(sym => {
      const mcap = mcapMap.get(sym);
      if (mcap === undefined || mcap <= DEFAULT_LIQUIDITY_MIN_CR) {
        violations.push(`${sym} excluded: market_cap ${mcap ?? 'missing'} <= ${DEFAULT_LIQUIDITY_MIN_CR} cr.`);
        return false;
      }
      return true;
    });

    if (liquidCandidates.length === 0) {
      violations.push('No symbols passed liquidity filter.');
      return {
        style,
        positions: [],
        constraints: {
          max_sector_exposure: DEFAULT_MAX_SECTOR_EXPOSURE,
          per_position_cap: DEFAULT_PER_POSITION_CAP,
          liquidity_min: DEFAULT_LIQUIDITY_MIN_CR,
          confidence_min: DEFAULT_CONFIDENCE_MIN,
          violations,
        },
      };
    }

    // ------------------------------------------------------------------
    // 4. Score each symbol against the style weights
    // ------------------------------------------------------------------
    const weights = STYLE_WEIGHTS[style];
    const scored: Array<{ symbol: string; score: number; confidenceScore: number; riskScore: number }> = [];

    for (const sym of liquidCandidates) {
      const factor = factorMap.get(sym);
      if (!factor) continue;

      const qScore = Number(factor.quality_factor);
      const vScore = Number(factor.value_factor);
      const gScore = Number(factor.growth_factor);
      const mScore = Number(factor.momentum_factor);
      const rScore = Number(factor.risk_factor);
      const confidenceScore = Number(factor.confidence_score);
      const riskScore = rScore;

      // Weighted linear score (risk is negative weight — lower risk boosts score)
      const composite =
        qScore * weights.quality +
        vScore * weights.value +
        gScore * weights.growth +
        mScore * weights.momentum +
        rScore * weights.risk;

      scored.push({ symbol: sym, score: composite, confidenceScore, riskScore });
    }

    // ------------------------------------------------------------------
    // 5. Sort by composite score descending, then apply sector cap
    // ------------------------------------------------------------------
    scored.sort((a, b) => b.score - a.score);

    const sectorCount = new Map<string, number>();
    const positions: Array<{ symbol: string; score: number; confidenceScore: number; riskScore: number }> = [];
    const maxPerSector = Math.ceil(maxPositions * DEFAULT_MAX_SECTOR_EXPOSURE);

    for (const item of scored) {
      if (positions.length >= maxPositions) break;

      const sector = sectorMap.get(item.symbol) || 'Unknown';
      const current = sectorCount.get(sector) || 0;
      if (current >= maxPerSector) {
        violations.push(
          `${item.symbol} skipped: sector '${sector}' already at ${maxPerSector} position(s) (max ${DEFAULT_MAX_SECTOR_EXPOSURE * 100}% sector exposure).`,
        );
        continue;
      }

      positions.push(item);
      sectorCount.set(sector, current + 1);
    }

    // ------------------------------------------------------------------
    // 6. Equal-weight initial sizing (PositionSizingEngine refines this)
    //    Default initial approach: equal weight, capped at per_position_cap
    // ------------------------------------------------------------------
    const n = positions.length;
    const equalWeight = n > 0 ? 1 / n : 0;
    const cappedWeight = Math.min(equalWeight, DEFAULT_PER_POSITION_CAP);
    const sizingMethod: SizingMethod = 'Equal Weight';

    const allocations: PositionAllocation[] = positions.map(p => ({
      symbol: p.symbol,
      weight: Math.round(cappedWeight * 10000) / 10000, // round to 4 decimals
      sizing_method: sizingMethod,
      confidence_score: Math.round(p.confidenceScore * 100) / 100,
      risk_score: Math.round(p.riskScore * 100) / 100,
    }));

    // Normalize weights to sum to 1.0 if we capped some positions
    const sum = allocations.reduce((s, a) => s + a.weight, 0);
    if (sum > 0 && Math.abs(sum - 1) > 0.0001) {
      for (const alloc of allocations) {
        alloc.weight = Math.round((alloc.weight / sum) * 10000) / 10000;
      }
    }

    return {
      style,
      positions: allocations,
      constraints: {
        max_sector_exposure: DEFAULT_MAX_SECTOR_EXPOSURE,
        per_position_cap: DEFAULT_PER_POSITION_CAP,
        liquidity_min: DEFAULT_LIQUIDITY_MIN_CR,
        confidence_min: DEFAULT_CONFIDENCE_MIN,
        violations,
      },
    };
  }
}

export const portfolioConstructionEngine = new PortfolioConstructionEngine();
export default PortfolioConstructionEngine;