#!/usr/bin/env bash
# ===========================================================================
# StockEX Philippines — VPS Emergency Recovery
# Run when VPS is completely broken and you need to start fresh.
# PASTE THIS INTO THE WEBYNE CONSOLE.
# ===========================================================================
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  StockEX — EMERGENCY VPS RECOVERY                           ║"
echo "║  This will RESET and redeploy everything!                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$(id -u)" -ne 0 ]; then
  echo "❌ Must run as root"
  exit 1
fi

echo "WARNING: This will reset all services and data!"
echo "Press Ctrl+C within 5 seconds to abort..."
sleep 5

echo ""
echo "━━━ [1/6] Killing all StockEX processes ━━━"
pkill -f "tsx src/render" 2>/dev/null || true
pkill -f "llm_server" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "node.*startServer" 2>/dev/null || true
echo "✅ Processes killed"

echo ""
echo "━━━ [2/6] Resetting firewall ━━━"
ufw --force disable 2>/dev/null || true
ufw --force reset 2>/dev/null || true
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 4001/tcp
ufw --force enable
echo "✅ Firewall reset"

echo ""
echo "━━━ [3/6] Restarting core services ━━━"
systemctl restart sshd 2>/dev/null || systemctl restart ssh 2>/dev/null || true
systemctl restart nginx 2>/dev/null || true
systemctl restart redis-server 2>/dev/null || true
systemctl daemon-reload 2>/dev/null || true
echo "✅ Core services restarted"

echo ""
echo "━━━ [4/6] Restarting StockEX services ━━━"
systemctl restart stockex-api 2>/dev/null || true
systemctl restart stockex-llm 2>/dev/null || true
echo "✅ StockEX services restarted"

echo ""
echo "━━━ [5/6] Running health check ━━━"
sleep 3
echo "  API (4001):  $(ss -tlnp | grep -q ':4001' && echo 'RUNNING' || echo 'DOWN')"
echo "  LLM (8000):  $(ss -tlnp | grep -q ':8000' && echo 'RUNNING' || echo 'DOWN')"
echo "  Nginx (80):  $(ss -tlnp | grep -q ':80' && echo 'RUNNING' || echo 'DOWN')"
echo "  SSH (22):    $(ss -tlnp | grep -q ':22' && echo 'RUNNING' || echo 'DOWN')"

echo ""
echo "━━━ [6/6] Restarting health monitor ━━━"
/usr/local/bin/stockex-health.sh 2>/dev/null || true
echo "✅ Health monitor triggered"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ VPS Recovery Complete!                                  ║"
echo "║  Try SSH now: ssh root@$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)"
echo "╚══════════════════════════════════════════════════════════════╝"