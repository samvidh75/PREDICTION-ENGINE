#!/bin/bash
set -euo pipefail

# ===========================================================================
# StockStory StockEX LoRA Model — VPS Deployment Script
# Target: Webyne Gold Linux VPS 2 (103.211.56.127)
# Deploys the fine-tuned Qwen2.5-0.5B-Instruct + stockex_slm_agent_output
# ===========================================================================

VPS_USER="${VPS_USER:-ubuntu}"
VPS_HOST="${VPS_HOST:-103.211.56.127}"
VPS_PATH="${VPS_PATH:-/home/ubuntu/PREDICTION-ENGINE}"
SSH_KEY="${SSH_KEY:-}"
BRANCH="${BRANCH:-main}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

SSH_CMD="ssh ${VPS_USER}@${VPS_HOST}"
if [ -n "$SSH_KEY" ]; then
  SSH_CMD="ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_HOST}"
fi
SCP_CMD="scp"
if [ -n "$SSH_KEY" ]; then
  SCP_CMD="scp -i ${SSH_KEY}"
fi

info "Deploying StockEX LoRA model to ${VPS_USER}@${VPS_HOST}"

# ── Step 1: Verify VPS is reachable ──────────────────────────────────────
info "Checking VPS connectivity..."
$SSH_CMD "echo OK" || { error "Cannot reach VPS"; exit 1; }
info "VPS reachable"

# ── Step 2: Push the repo (or pull latest) ───────────────────────────────
info "Pushing latest code to VPS..."
$SSH_CMD "mkdir -p ${VPS_PATH}"
if $SSH_CMD "test -d ${VPS_PATH}/.git"; then
  # Repo exists — pull latest
  info "Repo exists on VPS, pulling latest..."
  $SSH_CMD "cd ${VPS_PATH} && git fetch origin && git reset --hard origin/${BRANCH}"
else
  # Fresh clone
  info "Cloning repo to VPS..."
  $SSH_CMD "cd $(dirname ${VPS_PATH}) && git clone https://github.com/samvidh75s/prediction-engine.git $(basename ${VPS_PATH})"
  $SSH_CMD "cd ${VPS_PATH} && git checkout ${BRANCH}"
fi

# ── Step 3: Ensure stockex_slm_agent_output adapter is on the VPS ───────
info "Ensuring LoRA adapter files are present..."
$SSH_CMD "test -d ${VPS_PATH}/stockex_slm_agent_output" || {
  warn "Adapter directory missing — copying from local"
  $SCP_CMD -r stockex_slm_agent_output ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/stockex_slm_agent_output
}
$SSH_CMD "test -f ${VPS_PATH}/stockex_slm_agent_output/adapter_config.json" || {
  error "Adapter files incomplete"
  exit 1
}
info "Adapter files confirmed"

# ── Step 4: Install Python LoRA server dependencies ──────────────────────
info "Setting up Python virtual environment..."
$SSH_CMD "cd ${VPS_PATH} && python3 -m venv .lora_venv"
info "Installing Python packages (torch, transformers, peft)..."
$SSH_CMD "cd ${VPS_PATH} && .lora_venv/bin/pip install --upgrade pip"
$SSH_CMD "cd ${VPS_PATH} && .lora_venv/bin/pip install -r requirements-lora-server.txt"
info "Python environment ready"

# ── Step 5: Install Node.js dependencies and build ───────────────────────
info "Installing Node.js dependencies..."
$SSH_CMD "cd ${VPS_PATH} && npm install"
info "Building frontend and backend..."
$SSH_CMD "cd ${VPS_PATH} && npm run build:all || npm run build && npm run compile:backend"

# ── Step 6: Install systemd service for LoRA server ──────────────────────
info "Installing systemd service for LoRA inference server..."
$SSH_CMD "sudo cp ${VPS_PATH}/deployment/systemd/stockstory-lora-server.service /etc/systemd/system/stockstory-lora-server.service"
$SSH_CMD "sudo systemctl daemon-reload"
$SSH_CMD "sudo systemctl enable stockstory-lora-server"

# ── Step 7: Update nginx config ──────────────────────────────────────────
info "Updating nginx configuration..."
$SSH_CMD "sudo cp ${VPS_PATH}/deployment/nginx-stockstory.conf /etc/nginx/sites-available/stockstory 2>/dev/null; sudo nginx -t && sudo systemctl reload nginx || warn 'Nginx reload skipped (not installed?)'"

# ── Step 8: Update .env.production with LORA_SERVER_URL ─────────────────
info "Setting environment variables..."
$SSH_CMD "grep -q 'LORA_SERVER_URL' ${VPS_PATH}/.env.production 2>/dev/null || echo 'LORA_SERVER_URL=http://127.0.0.1:3001' >> ${VPS_PATH}/.env.production"

# ── Step 9: Start everything ─────────────────────────────────────────────
info "Starting LoRA server..."
$SSH_CMD "sudo systemctl restart stockstory-lora-server"
info "Waiting for LoRA server to load model..."
sleep 10
$SSH_CMD "curl -s http://127.0.0.1:3001/api/ai/status" || {
  warn "LoRA server not ready yet, checking logs..."
  $SSH_CMD "sudo journalctl -u stockstory-lora-server -n 20 --no-pager"
}

info "Restarting backend..."
$SSH_CMD "sudo systemctl restart stockstory-backend"

# ── Step 10: Health check ───────────────────────────────────────────────
info "Running health checks..."
sleep 3
$SSH_CMD "curl -s http://127.0.0.1:4001/api/ai/status" || warn "Backend AI status check failed"
$SSH_CMD "curl -s http://127.0.0.1:3001/api/ai/status" || warn "LoRA server status check failed"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  StockEX LoRA model deployment complete!${NC}"
echo -e "${GREEN}  Python LoRA server: http://${VPS_HOST}:3001${NC}"
echo -e "${GREEN}  Node.js API:        http://${VPS_HOST}:4001${NC}"
echo -e "${GREEN}  Status endpoint:    http://${VPS_HOST}:4001/api/ai/status${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Commands:"
echo "  Check LoRA server:  sudo systemctl status stockstory-lora-server"
echo "  LoRA logs:          sudo journalctl -u stockstory-lora-server -f"
echo "  Backend logs:       sudo journalctl -u stockstory-backend -f"
echo "  Test analyze:       curl -X POST http://127.0.0.1:3001/api/ai/analyze -H 'Content-Type: application/json' -d '{\"ticker\":\"RELIANCE\",\"query\":\"What is the P/E ratio?\"}'"
