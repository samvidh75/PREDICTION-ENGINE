# PROMPT 2: SGLang + Ollama Integration — AI Intelligence Layer

> Implementation Guide | 3-5 Days | Copy-Paste Code

---

## Overview

Transform StockStory from 30% intelligent (rule-based scoring) to 95% intelligent (AI-powered analysis).

| Feature | Before | After |
|---------|--------|-------|
| Stock Analysis | Basic factor scores (50/100) | Multi-dimensional AI analysis with thesis |
| Scoring | Fixed health formula | Context-aware LLM scoring |
| Scanner | 40 individual API calls, same score | 1 batch call, differentiated scores |
| Conversational AI | None | Chat about any stock |
| Investment Thesis | None | Bull/bear case with risk assessment |

---

## Prerequisites

- [ ] PROMPT 1 complete (market hours + batching + stock universe)
- [ ] Docker Compose running (ollama service healthy)
- [ ] Mistral model pulled: `docker exec stockstory_ollama ollama pull mistral`
- [ ] SGLang container running: `docker-compose up -d sglang`
- [ ] Backend API running on port 4001

---

## Day 1: Ollama + SGLang Setup

### Step 1: Verify Ollama

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags
# Expected: {"models":[{"name":"mistral:latest",...}]}
```

### Step 2: Pull Mistral Model

```bash
docker exec stockstory_ollama ollama pull mistral
# ~4.4 GB, 10-30 minutes
```

### Step 3: Start SGLang Container

```bash
docker-compose up -d sglang
# Wait 2-3 minutes for model to load

# Verify
curl http://localhost:8000/v1/models
# Expected: {"data":[{"id":"mistral"}]}
```

### Step 4: Configure Environment

```bash
# Add to .env.local:
SGLANG_INTELLIGENCE_URL=http://localhost:11434
SGLANG_URL=http://localhost:8000
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
MARKET_TIMEZONE=Asia/Kolkata
MARKET_OPEN=09:30
MARKET_CLOSE=15:30
```

### Step 5: Test the Pipeline

```bash
# 1. Test Ollama directly
curl http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "What is TCS?",
    "stream": false
  }' | python3 -m json.tool

# 2. Test SGLang
curl http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "Rate TCS stock: ",
    "max_tokens": 100,
    "temperature": 0.3
  }' | python3 -m json.tool

# 3. Test backend intelligence endpoint
curl -X POST http://localhost:4001/api/intelligence/ai-health
```

---

## Day 2-3: Backend Services

### Step 1: SGLangService

**File already exists at:** `src/services/AI/SGLangService.ts`

**Status:** ✅ ALREADY IMPLEMENTED

Features verified:
- ✅ Ollama-backed LLM inference
- ✅ Structured JSON generation
- ✅ Parallel stock analysis (quality, valuation, growth, risk)
- ✅ Sentiment-based scoring
- ✅ Market hours awareness
- ✅ Bull/bear case generation
- ✅ Risk factor generation
- ✅ Batch queue integration

### Step 2: SmartScannerService

**File already exists at:** `src/services/SmartScannerService.ts`

**Status:** ✅ ALREADY IMPLEMENTED

Features verified:
- ✅ 4 scan strategies: quality, value, growth, momentum
- ✅ Nifty 50 analysis
- ✅ Sector scanning
- ✅ AI-powered scoring
- ✅ Market hours aware

### Step 3: Wire IntelligentAnalysis into StockPage

**File:** `src/pages/StockPage.tsx`

Add the IntelligentAnalysis component after the Healthometer:

```tsx
// Add to imports at top of file
import { lazy, Suspense } from 'react';
import { Skeleton } from '../components/ui/Skeleton';

// Lazy load the intelligent analysis component
const IntelligentAnalysis = lazy(
  () => import('../components/stock/IntelligentAnalysis')
);

// Add this after Healthometer (around line ~120 in StockPage.tsx):
{/* AI Intelligence Analysis */}
<div style={{ margin: "16px 0" }}>
  <Suspense fallback={
    <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
      Loading AI analysis...
    </div>
  }>
    <IntelligentAnalysis
      symbol={symbol}
      price={data?.price.current}
      pe={data?.fundamentals.peRatio}
      roe={data?.fundamentals.roe}
      revenueGrowth={data?.fundamentals.revenueGrowth}
      marketStatus={marketStatus?.isOpen ? 'live' : 'snapshot'}
    />
  </Suspense>
