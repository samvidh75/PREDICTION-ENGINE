# SGLang Server Runbook

## Architecture

```
User Request → LLMGateway (TypeScript) → SGLang Server (Python, :30000)
                 ↓
           DeterministicNarrativeService (fallback when SGLang down)
```

## Health Checks

```bash
# Basic health
curl http://localhost:30000/health

# Backend LLM health
curl https://api.stockstory-india.com/api/llm-health

# SGLang direct health
curl https://api.stockstory-india.com/api/llm/sglang/health
```

## Expected Response Times (CPU Mode)

| Query Type | Llama 3.1 8B | TinyLlama 1.1B |
|-----------|--------------|-----------------|
| Simple (50 tokens) | 3-5s | 0.5-1s |
| Structured JSON | 5-8s | 1-2s |
| Thesis (200 tokens) | 8-12s | 2-3s |
| Parallel 4x | 15-25s | 3-5s |
| Health check | <1s | <1s |

## Deployment

### CPU Mode (Free)

```bash
docker build -f Dockerfile.cpu -t stockstory/sglang:cpu .
docker push stockstory/sglang:cpu
# Deploy to Railway — free tier, 8GB RAM, 4 vCPU, NO GPU
```

### GPU Mode ($252/mo)

```bash
docker build -f Dockerfile -t stockstory/sglang:latest .
docker push stockstory/sglang:latest
# Deploy to Railway — T4 GPU, 8GB RAM
```

## Startup Sequence

1. Docker container starts
2. Python downloads model (~4GB for Llama 3.1 8B)
3. Model loads into memory (1-2 min on CPU)
4. Health endpoint returns 200
5. Backend connects and caches SGLANG_URL

First request after startup will be slow (model warmup). Subsequent requests are faster.

## Monitoring

### Key Metrics

- `latency_ms` — per-query latency from `llm_call_logs`
- `total_queries` — from `llm_metrics`
- `success_rate` — successful vs failed calls
- `cost_estimate` — always 0 for CPU mode

### Alerts

| Condition | Severity | Action |
|-----------|----------|--------|
| Health check fails 3x | Critical | Restart container |
| Latency > 30s | Warning | Check CPU/memory usage |
| Success rate < 90% | Warning | Restart or rollback |
| Memory > 7GB | Warning | Scale up or restart |

## Rollback

```bash
# Via Railway dashboard
railway deployment rollback

# Via script
./scripts/rollback-sglang.sh

# Via Docker
docker pull stockstory/sglang:cpu-previous
docker tag stockstory/sglang:cpu-previous stockstory/sglang:cpu
docker push stockstory/sglang:cpu
```

## Common Issues

### Server won't start
- Check `docker logs sglang-server`
- Common: Out of memory (need 8GB+)
- Fix: Increase Railway memory or switch to TinyLlama

### Slow responses
- CPU mode is inherently slower (5-10s vs 500ms GPU)
- Consider TinyLlama for faster CPU inference
- Check Railway CPU utilization

### Model download fails
- Model is ~4GB, needs stable connection
- Railway ephemeral storage: model re-downloads on restart
- Use persistent volume for model cache

### Backend returns degraded
- If SGLang is down, LLMGateway falls back to deterministic narratives
- No user-facing errors — just simpler responses
- Fix: Restart SGLang container

## Cost Tracking

| Mode | SGLang Cost | Railway Cost | Total |
|------|------------|-------------|-------|
| CPU (Free) | $0 | $0 (free tier) | $0/mo |
| GPU (T4) | $0 | $252/mo | $252/mo |
| Hybrid | $0 | $252/mo | $252/mo |

## Upgrade Path

1. CPU → GPU: Change Docker image in Railway, add GPU
2. TinyLlama → Llama 3.1: Change model path in Dockerfile.cpu
3. Single → Multi-replica: Update railway.json numReplicas
