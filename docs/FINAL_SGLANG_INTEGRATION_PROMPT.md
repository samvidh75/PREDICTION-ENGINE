# Final SGLang + Ollama Integration — Implementation Guide

> Step-by-step implementation for StockStory AI Brain
> Timeline: 3-5 Days | Cost: ₹0

---

## Phase 1: Local LLM Deployment (1 Day)

### Step 1A: Install Ollama

```bash
# macOS
brew install ollama

# Start Ollama service
ollama serve &
```

### Step 1B: Download Mistral Model

```bash
ollama pull mistral:latest
# ~4.4 GB download, takes 10-30 minutes

# Verify
curl -s http://localhost:11434/api/tags | python3 -m json.tool
# Should show model "mistral:latest"

# Test generation
curl -s http://localhost:11434/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "What is a stock?",
    "max_tokens": 100,
    "stream": false
  }' | python3 -m json.tool
```

### Step 1C: Configure Environment

Add to `.env.local`:
```env
SGLANG_INTELLIGENCE_URL=http://localhost:11434
MODEL_NAME=mistral
```

The `IntelligenceService.ts` reads this env var and falls back to `http://localhost:11434`.

### Step 1D: Verify

```bash
# Health check endpoint
curl http://localhost:4001/api/intelligence/ai-health
# Expected: {"status":"healthy","sglang":"connected","response":"..."}
```

---

## Phase 2: Backend Intelligence Service (1.5 Days)

### Step 2A: Core Service

File: `src/services/IntelligenceService.ts`

Provides:
- `analyzeStock()` — Multi-factor analysis (quality, valuation, growth, technicals, risk)
- `generateThesis()` — Bull case, bear case, catalysts, key risks
- `generateRecommendation()` — BUY/HOLD/SELL with rating + conviction
- `compareStocks()` — Rank stocks by investment potential
- `chat()` — Conversational Q&A about a stock
- `checkThesisValidity()` — Monitor if thesis still holds
- `generateMarketCommentary()` — Market insights

All methods use structured JSON output from the LLM via `/v1/completions` with temperature 0.3 for deterministic results.

### Step 2B: API Routes

File: `src/backend/web/routes/intelligence-ai.ts`

Endpoints:

| Endpoint | Description |
|----------|-------------|
| `POST /api/intelligence/analyze` | Full analysis + thesis + recommendation |
| `POST /api/intelligence/compare` | Compare stocks (symbols) |
| `POST /api/intelligence/compare-stocks` | Compare with full data |
| `POST /api/intelligence/chat` | Conversational Q&A |
| `POST /api/intelligence/thesis-check` | Thesis validity check |
| `POST /api/intelligence/commentary` | Market commentary |
| `GET /api/intelligence/ai-health` | Health check |

### Step 2C: Register Routes

Already registered in `src/backend/web/routes/index.ts`.

### Step 2D: Test

```bash
# Full analysis
curl -X POST http://localhost:4001/api/intelligence/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TCS",
    "name": "Tata Consultancy Services",
    "price": 3890.50, "change": 15.20, "changePercent": 0.39,
    "pe": 30.5, "pb": 12.8, "roe": 42, "marketCap": "₹14.2L Cr",
    "sector": "Technology", "industry": "IT Services",
    "revenueGrowth": 8.5, "profitMargin": 22.3,
    "debtToEquity": 0.08, "currentRatio": 2.5,
    "rsi": 55, "macd": 2.3, "bollingerWidth": 4.5,
    "high52w": 4250, "low52w": 3500
  }'

# Chat
curl -X POST http://localhost:4001/api/intelligence/chat \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","question":"Why invest?"}'
```

---

## Phase 3: Frontend Components (1 Day)

### Step 3A: Component

File: `src/components/stock/IntelligentAnalysis.tsx`

Three-tab component:
- **Overview**: Score cards (Quality, Valuation, Growth, Technicals) + recommendation badge
- **Thesis**: Bull case, bear case, catalysts, investment horizon
- **Risks**: Key risks, risk score, risk/reward assessment

Quick/Detailed depth toggle controls prompt verbosity.

### Step 3B: Styles

