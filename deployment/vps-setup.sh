#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# StockEX Philippines — VPS Deployment Script for Webyne Gold Linux VPS 2
# Target: Ubuntu 22.04, Docker + Node.js + LLM + Nginx + SSL
# ─────────────────────────────────────────────────────────────────────────────

echo "🚀 StockEX Philippines VPS Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. System update & essentials
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git build-essential python3 python3-pip python3-venv \
  nginx certbot python3-certbot-nginx ufw redis-server

# 2. Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v && npm -v

# 3. Install Docker
curl -fsSL https://get.docker.com | bash
systemctl enable docker && systemctl start docker

# 4. Clone / Deploy the app
cd /opt
git clone https://github.com/samvidh75s/prediction-engine.git stockex || true
cd stockex
git pull origin main || true

# 5. Install dependencies
npm install
npm run compile:backend
npm run build

# 6. Set up environment
cp .env.production .env
# Edit .env with correct database, redis, etc.

# 7. Set up Nginx as reverse proxy
cat > /etc/nginx/sites-available/stockex << 'NGINX'
server {
    listen 80;
    server_name stockex-ph.com www.stockex-ph.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stockex-ph.com www.stockex-ph.com;

    ssl_certificate /etc/letsencrypt/live/stockex-ph.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stockex-ph.com/privkey.pem;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # SPA
    location / {
        root /opt/stockex/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # LLM
    location /llm/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/stockex /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 8. SSL certificate
certbot --nginx -d stockex-ph.com -d www.stockex-ph.com --non-interactive --agree-tos -m admin@stockex-ph.com || true

# 9. Set up systemd services
cat > /etc/systemd/system/stockex-api.service << 'SERVICE'
[Unit]
Description=StockEX Philippines API
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/stockex
ExecStart=/usr/bin/npx tsx src/render/startServer.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=4001
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
SERVICE

cat > /etc/systemd/system/stockex-llm.service << 'SERVICE'
[Unit]
Description=StockEX LLM Inference Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/stockex
ExecStart=/usr/local/bin/python3 -m uvicorn llm_server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable stockex-api stockex-llm
systemctl restart nginx

# 10. Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 11. Redis for caching
systemctl enable redis-server
systemctl start redis-server

# 12. Install health monitoring
cp /opt/stockex/deployment/vps-health-monitor.sh /usr/local/bin/stockex-health.sh
chmod +x /usr/local/bin/stockex-health.sh
cp /opt/stockex/deployment/systemd/stockex-health.service /etc/systemd/system/
cp /opt/stockex/deployment/systemd/stockex-health.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable stockex-health.timer
systemctl start stockex-health.timer
echo "Health monitoring installed (every 5 minutes)"

echo ""
echo "✅ StockEX Philippines deployed successfully!"
echo "   API: https://stockex-ph.com/api"
echo "   Web: https://stockex-ph.com"
echo "   LLM: http://127.0.0.1:8000"
echo ""
echo "⚠️  Next steps:"
echo "   1. Configure DNS A records → 103.211.56.127"
echo "   2. Set .env with DB and Redis credentials"
echo "   3. Verify 'systemctl status stockex-api'"
echo "   4. Check 'journalctl -u stockex-api -f'"
