#!/bin/bash
# StockEX Daily SLM Backtest & Training Cron
# Runs backtests, then triggers the SLM training injector.
#
# Schedule (crontab):
#   0 2 * * * /app/cron/stockstory_backtest.sh
#
# Environment variables (set in Railway):
#   DATABASE_URL — Neon PostgreSQL connection string

set -e

cd "$(dirname "$0")/.."

LOG_DIR="logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKTEST_LOG="$LOG_DIR/backtest_${TIMESTAMP}.log"
INJECTOR_LOG="$LOG_DIR/injector_${TIMESTAMP}.log"

echo "[$(date)] Starting daily backtest pipeline..." | tee -a "$BACKTEST_LOG"

# Step 1: Run backtest on NIFTY 50 universe
python3 scripts/python/backtest_slm_strategy.py \
    --fetch \
    --run \
    2>&1 | tee -a "$BACKTEST_LOG"

echo "[$(date)] Backtest complete. Starting SLM training injector..." | tee -a "$BACKTEST_LOG"

# Step 2: Compile Modelfile and register with Ollama
python3 scripts/python/slm_training_injector.py \
    --compile \
    2>&1 | tee -a "$INJECTOR_LOG"

echo "[$(date)] SLM training pipeline complete." | tee -a "$BACKTEST_LOG"
