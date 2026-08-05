// src/backtest/walkForwardStrategies.ts
// Pure, DB-free building blocks for real-data walk-forward backtesting.
// Kept free of any DB import so they can be unit-tested in isolation.

import type { BacktestBar } from "../services/backtest/types";

export interface DailyPriceRow {
  trade_date: string | Date;
  adjusted_close: number;
  close?: number;
}

/**
 * Convert raw `daily_prices` rows into `BacktestBar`s, filtering out rows
 * without a positive, finite close and sorting by date ascending. This is
 * the single normalization point between the DB and the backtest engine so
 * downstream math always sees a clean, chronological series.
 */
export function buildBacktestBars(rows: DailyPriceRow[]): BacktestBar[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
  );
  const bars: BacktestBar[] = [];
  for (const row of sorted) {
    const close = row.adjusted_close ?? row.close;
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) continue;
    bars.push({
      date: new Date(row.trade_date).toISOString().slice(0, 10),
      close,
    });
  }
  return bars;
}

/**
 * A simple, fully-disclosed trend-following strategy: go fully long when the
 * training window mean daily return is positive, otherwise hold cash. This is
 * intentionally trivial — it exists so walk-forward validation can measure a
 * strategy that derives exposure purely from the *past* training window (the
 * anti-lookahead guarantee comes from the validator slicing before the
 * strategy runs). Returns a 0..1 exposure (long-only, no leverage).
 */
export function momentumStrategy(trainReturns: number[]): number {
  if (trainReturns.length === 0) return 0;
  const mean = trainReturns.reduce((a, b) => a + b, 0) / trainReturns.length;
  return mean > 0 ? 1 : 0;
}
