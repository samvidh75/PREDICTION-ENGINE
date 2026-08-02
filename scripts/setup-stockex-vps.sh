#!/bin/bash
# ===========================================================================
# StockEX Philippines — VPS Setup & Deployment Script
# Target: Webyne Gold Linux VPS 2 (103.211.56.127)
# Ubuntu 22.04, 4 vCPU, 8GB RAM, 100GB SSD
# ===========================================================================
set -euo pipefail

VPS_USER="\${VPS_USER:-root}"
VPS_HOST="\${VPS_HOST:-103.211.56.127}"
SSH_KEY="\${SSH_KEY:-}"
BRANCH="\${BRANCH:-main}"
APP_DIR="/opt/stockex"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "\${GREEN}[INFO]\${NC} \$1"; }
warn()  { echo -e "\${YELLOW}[WARN]\${NC} \$1"; }
error() { echo -e "\${RED}[ERROR]\${NC} \$1"; }

SSH_CMD="ssh \${VPS_USER}@\${VPS_HOST}"
SCP_CMD="scp"

echo "=== StockEX Philippines VPS Deployment ==="
echo "Target: \${VPS_HOST}"

# Step 1: Check connectivity
info "Checking VPS connectivity..."
\$SSH_CMD "echo OK" || { error "Cannot reach VPS"; exit 1; }

# Step 2: System update
info "Updating system..."
\$SSH_CMD "apt-get update && apt-get upgrade -y"
\$SSH_CMD "apt-get install -y curl git docker.io docker-compose-plugin nginx python3.10 python3-venv python3-pip nodejs redis-server postgresql postgresql-contrib fail2ban ufw certbot"

# Step 3: Create app dir
info "Setting up \${APP_DIR}..."
\$SSH_CMD "mkdir -p \${APP_DIR} backups"

# Step 4: Push code
info "Deploying code..."
if \$SSH_CMD "test -d \${APP_DIR}/.git"; then
  info "Repo exists — pulling..."
  \$SSH_CMD "cd \${APP_DIR} && git fetch origin && git reset --hard origin/\${BRANCH}"
else
  info "Cloning fresh..."
  \$SSH_CMD "cd /opt && git clone https://github.com/samvidh75/PREDICTION-ENGINE.git stockex"
  \$SSH_CMD "cd \${APP_DIR} && git checkout \${BRANCH}"
fi
\$SCP_CMD -r stockex_slm_agent_output \${VPS_USER}@\${VPS_HOST}:\${APP_DIR}/stockex_slm_agent_output

# Step 5: Build
info "Building..."
\$SSH_CMD "cd \${APP_DIR} && npm ci --omit=dev && npm run build:frontend && npm run compile:backend"

# Step 6: Python LoRA setup
info "Setting up LoRA server..."
\$SSH_CMD "cd \${APP_DIR} && python3 -m venv .lora_venv"
\$SSH_CMD "cd \${APP_DIR} && .lora_venv/bin/pip install --upgrade pip"
\$SSH_CMD "cd \${APP_DIR} && .lora_venv/bin/pip install torch transformers peft fastapi uvicorn pandas numpy httpx"

# Step 7: systemd services
info "Installing systemd services..."
\$SSH_CMD "cat > /etc/systemd/system/stockex-lora.service << 'EOL'"
\$SSH_CMD "[Unit]"
\$SSH_CMD "Description=StockEX LoRA Server"
\$SSH_CMD "After=network.target"
\$SSH_CMD ""
\$SSH_CMD "[Service]"
\$SSH_CMD "Type=simple"
\$SSH_CMD "WorkingDirectory=\/opt\/stockex"
\$SSH_CMD "ExecStart=\/opt\/stockex\/.lora_venv\/bin\/uvicorn pse_ai_engine.server:app --host 0.0.0.0 --port 3001"
\$SSH_CMD "Restart=always"
\$SSH_CMD "RestartSec=10"
\$SSH_CMD "Environment=PYTHONPATH=/opt/stockex"
\$SSH_CMD ""
\$SSH_CMD "[Install]"
\$SSH_CMD "WantedBy=multi-user.target"
\$SSH_CMD "EOL"

# Step 8: Start
info "Starting services..."
\$SSH_CMD "systemctl daemon-reload"
\$SSH_CMD "systemctl enable stockex-lora"
\$SSH_CMD "systemctl start stockex-lora"

# Step 9: Firewall
info "Configuring firewall..."
\$SSH_CMD "ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 3001/tcp && ufw allow 4001/tcp && ufw --force enable"

# Step 10: Health check
info "Health checks..."
sleep 5
\$SSH_CMD "curl -s http://127.0.0.1:4001/api/health" && info "API OK" || warn "API not ready"
\$SSH_CMD "curl -s http://127.0.0.1:3001/api/ai/status" && info "LoRA OK" || warn "LoRA not ready"

echo ""
echo -e "\${GREEN}============================================\${NC}"
echo -e "\${GREEN}StockEX Philippines deployed!\${NC}"
echo -e "\${GREEN}Web: http://\${VPS_HOST}\${NC}"
echo -e "\${GREEN}API: http://\${VPS_HOST}:4001\${NC}"
echo -e "\${GREEN}============================================\${NC}"
echo ""
echo "SECURITY: Change VPS password immediately: passwd"
