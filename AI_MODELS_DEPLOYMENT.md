# 🚀 AI Models Deployment Guide

## What's Being Deployed

✅ **QWEN 0.5B** (8.3 MB) - Conversational model for retail investors
✅ **GEMMA 2B** (3.5 MB) - Professional analysis with geopolitical factors
✅ **AUTO-GUARDIAN** - 24/7 autonomous monitoring & auto-retraining

## API Endpoints

### 1. Auto-Routing (Intelligent)
```
POST /api/ai/ask
Body: { "question": "...", "symbol": "RELIANCE" }
Returns: Uses QWEN for simple questions, GEMMA for complex ones
```

### 2. Simple Q&A (Always QWEN)
```
POST /api/ai/simple-qa
Body: { "question": "What is a P/E ratio?" }
```

### 3. Detailed Analysis (Always GEMMA)
```
POST /api/ai/analyze
Body: { "question": "Analyze Reliance with geopolitical factors" }
```

### 4. Health Check
```
GET /api/ai/health
Returns: Model status and readiness
```

## Environment Variables

Set in Render dashboard:
```
MODELS_PATH=/app/models
AUTO_GUARDIAN_ENABLED=true
```

## Deployment Status

✅ Step 1: Models trained and saved
✅ Step 2: Code committed to git (commit a7e740f5)
✅ Step 3: Pushed to main branch
⏳ Step 4: Render auto-deployment in progress (~2-5 minutes)
⏳ Step 5: Test endpoints with curl
⏳ Step 6: Monitor AUTO-GUARDIAN for auto-improvements

## Testing Commands

```bash
# Check health
curl https://your-render-url/api/ai/health

# Test simple question (uses QWEN)
curl -X POST https://your-render-url/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is TCS trading at?", "symbol": "TCS"}'

# Test complex question (uses GEMMA)
curl -X POST https://your-render-url/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Analyze IT sector with macro factors and geopolitical risks"}'
```

## Auto-Retraining

✅ **Scheduled every 3 days** (next: 2026-07-09)
✅ **AUTO-GUARDIAN monitors** for quality issues
✅ **Auto-augments data** if convergence drops
✅ **Zero human intervention** required

## Monitoring

```bash
# Check auto-guardian status
tail -f /tmp/auto_guardian.log

# Check if models are accessible
curl https://your-render-url/api/ai/health | jq
```

## Render Dashboard

Monitor deployment: https://dashboard.render.com
GitHub Actions: https://github.com/samvidh75/PREDICTION-ENGINE/actions

Build should complete in 2-5 minutes. Models are 11.8 MB total (small + fast).

---

**Everything is automated. AUTO-GUARDIAN will handle improvements continuously!** ✨
