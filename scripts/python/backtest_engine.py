"""
StockStory Vectorized Strategy Backtesting Engine.

Reads historical daily candles from the local SQLite database,
applies quantitative strategies using vectorized array math (Pandas/NumPy),
and computes institutional-grade performance metrics.

Usage:
    from backtest_engine import VectorizedBacktestEngine
    engine = VectorizedBacktestEngine()
    metrics = engine.run_volume_breakout_strategy("RELIANCE")
"""

import os
import sqlite3
from typing import Optional

import numpy as np
import pandas as pd

DEFAULT_DB_PATH = os.getenv("DB_PATH", "./data/stockstory.db")


class VectorizedBacktestEngine:
    """High-performance backtesting using vectorized Pandas operations."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path

    def run_volume_breakout_strategy(self, ticker: str) -> dict:
        """
        Execute a vectorized volume-breakout strategy.

        1. Computes a 20-day rolling average of volume.
        2. Signals when volume exceeds 2.5x the 20-day average.
        3. Measures forward 5-day return from each signal.
        4. Reports win rate, average return, and maximum drawdown.

        Returns a dict of quantitative metrics (no recommendations).
        """
        if not os.path.isfile(self.db_path):
            return {"ticker": ticker, "error": f"Database not found: {self.db_path}"}

        conn = sqlite3.connect(self.db_path)

        query = """
            SELECT trade_date, open, high, low, close, adjusted_close, volume
            FROM daily_prices
            WHERE symbol = ?
            ORDER BY trade_date ASC
        """
        df = pd.read_sql_query(query, conn, params=(ticker.upper(),))
        conn.close()

        if df.empty or len(df) < 30:
            return {
                "ticker": ticker,
                "total_signals": 0,
                "win_rate_pct": 0.0,
                "avg_return_pct": 0.0,
                "max_drawdown_pct": 0.0,
                "note": "Insufficient data (need >= 30 rows)",
            }

        # --- VECTORIZED STRATEGY COMPUTATIONS (no loops) ---

        # 1. 20-day rolling average volume
        df["vol_sma20"] = df["volume"].rolling(window=20, min_periods=20).mean()

        # 2. Volume breakout signal: volume > 2.5x 20-day SMA
        df["volume_breakout"] = df["volume"] > (df["vol_sma20"] * 2.5)

        # 3. Forward 5-day return
        df["forward_5d_return"] = df["close"].shift(-5) / df["close"] - 1

        # Isolate breakout events
        breakout_events = df[df["volume_breakout"]].copy()

        if breakout_events.empty:
            return {
                "ticker": ticker,
                "total_signals": 0,
                "win_rate_pct": 0.0,
                "avg_return_pct": 0.0,
                "max_drawdown_pct": 0.0,
            }

        # --- QUANTITATIVE METRICS ---
        total_signals = len(breakout_events)
        winning_trades = int((breakout_events["forward_5d_return"] > 0).sum())
        win_rate = round((winning_trades / total_signals) * 100, 2)
        avg_return = round(float(breakout_events["forward_5d_return"].mean() * 100), 2)

        # Maximum drawdown (vectorized)
        df["rolling_max"] = df["close"].cummax()
        df["drawdown"] = (df["close"] - df["rolling_max"]) / df["rolling_max"]
        max_drawdown = round(float(df["drawdown"].min() * 100), 2)

        return {
            "ticker": ticker,
            "total_signals": total_signals,
            "win_rate_pct": win_rate,
            "avg_return_pct": avg_return,
            "max_drawdown_pct": abs(max_drawdown),
            "data_range": f"{df['trade_date'].iloc[0]} to {df['trade_date'].iloc[-1]}",
            "total_days": len(df),
        }

    def available_tickers(self) -> list[str]:
        """Return all tickers with daily price data."""
        if not os.path.isfile(self.db_path):
            return []
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT symbol FROM daily_prices ORDER BY symbol")
        tickers = [row[0] for row in cursor.fetchall()]
        conn.close()
        return tickers


# ── Standalone smoke test ──────────────────────────────────
if __name__ == "__main__":
    engine = VectorizedBacktestEngine()
    print("🔍 Available tickers:", engine.available_tickers())
    sample = engine.run_volume_breakout_strategy("RELIANCE")
    print("\n📊 Vectorized Strategy Analytics:")
    for k, v in sample.items():
        print(f"  {k}: {v}")
