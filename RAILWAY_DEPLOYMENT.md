# 🚀 Railway Deployment Guide

## Overview

This project is configured for Railway.app deployment with full LLM support:
- **Frontend**: Vite SPA (static assets)
- **Backend**: Fastify API (Node.js)
- **LLM Service**: Ollama with fine-tuned models

---

## Setup on Railway.app

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"

### Step 2: Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select `PREDICTION-ENGINE` repository
3. Railway auto-detects it's a Docker project

### Step 3: Configure Services

Railway will detect:
- **Service 1**: Main service (Frontend + Backend) from `Dockerfile`
- **Service 2**: LLM service from `Dockerfile.llm`

### Step 4: Set Environment Variables

For the backend service:
```
NODE_ENV=production
PORT=4001
OLLAMA_URL=http://llm:11434
OLLAMA_MODEL=qwen2.5:0.5b
# Add other API keys as needed
```

### Step 5: Connect Services

1. In Railway dashboard, go to Service Settings
2. For backend service, add `OLLAMA_URL=${{ services.llm.RAILWAY_PRIVATE_URL }}`
3. This creates private network tunnel between services

### Step 6: Deploy

Railway auto-deploys on GitHub push. Check deployment status:
- Go to https://railway.app/dashboard
- Click on your project
- View real-time deployment logs

---

## Local Testing with Docker Compose

```bash
# Build and run all services locally
docker-compose -f docker-compose.railway.yml up -d

# Check service status
docker-compose -f docker-compose.railway.yml ps

# View logs
docker-compose -f docker-compose.railway.yml logs -f backend
docker-compose -f docker-compose.railway.yml logs -f llm

# Test API
curl http://localhost:4001/health

# Test LLM service
curl http://localhost:11434/api/tags

# Stop services
docker-compose -f docker-compose.railway.yml down
```

---

## Service Architecture

```
┌─────────────────────────────────────────┐
│      Railway.app Deployment             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Backend Service (Dockerfile)   │  │
│  │  ┌──────────────────────────┐    │  │
│  │  │ Frontend (Vite build)    │    │  │
│  │  │ API (Fastify) port:4001  │    │  │
│  │  └──────────────────────────┘    │  │
│  └────────────┬─────────────────────┘  │
│               │ connects via           │
│               │ OLLAMA_URL             │
│  ┌────────────▼─────────────────────┐  │
│  │   LLM Service (Dockerfile.llm)   │  │
│  │  ┌──────────────────────────┐    │  │
│  │  │ Ollama port:11434        │    │  │
│  │  │ Qwen 0.5B + Mistral 7B   │    │  │
│  │  │ Models cache (persistent)│    │  │
│  │  └──────────────────────────┘    │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Models Included

### Primary Model
- **Qwen2.5-0.5B** (LoRA fine-tuned)
  - Location: `/stockex_slm_agent_output/`
  - Auto-loaded on startup
  - Specializes in stock analysis

### Optional Models
- **Mistral-7B** (pulled at startup)
  - Heavier, more capable model
  - Can be swapped with OLLAMA_MODEL env var

---

## Auto-Deployment from GitHub

Every push to `main` branch triggers:
1. ✅ Build Docker images
2. ✅ Run tests
3. ✅ Deploy backend service
4. ✅ Deploy LLM service
5. ✅ Connect services
6. ✅ Verify health checks

---

## Accessing Your Deployment

### Frontend
- URL: `https://stockex-api-<random>.railway.app/`
- Serves Vite SPA

### Backend API
- URL: `https://stockex-api-<random>.railway.app/api/`
- Port: 4001
- Health check: `GET /health`

### LLM Service
- Port: 11434 (internal only)
- Only accessible from backend service
- Swagger/OpenAPI: Not exposed (internal)

---

## Troubleshooting

### LLM Service not starting
```bash
# Check logs
railway logs -s llm

# Common issues:
# - Models too large (auto-pulls on startup)
# - Not enough memory (check Railway plan)
# - Network issues between services
```

### Backend can't reach LLM
```bash
# Check environment variable
railway env | grep OLLAMA

# Should show:
# OLLAMA_URL=http://llm:11434

# Test connectivity from backend
curl $OLLAMA_URL/api/tags
```

### Models not loading
```bash
# Check Ollama logs
railway logs -s llm | grep -i "pulling\|loaded"

# Force model load
curl -X POST http://llm:11434/api/pull -d '{"name": "qwen2.5:0.5b"}'
```

---

## Performance Tips

1. **Memory**: Allocate 4GB+ to LLM service for 7B models
2. **CPU**: Use at least 4 CPU cores for inference
3. **Persistent Volume**: Models cache persists across restarts
4. **Concurrency**: Backend can handle multiple requests to LLM

---

## Cost Estimation

| Service | Tier | Est. Monthly |
|---------|------|-------------|
| Backend | Basic | $5-10 |
| LLM | Standard | $10-20 |
| **Total** | | **$15-30** |

Railway's $5/month credit helps offset these costs.

---

## Next Steps

1. **Push to GitHub**
   ```bash
   git add Dockerfile.llm railway.toml docker-compose.railway.yml RAILWAY_DEPLOYMENT.md
   git commit -m "feat: Add Railway LLM deployment configuration"
   git push origin main
   ```

2. **Deploy**
   - Go to Railway dashboard
   - Click "New Project"
   - Select your GitHub repo
   - Watch deployment logs

3. **Test**
   - Test backend API health
   - Test LLM model connectivity
   - Test end-to-end chat functionality

---

## Support

- Railway Docs: https://docs.railway.app
- Ollama Docs: https://ollama.ai
- Issues: Check Railway dashboard logs for errors

---

**Status**: Ready for deployment 🚀
**LLM Models**: Qwen 0.5B + Mistral 7B support
**Services**: Backend + LLM microservices
**Auto-Deploy**: GitHub push → Railway build & deploy
