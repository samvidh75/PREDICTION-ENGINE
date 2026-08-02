# 🚀 Complete Deployment Guide: Render (Backend) + Cloudflare (Frontend)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Users                                                           │
└────────────┬────────────────────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ▼                ▼
┌─────────────┐  ┌──────────────────┐
│ Cloudflare  │  │  Render Backend  │
│  (Frontend) │◄─┤   (API + AI)     │
│   SPA       │  │                  │
│  Files      │  │  • QWEN 0.5B    │
│  + Cache    │  │  • GEMMA 2B     │
│             │  │  • AUTO-GUARDIAN│
└─────────────┘  └──────────────────┘
                        │
                  ┌─────┴─────┐
                  │           │
                  ▼           ▼
             Database    Redis Cache
            (Neon PG)   (Upstash)
```

## 1️⃣ RENDER BACKEND DEPLOYMENT

### What's Being Deployed
- ✅ QWEN 0.5B model (8.3 MB)
- ✅ GEMMA 2B model (3.5 MB)
- ✅ AUTO-GUARDIAN monitoring system
- ✅ API routes for AI models

### Configuration
- **Service:** stockstory-api
- **Runtime:** Node.js 22.12.0
- **Region:** Singapore
- **Plan:** Free tier
- **Auto-deploy:** ✅ ENABLED

### Required Environment Variables (Set in Render Dashboard)

```env
# Database
DATABASE_URL=postgresql://...  # Neon free tier

# Security
COOKIE_SECRET=<64-char-random>  # openssl rand -base64 64

# Market Data
INDIANAPI_KEY=<your-key>

# AI Models
MODELS_PATH=/app/models
AUTO_GUARDIAN_ENABLED=true

# Optional - CORS
EXTRA_ALLOWED_ORIGINS=https://stockstory-india.com,https://www.stockstory-india.com

# Optional - Redis
REDIS_URL=<upstash-url>  # Upstash free tier
```

### Deployment Steps

1. **Go to Render Dashboard**
   - https://dashboard.render.com

2. **Connect GitHub Repository**
   - Click "New +" → "Blueprint"
   - Select your PREDICTION-ENGINE repository
   - Branch: main

3. **Set Environment Variables**
   - All variables listed above

4. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes for build

### Test Render Backend

```bash
# Health check
curl https://stockstory-api.onrender.com/healthz

# AI health check
curl https://stockstory-api.onrender.com/api/ai/health

# Simple question
curl -X POST https://stockstory-api.onrender.com/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is TCS trading at?", "symbol": "TCS"}'

# Complex question
curl -X POST https://stockstory-api.onrender.com/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Analyze Reliance with geopolitical factors"}'
```

---

## 2️⃣ CLOUDFLARE FRONTEND DEPLOYMENT

### What's Being Deployed
- ✅ React SPA frontend
- ✅ Built with Vite
- ✅ AI chat integration ready
- ✅ Global CDN + caching

### Configuration
- **Service:** Cloudflare Pages
- **Build:** `npm run build:frontend`
- **Output:** `dist/`
- **Domain:** stockstory-india.com

### Deployment Steps

1. **Connect to Cloudflare**
   - Sign in: https://dash.cloudflare.com
   - Go to "Pages"
   - Click "Create a project"
   - Connect GitHub repository

2. **Configure Build Settings**
   - **Framework preset:** Vite
   - **Build command:** `npm run build:frontend`
   - **Build output directory:** `dist`
   - **Node version:** 22.12.0

3. **Set Environment Variables**
   ```env
   VITE_API_DOMAIN=stockstory-india.com
   VITE_APP_ORIGIN=https://stockstory-india.com
   VITE_APP_DOMAIN=stockstory-india.com
   ```

4. **Deploy**
   - Cloudflare auto-deploys on git push to main
   - Build time: ~2-3 minutes

### Custom Domain Setup

1. In Cloudflare Pages project settings:
   - Add custom domain: `stockstory-india.com`

2. In GoDaddy/Domain registrar:
   - Update nameservers to Cloudflare's:
     - `ns1.cloudflare.com`
     - `ns2.cloudflare.com`

3. Verify DNS in Cloudflare dashboard

### Test Cloudflare Frontend

```bash
# Check if live
curl -I https://stockstory-india.com

# Check API integration
# Open browser console and test:
fetch('https://stockstory-india.com/api/ai/health')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

