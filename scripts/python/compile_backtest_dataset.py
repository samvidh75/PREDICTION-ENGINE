"""
StockStory Backtest Dataset Compiler — Ollama training format.

Runs the vectorized backtest engine across all equities in the
daily_prices table, formats performance logs into structured
training blocks suitable for Ollama Modelfile ingestion.

Usage:
    python scripts/python/compile_backtest_dataset.py

Output:
    ./data/master_backtest_train.json  (Ollama training blocks)
"""

import json
import os
import sys

from backtest_engine import VectorizedBacktestEngine

DEFAULT_OUTPUT = os.getenv("BACKTEST_OUTPUT_PATH", "./data/master_backtest_train.json")


def export_backtest_to_ollama_dataset(
    sqlite_db: str = "",
    output_json: str = DEFAULT_OUTPUT,
) -> int:
    """
    Loop through all assets in daily_prices, run the volume-breakout
    backtest, and compile structured training records for Ollama.

    Returns the number of training records written.
    """
    engine = VectorizedBacktestEngine(db_path=sqlite_db) if sqlite_db else VectorizedBacktestEngine()
    tickers = engine.available_tickers()

    if not tickers:
        print("⚠️  No tickers found in daily_prices — database may be empty.")
        return 0

    print(f"🎬 Compiling backtest dataset for {len(tickers)} assets...")

    training_pool: list[dict] = []

    for ticker in tickers:
        results = engine.run_volume_breakout_strategy(ticker)

        if "error" in results or results.get("total_signals", 0) == 0:
            continue

        instruction = (
            "Evaluate historical algorithmic strategy backtest data "
            "and calculate quantitative risk-to-reward metrics."
        )

        input_text = (
            f"Ticker: {ticker} | "
            f"Strategy: Volume Breakout (2.5x vs 20-day SMA) | "
            f"Historical Signal Count: {results['total_signals']} | "
            f"Date Range: {results.get('data_range', 'N/A')}"
        )

        output_text = (
            f"Backtest metrics for {ticker}: "
            f"historical win rate of {results['win_rate_pct']}%, "
            f"average return of {results['avg_return_pct']}% per signal "
            f"over a 5-day forward window, "
            f"with maximum drawdown of {results['max_drawdown_pct']}%."
        )

        training_pool.append(
            {
                "instruction": instruction,
                "input": input_text,
                "output": output_text,
            }
        )

    # Write output
    os.makedirs(os.path.dirname(output_json) or ".", exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(training_pool, f, indent=2, ensure_ascii=False)

    print(f"✅ Compiled {len(training_pool)} strategy profiles → {output_json}")
    return len(training_pool)


# ── Standalone entrypoint ──────────────────────────────────
if __name__ == "__main__":
    count = export_backtest_to_ollama_dataset()
    if count == 0:
        print("ℹ️  No training records generated. Populate daily_prices first, then re-run.")
        sys.exit(0)
