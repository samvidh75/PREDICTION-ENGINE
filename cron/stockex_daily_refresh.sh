#!/bin/bash
set -euo pipefail

# StockEX Daily Cache Refresh
# Runs at 9:15 AM PHT every trading day via cron
# Refreshes PSE stock snapshots + market context

LOGFILE="/home/ubuntu/PREDICTION-ENGINE/logs/stockex_refresh.log"
PIDFILE="/tmp/stockex_refresh.pid"

mkdir -p "$(dirname "$LOGFILE")"

# Single-instance guard
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "[$(date)] Refresh already running (PID $(cat $PIDFILE)), skipping" >> "$LOGFILE"
    exit 0
fi
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT

echo "[$(date)] Starting StockEX daily cache refresh..." >> "$LOGFILE"

# 1. Refresh the cache via API
curl -s -X POST http://127.0.0.1:3001/api/ai/refresh-cache \
    --connect-timeout 5 --max-time 600 >> "$LOGFILE" 2>&1

# 2. Refresh PSE Daily Quotation Report data (net foreign flow) and the
#    PSE EDGE company directory — data/pse-foreign-flow.json and
#    data/pse-directory.json. Nothing else regenerates these; without this
#    step they go stale indefinitely once first generated.
echo "[$(date)] Refreshing PSE foreign-flow / directory data..." >> "$LOGFILE"
cd "$(dirname "$LOGFILE")/.." 2>/dev/null || cd /home/ubuntu/PREDICTION-ENGINE
python3 scripts/fetch_pse_data.py >> "$LOGFILE" 2>&1 || echo "[$(date)] fetch_pse_data.py failed (non-fatal, will retry next run)" >> "$LOGFILE"

echo "" >> "$LOGFILE"
echo "[$(date)] Refresh complete" >> "$LOGFILE"
