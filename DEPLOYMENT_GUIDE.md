# StockStory India — Deployment Guide

**Production domain:** https://stockstory-india.com  
**Stack:** Vite (React 18) + Fastify (Node 20) + PostgreSQL 16 + Redis 7 + Nginx

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 LTS |
| npm | ≥ 10 |
| Docker | ≥ 24 |
| Docker Compose | ≥ 2.20 |
| PostgreSQL | 16 (or use container) |
| Redis | 7 (or use container) |

---

## 1. Environment Setup

```bash
# Copy the example template
cp .env.production.example .env.production

# Fill in every value — especially:
#   VITE_FIREBASE_*  (from Firebase Console)
#   COOKIE_SECRET    (openssl rand -base64 64)
#   DATABASE_URL     (your production Postgres connection string)
#   REDIS_PASSWORD   (strong random password)
#   INDIANAPI_KEY    (Indian quote / metadata fallback)
nano .env.production
```

Run provider health checks locally without printing secrets:

```bash
npx tsx scripts/provider-healthcheck.ts \
  --symbols=RELIANCE,TCS,INFY \
  --providers=indianapi,yfinance \
  --require=indianapi \
  --strict
```

---

## 2. Google OAuth — Authorised Origins

In **Google Cloud Console → APIs & Services → Credentials**, edit the OAuth client  
`220040399044-p983i5ba82sltju4k9dn9141kksr1rhc.apps.googleusercontent.com` and add:

**Authorised JavaScript origins:**
```
https://stockstory-india.com
```

**Authorised redirect URIs:**
```
https://stockstory-india.com/__/auth/handler
```

---

## 3. Firebase Console

1. Go to **Authentication → Settings → Authorised domains**
2. Add `stockstory-india.com`
3. Verify Firestore rules allow production domain

---

## 4. Build & Deploy (Docker Compose)

```bash
# Build the frontend
npm run build

# Start all containers (API + Nginx + Postgres + Redis)
docker compose --env-file .env.production up -d --build

# Verify health
docker compose ps
curl https://stockstory-india.com/api/health
```

---

## 5. TLS / HTTPS (Let's Encrypt)

```bash
# On the production server
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d stockstory-india.com -d www.stockstory-india.com

# Auto-renewal
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet
```

Update `nginx.conf` with the paths certbot reports.

---

## 6. DNS Configuration

| Record | Type | Value |
|--------|------|-------|
| `stockstory-india.com` | A | `YOUR_SERVER_IP` |
| `www.stockstory-india.com` | CNAME | `stockstory-india.com` |

Propagation typically takes 24–48 hours.

---

## 7. Verification Checklist

- [ ] `https://stockstory-india.com` loads the landing page
- [ ] `https://stockstory-india.com/api/health` returns `{"status":"ok"}`
- [ ] Local or GitHub Actions provider health check passes for configured providers
- [ ] Google Sign-In completes without CORS or OAuth errors
- [ ] Landing → Dashboard navigation works
- [ ] Discovery page loads stock data
- [ ] Company search returns results
- [ ] Watchlist persists across page refreshes
- [ ] Portfolio persists across page refreshes
- [ ] PWA: "Add to Home Screen" prompt appears on mobile
- [ ] Lighthouse score ≥ 90 on Performance, SEO, Accessibility

---

## 8. Rollback

```bash
# Roll back to previous image
docker compose down
git checkout <previous-tag>
npm run build
docker compose up -d --build
```

---

## 9. Environment Variables Reference

| Variable | Required in Prod | Description |
|----------|-----------------|-------------|
| `VITE_APP_DOMAIN` | ✅ | `stockstory-india.com` |
| `VITE_API_DOMAIN` | ✅ | `stockstory-india.com` |
| `VITE_APP_ORIGIN` | ✅ | `https://stockstory-india.com` |
| `VITE_API_BASE_URL` | ✅ | `https://stockstory-india.com/api` |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | OAuth client ID |
| `VITE_FIREBASE_*` | ✅ | Firebase project config |
| `COOKIE_SECRET` | ✅ | 64-byte random string |
| `DATABASE_URL` | ✅ | Postgres connection string |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | `4001` |
| `INDIANAPI_KEY` | Optional | Indian quote, metadata, and sector fallback |
| `YFINANCE_ENABLED` | Optional | Explicit yfinance research and enrichment bridge |
| `REDIS_PASSWORD` | ✅ | Redis auth |
| `POSTGRES_PASSWORD` | ✅ | Postgres auth |
