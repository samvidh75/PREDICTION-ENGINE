/**
 * PositionSizingEngine — TRACK-34 Phase 6
 *
 * Sizes position allocations using one of four methodologies:
 *   1. Equal Weight     - 1/n each
 *   2. Confidence Weight - proportional to confidence_score from factor_snapshots
 *   3. Risk Adjusted     - inversely proportional to risk_factor from factor_snapshots
 *   4. Volatility Adjusted - inversely proportional to volatility from feature_snapshots
 *
 * All outputs are normalized to sum to 1.0 and returned as PositionAllocation[].
 */

import pool from '../db/index';
import {
  PositionAllocation,
  SizingMethod,
} from './types';

export class PositionSizingEngine {
  /**
   * Size a list of positions according to the specified methodology.
   *
   * @param positions - Array of uppercase symbols to size.
   * @param method    - Sizing methodology to apply.
   * @returns         - Ordered array of sized allocations (weights sum to 1.0).
   */
  async size(
    positions: string[],
    method: SizingMethod,
  ): Promise<PositionAllocation[]> {
    if (!positions || positions.length === 0) {
      return [];
    }

    switch (method) {
      case 'Equal Weight':
        return this.equalWeight(positions);
      case 'Confidence Weight':
        return this.confidenceWeight(positions);
      case 'Risk Adjusted':
        return this.riskAdjusted(positions);
      case 'Volatility Adjusted':
        return this.volatilityAdjusted(positions);
      default:
        return this.equalWeight(positions);
    }
  }

  // ------------------------------------------------------------------
  // 1. Equal Weight — 1/n each
  // ------------------------------------------------------------------
  private equalWeight(positions: string[]): PositionAllocation[] {
    const n = positions.length;
    const weight = Math.round((1 / n) * 10000) / 10000;

    return positions.map((symbol, i) => {
      // Distribute rounding remainder to the last position
      const adjusted = i === n - 1
        ? Math.round((1 - weight * (n - 1)) * 10000) / 10000
        : weight;

      return {
        symbol,
        weight: adjusted,
        sizing_method: 'Equal Weight' as SizingMethod,
        confidence_score: 0,
        risk_score: 0,
      };
    });
  }

  // ------------------------------------------------------------------
  // 2. Confidence Weight — proportional to confidence_score
  // ------------------------------------------------------------------
  private async confidenceWeight(positions: string[]): Promise<PositionAllocation[]> {
    const factorRes = await pool.query(
      `SELECT DISTINCT ON (symbol) symbol, confidence_score
       FROM factor_snapshots
       WHERE symbol = ANY($1)
       ORDER BY symbol, trade_date DESC`,
      [positions],
    );

    const confMap = new Map<string, number>();
    for (const row of factorRes.rows) {
      confMap.set(row.symbol, row.confidence_score !== null ? Number(row.confidence_score) : 50);
    }

    // Default missing symbols to neutral 50
    const scores = positions.map(sym => confMap.get(sym) ?? 50);
    const total = scores.reduce((s, v) => s + v, 0);

    if (total === 0) {
      return this.equalWeight(positions);
    }

    return positions.map((symbol, i) => {
      const rawWeight = scores[i] / total;
      const weight = Math.round(rawWeight * 10000) / 10000;

      return {
        symbol,
        weight: i === positions.length - 1
          ? Math.round((1 - positions.slice(0, -1).reduce((s, _, j) => s + (scores[j] / total), 0)) * 10000) / 10000
          : weight,
        sizing_method: 'Confidence Weight' as SizingMethod,
        confidence_score: Math.round(scores[i] * 100) / 100,
        risk_score: 0,
      };
    });
  }

