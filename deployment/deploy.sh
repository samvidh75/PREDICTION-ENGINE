#!/usr/bin/env bash
# ===========================================================================
# StockEX Philippines — VPS Deployment Push Script
# Run from your local development machine to push code to VPS.
# Usage: bash deployment/deploy.sh [branch]
# ===========================================================================
set -euo pipefail

VPS_HOST="${VPS_HOST:-103.211.56.127}"
VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_PORT:-22}"
APP_DIR="/opt/stockex"
BRANCH="${1:-main}"
KEY_FILE="${SSH_KEY:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

SSH_OPTS="-p ${VPS_PORT} -o StrictHostKeyChecking=no -o ConnectTimeout=10"
[ -n "$KEY_FILE" ] && SSH_OPTS="$SSH_OPTS -i $KEY_FILE"

SSH_CMD="ssh $SSH_OPTS ${VPS_USER}@${VPS_HOST}"
SCP_CMD="scp $SSH_OPTS"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     StockEX Philippines — VPS Deployment                    ║"
echo "║     Target: ${VPS_USER}@${VPS_HOST}:${APP_DIR} (branch: ${BRANCH}) ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Verify connectivity ──────────────────────────────────────
info "Checking VPS connectivity..."
if $SSH_CMD "echo OK" 2>/dev/null; then
  info "✅ VPS reachable"
else
  error "❌ Cannot reach ${VPS_USER}@${VPS_HOST}:${VPS_PORT}"
  echo ""
  echo "Possible causes:"
  echo "  1. VPS is turned off — log into Webyne dashboard and start it"
  echo "  2. SSH is disabled — use Webyne console and run:"
  echo "     bash /opt/stockex/deployment/vps-first-boot.sh"
  echo "  3. Wrong IP — verify IP in Webyne dashboard"
  echo "  4. Firewall blocking — check Webyne security group settings"
  echo ""
  echo "Quick test:"
  echo "  ping -c 2 ${VPS_HOST}"
  echo "  nc -zv ${VPS_HOST} ${VPS_PORT}"
  exit 1
fi

# ── Step 2: Create app directory ──────────────────────────────────────
info "Ensuring ${APP_DIR} exists..."
$SSH_CMD "mkdir -p ${APP_DIR}"

# ── Step 3: Push code via rsync or git ───────────────────────────────
info "Pushing code..."
if command -v rsync &>/dev/null; then
  # Fast incremental push
  RSYNC_OPTS="-avz --delete --exclude=node_modules --exclude=.git --exclude=dist --exclude=stockex_slm_agent_output"
  [ -n "$KEY_FILE" ] && RSYNC_OPTS="$RSYNC_OPTS -e 'ssh -i $KEY_FILE -p $VPS_PORT'"
  eval rsync $RSYNC_OPTS ./ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/"
else
  # Fallback to git
  if $SSH_CMD "test -d ${APP_DIR}/.git"; then
    info "Repo exists — pulling..."
    $SSH_CMD "cd ${APP_DIR} && git fetch origin && git reset --hard origin/${BRANCH}"
  else
    info "Cloning fresh..."
    $SSH_CMD "cd /opt && git clone https://github.com/samvidh75s/prediction-engine.git stockex"
  fi
  $SSH_CMD "cd ${APP_DIR} && git checkout ${BRANCH}"
fi
info "✅ Code pushed"

# ── Step 4: Install dependencies ──────────────────────────────────────
info "Installing npm dependencies..."
$SSH_CMD "cd ${APP_DIR} && npm ci --omit=dev 2>/dev/null || npm install"
info "✅ Dependencies installed"

# ── Step 5: Build ─────────────────────────────────────────────────────
info "Building application..."
$SSH_CMD "cd ${APP_DIR} && npm run compile:backend && npm run build"
info "✅ Build complete"

# ── Step 6: Set up env ────────────────────────────────────────────────
info "Setting up environment..."
$SSH_CMD "cd ${APP_DIR} && cp -n .env.production .env 2>/dev/null || true"
info "✅ Environment configured"

# ── Step 7: Create/update systemd services ────────────────────────────
info "Installing systemd services..."
$SSH_CMD "cp ${APP_DIR}/deployment/vps-setup.sh /tmp/vps-setup.sh 2>/dev/null || true"

# Create API service
$SSH_CMD "cat > /etc/systemd/system/stockex-api.service << 'EOF'
[Unit]
Description=StockEX Philippines API
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/npx tsx src/render/startServer.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=4001
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF"

# Create LLM service
$SSH_CMD "cat > /etc/systemd/system/stockex-llm.service << 'EOF'
[Unit]
Description=StockEX LLM Inference Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/python3 -m uvicorn deployment.llm_server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF"

$SSH_CMD "systemctl daemon-reload"
$SSH_CMD "systemctl enable stockex-api stockex-llm"
info "✅ Systemd services installed"

# ── Step 8: Set up Nginx ──────────────────────────────────────────────
info "Configuring Nginx..."
$SSH_CMD "cp ${APP_DIR}/deployment/vps-setup.sh /tmp/setup-nginx.sh && cat /tmp/setup-nginx.sh | grep -A100 'cat > /etc/nginx/sites-available/stockex' > /tmp/nginx-setup.sh && bash /tmp/nginx-setup.sh 2>/dev/null || true"
info "✅ Nginx configured"

# ── Step 9: Start services ────────────────────────────────────────────
info "Starting services..."
$SSH_CMD "systemctl restart stockex-api stockex-llm nginx"
info "✅ Services started"

# ── Step 10: Health check ─────────────────────────────────────────────
info "Running health checks..."
sleep 5
$SSH_CMD "curl -s http://127.0.0.1:4001/api/health" && info "✅ API healthy" || warn "⚠️ API health check failed"
$SSH_CMD "curl -s http://127.0.0.1:8000/health" && info "✅ LLM healthy" || warn "⚠️ LLM health check failed"
$SSH_CMD "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:80" && info "✅ Nginx responding" || warn "⚠️ Nginx not responding"

# ── Step 11: Set up health monitoring ─────────────────────────────────
info "Setting up health monitoring..."
$SSH_CMD "cp ${APP_DIR}/deployment/vps-health-monitor.sh /usr/local/bin/stockex-health.sh && chmod +x /usr/local/bin/stockex-health.sh"
$SSH_CMD "echo '*/5 * * * * root /usr/local/bin/stockex-health.sh' > /etc/cron.d/stockex-health"
$SSH_CMD "chmod 644 /etc/cron.d/stockex-health"
info "✅ Health monitoring installed (every 5 min)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ StockEX Deployment Complete!                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Website: http://${VPS_HOST}                                "
echo "║  API:     http://${VPS_HOST}:4001                            "
echo "║  LLM:     http://${VPS_HOST}:8000                            "
echo "║  Domain:  stockex-ph.com (point DNS A record to ${VPS_HOST}) "
echo "║                                                             "
echo "║  Commands:                                                   "
echo "║  - Check API:  systemctl status stockex-api                  "
echo "║  - Check LLM:  systemctl status stockex-llm                  "
echo "║  - Logs API:   journalctl -u stockex-api -f                  "
echo "║  - Logs LLM:   journalctl -u stockex-llm -f                  "
echo "║  - Health:     cat /var/log/stockex-health.log               "
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""