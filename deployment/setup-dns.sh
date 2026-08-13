#!/usr/bin/env bash
# ===========================================================================
# StockEX Philippines — DNS & SSL Auto-Configuration
# Run on the VPS after initial setup.
# Usage: bash deployment/setup-dns.sh
# ===========================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-stockstory-india.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@stockstory-india.com}"
VPS_HOST="${VPS_HOST:-103.211.56.127}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     StockEX — DNS & SSL Setup                                 ║"
echo "║     Domain: ${DOMAIN} → ${VPS_HOST}                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Install DNS tools ────────────────────────────────────────
info "Installing DNS utilities..."
apt-get install -y dnsutils curl 2>/dev/null || true

# ── Step 2: Check current DNS resolution ─────────────────────────────
info "Checking DNS for ${DOMAIN}..."
CURRENT_IP=$(dig +short "${DOMAIN}" 2>/dev/null || nslookup "${DOMAIN}" 2>/dev/null | grep Address | tail -1 | awk '{print $2}' || echo "")
CURRENT_WWW=$(dig +short "www.${DOMAIN}" 2>/dev/null || echo "")

if [ -z "$CURRENT_IP" ]; then
  warn "⚠️  ${DOMAIN} has no A record configured"
  echo "   You need to add an A record in your DNS provider:"
  echo ""
  echo "   ┌──────────────────────────────────────────────────────────┐"
  echo "   │  Type: A Record                                          │"
  echo "   │  Name: @ (or ${DOMAIN})                                 │"
  echo "   │  Value: ${VPS_HOST}                                     │"
  echo "   │  TTL:  300 (or Auto)                                    │"
  echo "   │                                                          │"
  echo "   │  Type: A Record                                          │"
  echo "   │  Name: www                                               │"
  echo "   │  Value: ${VPS_HOST}                                     │"
  echo "   │  TTL:  300 (or Auto)                                    │"
  echo "   └──────────────────────────────────────────────────────────┘"
  echo ""
  echo "   Popular DNS providers:"
  echo "   - Cloudflare: dashboard.cloudflare.com"
  echo "   - Namecheap:  ap.www.namecheap.com"
  echo "   - GoDaddy:    dcc.godaddy.com"
  echo "   - Webyne:     (check Webyne dashboard for DNS management)"
  echo ""
  read -rp "Press Enter after you've configured DNS, or type 'skip' to continue without DNS: " SKIP_DNS
  if [ "$SKIP_DNS" = "skip" ]; then
    warn "Skipping DNS check"
  else
    info "Re-checking DNS..."
    sleep 5
    CURRENT_IP=$(dig +short "${DOMAIN}" 2>/dev/null || echo "")
    if [ "$CURRENT_IP" = "$VPS_HOST" ]; then
      info "✅ DNS configured correctly!"
    else
      warn "⚠️  DNS still not resolved. Continuing anyway..."
    fi
  fi
elif [ "$CURRENT_IP" != "$VPS_HOST" ]; then
  warn "⚠️  ${DOMAIN} points to ${CURRENT_IP}, not ${VPS_HOST}"
  echo "   Update your DNS A record to point to ${VPS_HOST}"
  read -rp "Press Enter to continue anyway: " CONTINUE
else
  info "✅ DNS correctly points to ${VPS_HOST}"
fi

# ── Step 3: Set up Nginx with domain ─────────────────────────────────
info "Setting up Nginx for ${DOMAIN}..."

cat > /etc/nginx/sites-available/stockex << NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # SPA - serve built frontend
    location / {
        root /opt/stockex/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # LLM proxy
    location /llm/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/stockex /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# ── Step 4: Get SSL certificate ──────────────────────────────────────
info "Obtaining SSL certificate from Let's Encrypt..."
nginx -t && systemctl reload nginx

if command -v certbot &>/dev/null; then
  certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos -m "${ADMIN_EMAIL}" || {
    warn "⚠️  SSL cert failed — domain DNS may not have propagated"
    warn "   Run manually later: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  }
else
  warn "⚠️  certbot not installed. Install it:"
  warn "   apt-get install -y certbot python3-certbot-nginx"
fi

# ── Step 5: Set up auto-renewal ──────────────────────────────────────
if command -v certbot &>/dev/null; then
  echo "0 3 1 * * root certbot renew --quiet && systemctl reload nginx" > /etc/cron.d/certbot-renew
  chmod 644 /etc/cron.d/certbot-renew
  info "✅ SSL auto-renewal configured (1st of month, 3 AM)"
fi

# ── Step 6: Final Nginx reload ───────────────────────────────────────
nginx -t && systemctl reload nginx && info "✅ Nginx configured for ${DOMAIN}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ DNS & SSL Setup Complete!                               ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Domain: https://${DOMAIN}                                  "
echo "║  WWW:    https://www.${DOMAIN}                              "
echo "║  API:    https://${DOMAIN}/api/health                        "
echo "║                                                             "
echo "║  Verify SSL:                                                "
echo "║    curl -I https://${DOMAIN}                                "
echo "║                                                             "
echo "║  Renew test:                                                "
echo "║    certbot renew --dry-run                                  "
echo "╚══════════════════════════════════════════════════════════════╝"