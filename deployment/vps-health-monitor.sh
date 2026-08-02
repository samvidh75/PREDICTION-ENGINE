#!/usr/bin/env bash
# ===========================================================================
# StockEX Philippines — VPS Health Monitor & Auto-Restore
# Runs as a systemd timer or cron job. Detects outages and auto-recovers.
# ===========================================================================
set -euo pipefail

APP_DIR="/opt/stockex"
LOG_FILE="/var/log/stockex-health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log()  { echo "[$TIMESTAMP] $*" >> "$LOG_FILE"; }
error_log() { echo "[$TIMESTAMP] ERROR: $*" >> "$LOG_FILE"; }

# Track consecutive failures
FAIL_FILE="/tmp/stockex-health-fails"
FAILS=0
if [ -f "$FAIL_FILE" ]; then
  FAILS=$(cat "$FAIL_FILE")
fi

log "=== Health Check ==="

# ── 1. Check SSH ──────────────────────────────────────────────────────
if systemctl is-active --quiet sshd 2>/dev/null || systemctl is-active --quiet ssh 2>/dev/null; then
  log "  ✅ SSH: running"
else
  error_log "  ❌ SSH: DOWN — attempting restart..."
  systemctl restart sshd 2>/dev/null || systemctl restart ssh 2>/dev/null || true
fi

# ── 2. Check Nginx ────────────────────────────────────────────────────
if systemctl is-active --quiet nginx; then
  log "  ✅ Nginx: running"
else
  error_log "  ❌ Nginx: DOWN — attempting restart..."
  systemctl restart nginx
  sleep 2
  if systemctl is-active --quiet nginx; then
    log "  ✅ Nginx: recovered"
  fi
fi

# ── 3. Check API server (port 4001) ───────────────────────────────────
if ss -tlnp | grep -q ':4001'; then
  log "  ✅ API (4001): listening"
else
  error_log "  ❌ API (4001): DOWN — attempting restart..."
  if [ -f /etc/systemd/system/stockex-api.service ]; then
    systemctl restart stockex-api 2>/dev/null || true
  fi
  # Fallback: try direct start
  if ! ss -tlnp | grep -q ':4001'; then
    if [ -f "$APP_DIR/src/render/startServer.ts" ]; then
      cd "$APP_DIR"
      nohup npx tsx src/render/startServer.ts > /var/log/stockex-api.log 2>&1 &
      log "  🔄 API: started via fallback"
    fi
  fi
fi

# ── 4. Check LLM server (port 8000) ───────────────────────────────────
if ss -tlnp | grep -q ':8000'; then
  log "  ✅ LLM (8000): listening"
else
  error_log "  ❌ LLM (8000): DOWN — attempting restart..."
  if [ -f /etc/systemd/system/stockex-llm.service ]; then
    systemctl restart stockex-llm 2>/dev/null || true
  fi
  if [ -f "$APP_DIR/deployment/llm_server.py" ]; then
    cd "$APP_DIR"
    nohup python3 deployment/llm_server.py > /var/log/stockex-llm.log 2>&1 &
    log "  🔄 LLM: started via fallback"
  fi
fi

# ── 5. Check LoRA server (port 3001) ──────────────────────────────────
if ss -tlnp | grep -q ':3001'; then
  log "  ✅ LoRA (3001): listening"
else
  error_log "  ❌ LoRA (3001): DOWN"
fi

# ── 6. Check Redis ────────────────────────────────────────────────────
if systemctl is-active --quiet redis-server 2>/dev/null || ss -tlnp | grep -q ':6379'; then
  log "  ✅ Redis: running"
else
  error_log "  ❌ Redis: DOWN — attempting restart..."
  systemctl restart redis-server 2>/dev/null || true
fi

# ── 7. Check disk space ──────────────────────────────────────────────
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  error_log "  ⚠️  Disk: ${DISK_USAGE}% — CRITICAL"
  # Clean up
  apt-get clean 2>/dev/null || true
  journalctl --vacuum-size=100M 2>/dev/null || true
  log "  🧹 Cleaned up logs and package cache"
elif [ "$DISK_USAGE" -gt 80 ]; then
  log "  ⚠️  Disk: ${DISK_USAGE}% — WARNING"
else
  log "  ✅ Disk: ${DISK_USAGE}%"
fi

# ── 8. Check memory ──────────────────────────────────────────────────
MEM_TOTAL=$(free -m | awk '/^Mem:/ {print $2}')
MEM_USED=$(free -m | awk '/^Mem:/ {print $3}')
MEM_PCT=$((MEM_USED * 100 / MEM_TOTAL))
if [ "$MEM_PCT" -gt 90 ]; then
  error_log "  ⚠️  Memory: ${MEM_PCT}% — CRITICAL"
elif [ "$MEM_PCT" -gt 80 ]; then
  log "  ⚠️  Memory: ${MEM_PCT}% — WARNING"
else
  log "  ✅ Memory: ${MEM_PCT}%"
fi

# ── 9. Check external connectivity ──────────────────────────────────
if ping -c 1 -W 3 8.8.8.8 &>/dev/null; then
  log "  ✅ Internet: connected"
else
  error_log "  ❌ Internet: DISCONNECTED"
fi

# ── 10. Failure tracking ─────────────────────────────────────────────
if grep -q "ERROR" <<< "$(tail -5 "$LOG_FILE")" 2>/dev/null; then
  FAILS=$((FAILS + 1))
  echo "$FAILS" > "$FAIL_FILE"
  if [ "$FAILS" -ge 3 ]; then
    error_log "  🔴 3+ consecutive failures — triggering recovery"
    # Restart all services
    systemctl restart stockex-api stockex-llm nginx redis-server 2>/dev/null || true
    echo "0" > "$FAIL_FILE"
    log "  🔄 Full service restart executed"
  fi
else
  echo "0" > "$FAIL_FILE"
fi

log "=== Health Check Complete ==="
echo "" >> "$LOG_FILE"