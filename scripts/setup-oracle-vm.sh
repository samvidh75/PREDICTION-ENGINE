#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# StockStory India — Oracle Cloud Free Tier VM Setup (ARM Ampere A1)
# =============================================================================
# Prerequisites:
#   1. Create an Oracle Free Tier account (cloud.oracle.com)
#   2. Create an ARM Ampere A1 VM: Ubuntu 22.04/24.04 LTS (min. 2 OCPU, 12 GB)
#   3. Open ports 80 (HTTP), 443 (HTTPS) in the security list
#   4. Point your DNS (api.stockstory-india.com) to the VM's public IP
#
# Usage:
#   scp scripts/setup-oracle-vm.sh ubuntu@<oracle-ip>:~
#   ssh ubuntu@<oracle-ip>
#   chmod +x setup-oracle-vm.sh && ./setup-oracle-vm.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail
REPO_URL="https://github.com/samvidh75/PREDICTION-ENGINE.git"
INSTALL_DIR="/home/ubuntu/stockstory"

echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║        StockStory India — Oracle Cloud Free Tier Setup              ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. System updates & prerequisites ──────────────────────────────────────
echo "[1/8] Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
sudo apt-get install -y -qq \
  docker.io \
  docker-compose-v2 \
  git \
  curl \
  wget \
  ufw \
  htop \
  unattended-upgrades

echo "[2/8] Configuring automatic security updates..."
sudo dpkg-reconfigure --priority=low unattended-upgrades -f noninteractive

# ── 2. Configure firewall (Oracle security list should also restrict this) ─
echo "[3/8] Configuring firewall..."
sudo ufw --force disable  # reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw --force enable
sudo ufw status verbose

# ── 3. Configure Docker ─────────────────────────────────────────────────────
echo "[4/8] Configuring Docker..."
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
# Enable Docker BuildKit for faster ARM builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
mkdir -p /etc/systemd/system/docker.service.d
cat > /tmp/docker-optimizations.conf << 'DOCKER_EOF'
[Service]
# Limit Docker log size
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// --log-driver json-file --log-opt max-size=10m --log-opt max-file=3
DOCKER_EOF
sudo mv /tmp/docker-optimizations.conf /etc/systemd/system/docker.service.d/optimizations.conf
sudo systemctl daemon-reload
sudo systemctl restart docker

# ── 4. Clone repository ─────────────────────────────────────────────────────
echo "[5/8] Cloning repository..."
if [ -d "$INSTALL_DIR" ]; then
  echo "  Directory exists — pulling latest..."
  cd "$INSTALL_DIR" && git pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# ── 5. Create environment file from template ────────────────────────────────
echo "[6/8] Creating .env.oracle from template..."
if [ ! -f .env.oracle ]; then
  echo "  ERROR: .env.oracle not found! Run this script from the repo root."
  echo "  Make sure .env.oracle exists before continuing."
  echo ""
  echo "  Fill in your real credentials:"
  echo "    nano $INSTALL_DIR/.env.oracle"
  exit 1
fi

# Back up the original if it's a template (contains placeholder values)
if grep -q "change-this" .env.oracle; then
  echo "  ⚠  WARNING: .env.oracle still contains placeholder values!"
  echo "  Please edit it now with your real credentials:"
  echo "    nano $INSTALL_DIR/.env.oracle"
  echo ""
  echo "  Minimum required values:"
  echo "    - DATABASE_URL  (Neon PostgreSQL)"
  echo "    - COOKIE_SECRET (random 64-char string)"
  echo "    - FIREBASE_PRIVATE_KEY (if using Firebase Auth)"
  echo "    - INDIANAPI_KEY (market data)"
  echo ""
  read -rp "  Press Enter after editing, or Ctrl+C to abort and edit later... "
fi

# ── 6. Create required directories ──────────────────────────────────────────
echo "[7/8] Creating data directories..."
mkdir -p data logs/caddy

# ── 7. Pull Ollama model (optional — uncomment the model you want) ─────────
echo "[8/8] Pre-pulling Ollama model (background)..."
# Start Ollama temporarily to pull the model
docker compose -f docker-compose.oracle.yml up -d ollama
echo "  Waiting for Ollama to initialize..."
sleep 15
echo "  Pulling lightweight model for analysis (qwen2.5:0.5b)..."
docker exec stockstory_ollama ollama pull qwen2.5:0.5b 2>/dev/null || true
echo "  Stopping Ollama (will be started by docker-compose)..."
docker compose -f docker-compose.oracle.yml down

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete                                    ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Next steps:"
echo ""
echo "   1. Edit environment variables (if not done):"
echo "      nano $INSTALL_DIR/.env.oracle"
echo ""
echo "   2. Deploy all services:"
echo "      cd $INSTALL_DIR"
echo "      sudo docker compose -f docker-compose.oracle.yml up -d --build"
echo ""
echo "   3. Monitor startup:"
echo "      sudo docker compose -f docker-compose.oracle.yml logs -f"
echo ""
echo "   4. Verify health:"
echo "      curl http://localhost:4001/api/health"
echo "      curl http://localhost:8000/api/health"
echo ""
echo "   5. Set up DNS:"
echo "      Point api.stockstory-india.com → $(curl -s ifconfig.me)"
echo ""
echo "   6. Verify SSL (after DNS propagates):"
echo "      curl https://api.stockstory-india.com/healthz"
echo ""
echo "  Useful commands:"
echo "    View logs:      docker compose -f docker-compose.oracle.yml logs -f [service]"
echo "    Restart:        docker compose -f docker-compose.oracle.yml restart [service]"
echo "    Rebuild:        docker compose -f docker-compose.oracle.yml up -d --build [service]"
echo "    Shell access:   docker exec -it stockstory_api sh"
echo "    Resource usage: docker stats"
echo ""
