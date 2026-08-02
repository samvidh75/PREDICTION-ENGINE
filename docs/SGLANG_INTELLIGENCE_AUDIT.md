# SGLang + Ollama Intelligence Architecture Audit

> Architecture, design decisions, and implementation overview

---

## 1. Current StockStory Audit

### What works
- Full-stack TypeScript app (React + Fastify)
- PostgreSQL + SQLite database layer
- Qdrant vector DB for embeddings
- Rule-based scoring engine (factors, features)
- On-device Transformers.js for basic NLP
- Groq API fallback for cloud LLM

### What's missing
- No structured LLM output pipeline
- No multi-factor stock analysis
- No investment thesis generation
- No conversational AI for stock Q&A
- No recommendation engine with conviction scoring
- No thesis validity monitoring

## 2. Architecture Design

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│   Frontend   │────▶│  Fastify API  │────▶│  Ollama   │
│  (React)     │     │  (Backend)    │     │ (Mistral) │
│              │◀────│               │◀────│           │
└─────────────┘     └──────────────┘     └───────────┘
                           │
                     ┌─────▼──────┐
                     │ PostgreSQL  │
                     │ (caching)   │
                     └────────────┘
```

### Component Diagram

```
IntelligenceService
├── analyzeStock()      → Multi-factor analysis
├── generateThesis()    → Bull/bear cases + catalysts
├── generateRecommendation() → BUY/HOLD/SELL + conviction
├── compareStocks()     → Ranking + winner
├── chat()              → Conversational Q&A
├── checkThesisValidity() → Thesis monitoring
└── generateMarketCommentary() → Market insights
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/intelligence/analyze` | POST | Full stock analysis |
| `/api/intelligence/compare` | POST | Compare stocks |
| `/api/intelligence/chat` | POST | Conversational AI |
| `/api/intelligence/thesis-check` | POST | Monitor thesis |
| `/api/intelligence/commentary` | POST | Market commentary |
| `/api/intelligence/ai-health` | GET | Health check |

## 3. Technology Decisions

### Why Ollama instead of SGLang?

SGLang required Python 3.11+ with broken numpy dependencies. Ollama:
- Ships as a standalone binary (no Python deps)
- Provides an OpenAI-compatible API at `/v1/completions`
- Supports Mistral, Llama, and 100+ models
- Zero configuration

### Why Mistral 7B?

- 4.4GB download (fits on most machines)
- Runs on CPU (Apple M-series, Intel, AMD)
- 32K context window
- Strong financial reasoning capabilities
- Apache 2.0 license

### Why the IntelligenceService layer?

- Decouples LLM interaction from business logic
- Provides structured JSON parsing with fallback
- Normalizes scores to 0-100 range
- Handles errors gracefully with defaults

## 4. Cost Analysis

| Component | Development | Production |
|-----------|-------------|------------|
| Ollama | Free | Free |
| Mistral 7B | Free (local) | Free (self-hosted) |
| Backend hosting | Local | ₹500-1000/month VPS |
| Database | Local | Included in VPS |
| Vector DB | Local | Included in VPS |
| Frontend | Local | Vercel (free tier) |
| **Total** | **₹0** | **₹500-1000/month** |

## 5. Files Created

| File | Purpose |
|------|---------|
| `src/services/IntelligenceService.ts` | Core AI service |
| `src/backend/web/routes/intelligence-ai.ts` | API endpoints |
| `src/components/stock/IntelligentAnalysis.tsx` | Frontend component |
| `src/components/stock/IntelligentAnalysis.module.css` | Styles |
| `scripts/start-intelligence.sh` | Startup script |
| `scripts/health-check.sh` | Monitoring script |
| `deployment/systemd/stockstory-ollama.service` | Systemd unit |
| `deployment/systemd/stockstory-backend.service` | Systemd unit |

## 6. Scoring Framework

| Dimension | Weight | Factors |
|-----------|--------|---------|
| Quality | 25% | ROE, debt/equity, profit margin, current ratio |
| Valuation | 25% | P/E, P/B, PEG ratio |
| Growth | 20% | Revenue growth, earnings growth |
| Technicals | 15% | RSI, MACD, Bollinger bands, 52W range |
| Risk | 15% | Sector risk, valuation risk, debt risk |

## 7. Next Steps

1. Deploy Ollama on VPS (see `deployment/systemd/`)
2. Configure frontend in Vercel dashboard
3. Set up cron jobs for daily analysis
4. Monitor with `scripts/health-check.sh`

## Read Next

Open `FINAL_SGLANG_INTEGRATION_PROMPT.md` for full implementation guide.
