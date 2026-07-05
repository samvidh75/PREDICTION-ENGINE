#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# StockStory India — Oracle VM First-Time Setup
# Run this ONCE on a fresh Oracle Ubuntu 22.04/24.04 ARM instance.
# Usage: ssh -t ubuntu@<oracle-ip> 'bash -s' < scripts/setup-oracle-vm.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "=== StockStory Oracle VM Setup ==="

# ── 1. System updates & Docker ──
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git

# ── 2. Start Docker ──
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu

# ── 3. Clone repo ──
cd /home/ubuntu
git clone https://github.com/samvidh75/PREDICTION-ENGINE.git stockstory
cd stockstory

# ── 4. Create .env.production ──
# YOU MUST FILL THESE IN AFTER SETUP
cat > .env.production << 'ENVEOF'
# ── Database (Neon PostgreSQL) ──
DATABASE_URL=postgresql://user:pass@ep-xxxx.region.neon.tech/neondb?sslmode=require
DB_ADAPTER=postgres
FORCE_MIGRATIONS=true
ALLOW_SQLITE_FALLBACK=false
ALLOW_SQLITE_IN_PRODUCTION=false

# ── Security ──
NODE_ENV=production
COOKIE_SECRET=change-this-please

# ── CORS ──
EXTRA_ALLOWED_ORIGINS=https://stockstory-india.com,https://www.stockstory-india.com
SELF_ORIGIN=https://api.stockstory-india.com

# ── Market Data Providers ──
INDIANAPI_KEY=
UPSTOX_ACCESS_TOKEN=
UPSTOX_CLIENT_SECRET=

# ── LLM ──
LOCAL_AI_ENABLED=false
ENABLE_RESEARCH_BOT=true
ENABLE_SCORE_EXPLANATIONS=true
ENABLE_STOCK_SNAPSHOTS=true
ENABLE_STOCK_COMPARISON=true
ENABLE_SCANNER_THESES=true
ENABLE_THESIS_TRACKING=true
GROQ_API_KEY=

# ── Firebase (Auth) ──
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
ENVEOF

# ── 5. Pre-pull Ollama model (optional) ──
echo "Pulling default Ollama model..."
docker run --rm -d --name temp-ollama ollama/ollama sleep 10 2>/dev/null || true

# ── 6. Create directories ──
mkdir -p /home/ubuntu/stockstory/data

# ── 7. Set up Docker network ──
docker network create stockstory_net 2>/dev/null || true

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env.production with your real credentials:"
echo "     nano /home/ubuntu/stockstory/.env.production"
echo ""
echo "  2. Deploy containers:"
echo "     cd /home/ubuntu/stockstory"
echo "     sudo docker compose -f docker-compose.oracle.yml up -d --build"
echo ""
echo "  3. Pull your fine-tuned model in Ollama:"
echo "     docker exec stockstory_ollama ollama pull qwen2.5:0.5b"
echo ""
echo "  4. Set up DNS: Point api.stockstory-india.com → your Oracle VM IP"
echo ""
echo "  5. Verify: curl https://api.stockstory-india.com/healthz"