</div>
```

### Step 4: ResearchBot Integration

**File already exists at:** `src/components/stock/ResearchBot.tsx`

The ResearchBot is already integrated in StockPage.tsx at the bottom:
```tsx
<ResearchBot symbol={symbol} isPro={false} />
```

No changes needed - it's already wired.

---

## Day 3-4: API Routes

### Step 1: Intelligence Routes

**File already exists at:** `src/backend/web/routes/intelligence-ai.ts`

**Status:** ✅ ALREADY IMPLEMENTED

Endpoints:
| Endpoint | Description |
|----------|-------------|
| `POST /api/intelligence/analyze` | Full analysis + thesis + recommendation |
| `POST /api/intelligence/compare` | Compare stocks |
| `POST /api/intelligence/chat` | Conversational Q&A |
| `POST /api/intelligence/thesis-check` | Thesis validity check |
| `GET /api/intelligence/ai-health` | Health check |

### Step 2: Verify Route Registration

Check that intelligence routes are registered in the backend index:

**File:** `src/backend/web/routes/index.ts`

Should include:
```typescript
// If not present, add:
import intelligenceAIRoutes from './intelligence-ai';

// Register:
app.register(intelligenceAIRoutes);
```

---

## Day 4-5: Testing

### API Tests

```bash
# 1. Analyze a stock
curl -X POST http://localhost:4001/api/intelligence/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "TCS",
    "name": "Tata Consultancy Services",
    "price": 3890.50,
    "pe": 30.5,
    "roe": 42,
    "marketCap": "₹14.2L Cr",
    "sector": "Technology",
    "revenueGrowth": 8.5,
    "debtToEquity": 0.08
  }'

# Expected response: { analysis, thesis, recommendation }

# 2. Chat about a stock
curl -X POST http://localhost:4001/api/intelligence/chat \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS","question":"What are the key risks?"}'

# 3. Compare stocks
curl -X POST http://localhost:4001/api/intelligence/compare \
  -H "Content-Type: application/json" \
  -d '{"symbols":["TCS","INFY","HCLTECH"]}'

# 4. Health check
curl http://localhost:4001/api/intelligence/ai-health
```

### Frontend Tests

1. Open Stock Detail page for TCS
2. Scroll to "🧠 AI Intelligence" section
3. Verify:
   - Analysis loads within 10-30 seconds
   - Score cards display (Quality, Valuation, Growth, Risk)
   - Recommendation badge (BUY/HOLD/SELL)
   - Thesis tab shows bull/bear case
   - Risks tab shows risk factors
4. Test ResearchBot chat
5. Test on mobile layout

### Performance Tests

```bash
# Measure analysis time
time curl -X POST http://localhost:4001/api/intelligence/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol":"TCS"}' > /dev/null

# Expected: < 30 seconds first call, < 10 seconds cached
# Ollama keeps model in memory after first call
```

---

## Success Criteria

- [ ] `curl http://localhost:8000/v1/models` returns model list
- [ ] `POST /api/intelligence/analyze` returns structured analysis
- [ ] Stock detail page shows IntelligentAnalysis component
- [ ] Scanner shows differentiated scores (not all 50)
- [ ] ResearchBot responds to questions
- [ ] Analysis loads in < 30 seconds
- [ ] No errors in console

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Ollama not responding | Service not started | `docker-compose restart ollama` |
| SGLang not responding | Container still loading | Wait 2-3 min, check logs |
| Analysis returns "Snapshot..." | Market closed | Check market hours config |
| Scores all 50 | LLM returning generic response | Check prompt template in SGLangService |
| Intelligence component not showing | Not wired in StockPage | Add lazy import + Suspense |
| Chat not working | Route not registered | Check backend routes index |

---

## Architecture Flow

```
User visits stock detail page
  → StockPage.tsx renders IntelligentAnalysis
    → Suspense shows skeleton while loading
    → On mount: POST /api/intelligence/analyze
      → SGLangService.analyzeStockParallel()
        → 4 parallel Ollama calls (quality, valuation, growth, risk)
        → Each returns structured JSON analysis
      → SGLangService.generateThesis()
        → Ollama generates bull/bear case
      → SGLangService.generateRecommendation()
        → Ollama generates recommendation
    → Returns { analysis, thesis, recommendation }
  → IntelligentAnalysis renders:
    Tab 1: Overview (score cards + recommendation badge)
    Tab 2: Thesis (bull case, bear case, catalysts)
    Tab 3: Risks (key risks, risk score)
```

---

## Cost

| Resource | Cost |
|----------|------|
| Ollama (local) | ₹0 |
| Mistral 7B model | ₹0 |
| SGLang (CPU, Docker) | ₹0 |
| Inference (local) | ₹0 |
| **Total** | **₹0** |

Replaces: OpenAI ($20+/month) + Groq API costs
