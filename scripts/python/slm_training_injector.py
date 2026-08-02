"""
StockEX SLM Training Injector
===============================
Queries strategy backtest metrics from PostgreSQL, compiles structured
few-shot system prompts, and injects them into the local Ollama Modelfile.

This enables the stockstory-slm model to reference real historical win rates,
CAGR, and drawdown data instead of generating generic financial commentary.

Usage:
    python3 slm_training_injector.py --compile          # Compile + register with Ollama
    python3 slm_training_injector.py --preview           # Preview Modelfile without writing
    python3 slm_training_injector.py --limit 30          # Top 30 strategies

Cron (weekly):
    30 23 * * 0 DATABASE_URL="..." python3 /path/to/slm_training_injector.py --compile

Environment:
    DATABASE_URL       — Neon PostgreSQL connection string (required)
    OLLAMA_MODEL_NAME  — Ollama model name (default: stockstory-slm)
    MODELFILE_PATH     — Path to Modelfile (default: ./Modelfile)
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

DATABASE_URL = os.getenv("DATABASE_URL")
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME", "stockstory-slm")
MODELFILE_PATH = os.getenv("MODELFILE_PATH", "./Modelfile")


class SlmTrainingInjector:
    """Extracts backtest metrics and compiles them into Ollama Modelfile layers."""

    def __init__(self, limit: int = 15):
        self.limit = limit
        print(f"⏳ Initializing StockEX SLM Training Injector")
        print(f"   Model: {OLLAMA_MODEL_NAME}")
        print(f"   Modelfile: {MODELFILE_PATH}")
        print(f"   Limit: {self.limit} strategies")

    # ── Data Extraction ─────────────────────────────────────────

    def fetch_backtest_metrics(self) -> list:
        """Query top-performing backtest strategies from PostgreSQL."""
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT ticker, strategy_name, total_signals_triggered,
                       win_rate_pct, cagr_pct, max_drawdown_pct, sharpe_ratio
                FROM slm_strategy_backtest_metrics
                WHERE total_signals_triggered > 5
                ORDER BY win_rate_pct DESC
                LIMIT %s;
            """, (self.limit,))
            rows = cursor.fetchall()
            cursor.close()
            return rows
        finally:
            conn.close()

    # ── Modelfile Compilation ───────────────────────────────────

    def compile_modelfile(self, metrics: list) -> str:
        """Build the complete Modelfile content from backtest metrics."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        lines = [
            "# =========================================================",
            "# StockEX Authoritative Quantitative SLM Configuration Layer",
            f"# Generated: {timestamp}",
            "# =========================================================",
            "FROM qwen2.5:0.5b-instruct",
            "",
            "PARAMETER temperature 0.1",
            'PARAMETER stop "<|im_end|>"',
            "",
            'SYSTEM """',
            "You are a dedicated StockEX financial intelligence chip running",
            "natively on this device. Analyze historical backtesting metrics,",
            "win rates, and maximum asset drawdowns to provide a precise,",
            "2-sentence structural risk and trend-continuation evaluation.",
            "Never invent or hallucinate metrics. Base all answers on the",
            "few-shot examples provided below.",
            '"""',
            "",
        ]

        if not metrics:
            lines.append("# No backtest data available — using default baseline")
        else:
            lines.append("# --- Automated Strategy Interaction Tuning Maps ---")
            lines.append("")

            for row in metrics:
                ticker = row["ticker"].replace(".NS", "").replace(".BO", "")
                strategy = row["strategy_name"] or "default"
                signals = row["total_signals_triggered"] or 0
                win_rate = float(row["win_rate_pct"] or 0)
                cagr = float(row["cagr_pct"] or 0)
                drawdown = float(row["max_drawdown_pct"] or 0)
                sharpe = float(row["sharpe_ratio"] or 0)

                user_prompt = (
                    f"Evaluate historical performance profile for "
                    f"Ticker: {ticker} under strategy parameters: {strategy}."
                )
                assistant_response = (
                    f"Quantitative backtesting metrics for {ticker} under "
                    f"the {strategy} parameter matrix confirm a historical "
                    f"win rate of {win_rate:.1f}% across {signals} execution "
                    f"triggers, yielding a CAGR of {cagr:.1f}% with an "
                    f"absolute maximum historical drawdown limited to "
                )

                lines.append(f'MESSAGE user "{user_prompt}"')
                lines.append(f'MESSAGE assistant "{assistant_response}"')
                lines.append("")

        return "\n".join(lines)

    # ── File Write + Ollama Registration ────────────────────────

    def write_modelfile(self, content: str):
        """Write the compiled Modelfile to disk."""
        with open(MODELFILE_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"   Written to {MODELFILE_PATH} ({len(content)} bytes)")

    def register_with_ollama(self) -> bool:
        """Run 'ollama create' to register the updated model."""
        print(f"   Registering {OLLAMA_MODEL_NAME} with Ollama...")
        try:
            result = subprocess.run(
                ["ollama", "create", OLLAMA_MODEL_NAME, "-f", MODELFILE_PATH],
                check=True, capture_output=True, text=True, timeout=120,
            )
            if result.stdout:
                for line in result.stdout.strip().split("\n"):
                    print(f"   {line}")
            print(f"   Model '{OLLAMA_MODEL_NAME}' re-registered successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"   Ollama create failed: {e.stderr or e.stdout}")
            return False
        except FileNotFoundError:
            print("   Ollama not found. Install from https://ollama.ai")
            return False

    # ── Run Pipeline ────────────────────────────────────────────

    def run(self, compile_mode: bool = False, preview: bool = False):
        """Execute the full extract → compile → register pipeline."""
        print(f"\n{'='*60}")
        print(f"  StockEX SLM TRAINING INJECTOR")
        print(f"  Mode: {'COMPILE' if compile_mode else 'PREVIEW'}")
        print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")

        # Step 1: Fetch metrics
        print("\n📊 Extracting top performing backtest vectors...")
        metrics = self.fetch_backtest_metrics()
        print(f"   Found {len(metrics)} strategy records")

        # Step 2: Compile Modelfile
        content = self.compile_modelfile(metrics)

        if preview:
            print("\n📝 PREVIEW — Modelfile content:")
            print("-" * 40)
            print(content[:800] + ("..." if len(content) > 800 else ""))
            print("-" * 40)
            print(f"   Total: {len(content)} bytes")
            return

        # Step 3: Write to disk
        print("\n💾 Writing Modelfile...")
        self.write_modelfile(content)

        # Step 4: Register with Ollama
        if compile_mode:
            print("\n⚙️  Compiling model...")
            success = self.register_with_ollama()
            status = "SUCCESS" if success else "FAILED"
        else:
            print("\n⏸️  Skipping Ollama registration (use --compile to register)")
            status = "MODELFILE_WRITTEN"

        print(f"\n{'='*60}")
        print(f"  {status}")
        print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")


# ── CLI ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="StockEX SLM Training Injector — compiles backtest metrics into Ollama Modelfile"
    )
    parser.add_argument(
        "--compile", action="store_true",
        help="Compile Modelfile and register updated model with Ollama",
    )
    parser.add_argument(
        "--preview", action="store_true",
        help="Preview the Modelfile content without writing to disk",
    )
    parser.add_argument(
        "--limit", type=int, default=15,
        help="Maximum number of strategy records to include (default: 15)",
    )
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL environment variable is required")
        sys.exit(1)

    injector = SlmTrainingInjector(limit=args.limit)

    if args.preview:
        injector.run(preview=True)
    elif args.compile:
        injector.run(compile_mode=True)
    else:
        injector.run()