## 3️⃣ CONNECTING BACKEND TO FRONTEND

### Update Frontend API Configuration

In your frontend `.env.production`:

```env
VITE_API_DOMAIN=stockstory-api.onrender.com
VITE_APP_ORIGIN=https://stockstory-india.com
```

Or hardcode in your fetch calls:

```typescript
const apiUrl = 'https://stockstory-api.onrender.com';

// Ask question
const response = await fetch(`${apiUrl}/api/ai/ask`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: userQuestion,
    symbol: selectedStock
  })
});

const data = await response.json();
console.log(data.response);
```

---

## 4️⃣ AUTO-RETRAINING SCHEDULE

✅ **Automatic (Zero manual intervention)**

- **Frequency:** Every 3 days
- **Next run:** 2026-07-09
- **What happens:**
  1. Fresh current affairs data generated
  2. Both models retrained
  3. Quality verified
  4. Auto-deployed if improved
  5. AUTO-GUARDIAN monitors

---

## 5️⃣ MONITORING & TROUBLESHOOTING

### Monitor Deployments

```bash
# Render logs
# Go to: https://dashboard.render.com → Services → stockstory-api → Logs

# Cloudflare logs
# Go to: https://dash.cloudflare.com → Pages → prediction-engine → Deployments

# GitHub Actions (if configured)
# https://github.com/samvidh75/PREDICTION-ENGINE/actions
```

### Health Checks

```bash
# Render backend health
curl https://stockstory-api.onrender.com/healthz

# AI models health
curl https://stockstory-api.onrender.com/api/ai/health

# Frontend accessible
curl -I https://stockstory-india.com
```

### Troubleshooting

#### Render Build Fails
- Check build logs in dashboard
- Verify NODE_OPTIONS is set correctly
- Check if models are included in git

#### Cloudflare Build Fails
- Check build logs in Pages dashboard
- Verify build command is correct
- Check Node.js version

#### Models Not Found
- Verify MODELS_PATH is set
- Check git includes adapter files
- Run: `git ls-files | grep adapter`

#### CORS Issues
- Add frontend domain to EXTRA_ALLOWED_ORIGINS
- Verify in Render env vars

---

## 6️⃣ QUICK START CHECKLIST

### Before Deployment
- [x] Models trained (QWEN + GEMMA)
- [x] AUTO-GUARDIAN active
- [x] API routes created
- [x] render.yaml updated (autoDeploy enabled)
- [x] wrangler.toml created

### Render Setup
- [ ] Create Render account (free tier available)
- [ ] Connect GitHub repository
- [ ] Set environment variables
- [ ] Deploy

### Cloudflare Setup
- [ ] Create Cloudflare account
- [ ] Connect GitHub repository to Pages
- [ ] Set environment variables
- [ ] Deploy

### Post-Deployment
- [ ] Test backend health endpoint
- [ ] Test frontend loads
- [ ] Test AI endpoints
- [ ] Verify AUTO-GUARDIAN logs

---

## 7️⃣ FINAL DEPLOYMENT COMMANDS

```bash
# Commit all changes
git add render.yaml wrangler.toml RENDER_CLOUDFLARE_DEPLOYMENT.md
git commit -m "feat: Configure Render and Cloudflare deployment

- Enable auto-deploy on Render
- Add AI models environment variables
- Create Cloudflare Pages configuration
- Both backend and frontend ready for deployment"

# Push to trigger auto-deployment
git push origin main

# Verify deployment
# 1. Check Render: https://dashboard.render.com
# 2. Check Cloudflare: https://dash.cloudflare.com
# 3. Test endpoints above
```

---

## 🎯 Success Metrics

✅ **Render Backend**
- [ ] Build completes in 2-5 minutes
- [ ] Service shows "Live"
- [ ] `/healthz` returns 200
- [ ] `/api/ai/health` shows both models ready

✅ **Cloudflare Frontend**
- [ ] Build completes in 2-3 minutes
- [ ] Domain is accessible
- [ ] Frontend loads without errors
- [ ] Can make requests to backend

✅ **AI Models**
- [ ] `/api/ai/ask` endpoint works
- [ ] QWEN responds to simple questions
- [ ] GEMMA responds to complex questions
- [ ] AUTO-GUARDIAN monitoring active

---

**Everything is ready to deploy! Push and watch it go live!** 🚀✨