  // ------------------------------------------------------------------
  // 3. Risk Adjusted — inversely proportional to risk_factor
  //    Higher risk → lower weight. Use (100 - riskFactor) as weight basis.
  // ------------------------------------------------------------------
  private async riskAdjusted(positions: string[]): Promise<PositionAllocation[]> {
    const factorRes = await pool.query(
      `SELECT DISTINCT ON (symbol) symbol, risk_factor, confidence_score
       FROM factor_snapshots
       WHERE symbol = ANY($1)
       ORDER BY symbol, trade_date DESC`,
      [positions],
    );

    const riskMap = new Map<string, number>();
    const confMap = new Map<string, number>();
    for (const row of factorRes.rows) {
      riskMap.set(row.symbol, row.risk_factor !== null ? Number(row.risk_factor) : 50);
      confMap.set(row.symbol, row.confidence_score !== null ? Number(row.confidence_score) : 50);
    }

    // Invert risk: higher risk → lower weight. Clamp inverted score to [1, 100].
    const inverted = positions.map(sym => {
      const risk = riskMap.get(sym) ?? 50;
      return Math.max(1, 100 - risk);
    });

    const total = inverted.reduce((s, v) => s + v, 0);

    if (total === 0) {
      return this.equalWeight(positions);
    }

    return positions.map((symbol, i) => {
      const rawWeight = inverted[i] / total;
      return {
        symbol,
        weight: Math.round(rawWeight * 10000) / 10000,
        sizing_method: 'Risk Adjusted' as SizingMethod,
        confidence_score: Math.round((confMap.get(symbol) ?? 50) * 100) / 100,
        risk_score: Math.round((riskMap.get(symbol) ?? 50) * 100) / 100,
      };
    });
  }

  // ------------------------------------------------------------------
  // 4. Volatility Adjusted — inversely proportional to volatility
  //    Higher volatility → lower weight. Use (1 - volatility) as basis.
  //    Volatility from feature_snapshots is expected in [0, 1] or [0, 100].
  // ------------------------------------------------------------------
  private async volatilityAdjusted(positions: string[]): Promise<PositionAllocation[]> {
    const featRes = await pool.query(
      `SELECT DISTINCT ON (symbol) symbol, volatility
       FROM feature_snapshots
       WHERE symbol = ANY($1)
       ORDER BY symbol, trade_date DESC`,
      [positions],
    );

    const volMap = new Map<string, number>();
    for (const row of featRes.rows) {
      if (row.volatility !== null) {
        const v = Number(row.volatility);
        // Normalize: if values are >1 treat as percentage scale (0-100)
        const normalized = v > 1 ? v / 100 : v;
        volMap.set(row.symbol, Math.max(0, Math.min(1, normalized)));
      }
    }

    // Also fetch confidence and risk scores for output
    const factorRes = await pool.query(
      `SELECT DISTINCT ON (symbol) symbol, confidence_score, risk_factor
       FROM factor_snapshots
       WHERE symbol = ANY($1)
       ORDER BY symbol, trade_date DESC`,
      [positions],
    );

    const confMap = new Map<string, number>();
    const riskMap = new Map<string, number>();
    for (const row of factorRes.rows) {
      confMap.set(row.symbol, row.confidence_score !== null ? Number(row.confidence_score) : 50);
      riskMap.set(row.symbol, row.risk_factor !== null ? Number(row.risk_factor) : 50);
    }

    // Invert volatility: higher vol → lower weight. Clamp to [0.01, 1].
    const inverted = positions.map(sym => {
      const vol = volMap.get(sym) ?? 0.30; // default moderate volatility
      return Math.max(0.01, 1 - vol);
    });

    const total = inverted.reduce((s, v) => s + v, 0);

    if (total === 0) {
      return this.equalWeight(positions);
    }

    return positions.map((symbol, i) => {
      const rawWeight = inverted[i] / total;
      return {
        symbol,
        weight: Math.round(rawWeight * 10000) / 10000,
        sizing_method: 'Volatility Adjusted' as SizingMethod,
        confidence_score: Math.round((confMap.get(symbol) ?? 50) * 100) / 100,
        risk_score: Math.round((riskMap.get(symbol) ?? 50) * 100) / 100,
      };
    });
  }
}

export const positionSizingEngine = new PositionSizingEngine();
export default PositionSizingEngine;