File: `src/components/stock/IntelligentAnalysis.module.css`

Uses project CSS variables:
- Cards: `--surface` background, `--r-md` radius
- Status colors: `--green`, `--amber`, `--red-text`
- Spacing: `--sp-*` scale
- Typography: `--text-900`, `--text-500`

### Step 3C: Integration

Added `<IntelligentAnalysis symbol={stock.symbol} />` to `StockDetail.tsx` after the financial charts section.

---

## Phase 4: Environment & Deployment (0.5 Days)

### Step 4A: Environment

`.env.local` contains:
```env
SGLANG_INTELLIGENCE_URL=http://localhost:11434
OLLAMA_URL=http://localhost:11434
MODEL_NAME=mistral
LLM_FEATURES_ENABLED=true
```

### Step 4B: Startup Script

`scripts/start-intelligence.sh` — starts Ollama, pulls Mistral, launches SGLang.

### Step 4C: Production Systemd

`deployment/systemd/` contains:
- `stockstory-ollama.service` — Ollama server
- `stockstory-backend.service` — Fastify backend
- `stockstory-ollama-setup.sh` — One-shot setup

---

## Phase 5: Testing (0.5 Days)

### API Tests

```bash
# Health check (should be instant)
curl http://localhost:4001/api/intelligence/ai-health

# Analysis (10-30 seconds first call)
curl -X POST http://localhost:4001/api/intelligence/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "RELIANCE",
    "name": "Reliance Industries",
    "price": 2850.00, "change": 12.50, "changePercent": 0.44,
    "pe": 28.5, "pb": 3.2, "roe": 12, "marketCap": "₹19.3L Cr",
    "sector": "Energy", "industry": "Diversified",
    "revenueGrowth": 5.2, "profitMargin": 8.1,
    "debtToEquity": 0.45, "currentRatio": 1.1,
    "rsi": 52, "macd": 1.5, "bollingerWidth": 3.8,
    "high52w": 3020, "low52w": 2450
  }'

# Chat
curl -X POST http://localhost:4001/api/intelligence/chat \
  -H "Content-Type: application/json" \
  -d '{"symbol":"HDFCBANK","question":"What are the key risks?"}'
```

### Monitoring

```bash
./scripts/health-check.sh
# Expected: All systems operational
```

---

## Phase 6: Production Deployment (1 Day)

### VPS Setup

Follow `deployment/systemd/stockstory-ollama-setup.sh`:

```bash
# Copy to VPS and run
./deployment/systemd/stockstory-ollama-setup.sh
```

This installs Ollama, pulls Mistral, and sets up systemd services for auto-restart.

### Frontend (Vercel)

Push to `main` — Vercel auto-deploys. No additional config needed (vercel.json already exists).

---

## Phase 7: Monitoring (Ongoing)

### Health Check

`scripts/health-check.sh` checks:
- Ollama (port 11434)
- Backend (port 4001)
- Intelligence endpoint

### Systemd auto-restart

Both services have `Restart=always` with `RestartSec=5`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Ollama won't start | `pkill -f ollama; nohup ollama serve > /tmp/ollama.log &` |
| Model not found | `ollama pull mistral:latest` |
| API returns 503 | Check Ollama is running: `curl localhost:11434/api/tags` |
| Analysis slow | First call loads model into memory (~10-30s). Subsequent calls are cached |
| TypeScript errors | `npx tsc --noEmit` to check |
| Port conflict | Change `PORT=4001` in `.env.local` |

---

## Architecture Summary

```
User clicks "Analyze" on stock page
  → POST /api/intelligence/analyze
    → IntelligenceService.analyzeStock()
      → POST /v1/completions (Ollama)
        → Mistral 7B generates structured JSON
      → Parse JSON into StockAnalysis
    → IntelligenceService.generateThesis()
      → POST /v1/completions (Ollama)
    → IntelligenceService.generateRecommendation()
      → POST /v1/completions (Ollama)
  → Returns { analysis, thesis, recommendation }
  → IntelligentAnalysis component renders 3 tabs
```

All for ₹0/month in development, ₹500-1000/month in production.
