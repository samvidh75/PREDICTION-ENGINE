#!/bin/bash

# Gemma Training Monitor & Auto-Restart Script
# Monitors training process, detects hangs/failures, auto-restarts

LOG_FILE="/Volumes/Extreme SSD/PREDICTION-ENGINE/gemma_pse_training.log"
MONITOR_LOG="/Volumes/Extreme SSD/PREDICTION-ENGINE/monitor.log"
SCRIPT_DIR="/Volumes/Extreme SSD/PREDICTION-ENGINE"
MAX_STALE_TIME=300  # 5 minutes without log update = stuck

# Initialize monitor log
{
  echo "🚀 GEMMA MONITOR STARTED: $(date)"
  echo "Watching: $LOG_FILE"
  echo "Process: gemma_pse_training_fast.py"
  echo "Auto-restart: ENABLED"
  echo "Check interval: 30 seconds"
} > "$MONITOR_LOG"

check_and_restart() {
  local log_mod_time=$(stat -f%m "$LOG_FILE" 2>/dev/null || echo 0)
  local current_time=$(date +%s)
  local stale_time=$((current_time - log_mod_time))
  
  if pgrep -f "gemma_pse_training_fast" > /dev/null; then
    echo "[$(date '+%H:%M:%S')] ✅ Process running (stale: ${stale_time}s)" >> "$MONITOR_LOG"
    
    # Check if stuck (no log updates for 5+ minutes)
    if [ $stale_time -gt $MAX_STALE_TIME ]; then
      echo "[$(date '+%H:%M:%S')] ⚠️  STUCK DETECTED - Log unchanged for ${stale_time}s" >> "$MONITOR_LOG"
      tail -5 "$LOG_FILE" >> "$MONITOR_LOG"
      
      # Kill and restart
      echo "[$(date '+%H:%M:%S')] 🔄 Auto-restarting..." >> "$MONITOR_LOG"
      pkill -9 -f "gemma_pse_training_fast"
      sleep 2
      
      cd "$SCRIPT_DIR"
      nohup python3 -u scripts/gemma_pse_training_fast.py >> "$LOG_FILE" 2>&1 &
      echo "[$(date '+%H:%M:%S')] ✅ Restarted (PID: $!)" >> "$MONITOR_LOG"
    fi
  else
    echo "[$(date '+%H:%M:%S')] ❌ PROCESS DEAD" >> "$MONITOR_LOG"
    tail -10 "$LOG_FILE" >> "$MONITOR_LOG"
    
    # Auto-restart
    echo "[$(date '+%H:%M:%S')] 🔄 Auto-restarting dead process..." >> "$MONITOR_LOG"
    cd "$SCRIPT_DIR"
    nohup python3 -u scripts/gemma_pse_training_fast.py >> "$LOG_FILE" 2>&1 &
    echo "[$(date '+%H:%M:%S')] ✅ Restarted (PID: $!)" >> "$MONITOR_LOG"
    sleep 3
  fi
  
  # Get latest stats
  local latest=$(tail -1 "$LOG_FILE" 2>/dev/null)
  echo "[$(date '+%H:%M:%S')] Latest: $latest" >> "$MONITOR_LOG"
}

# Start monitoring loop
while true; do
  check_and_restart
  sleep 30
done
