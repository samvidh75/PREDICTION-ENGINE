# Intelligence Master Index

> StockStory AI Integration — Quick Start Guide

---

## Current State: 30% Intelligent

- Basic regex parsing for user queries
- Transformers.js on-device inference (limited)
- Groq API fallback (Mixtral 8x7B)
- No structured analysis pipeline
- No thesis generation
- No conversational AI
- No risk assessment

## Target State: 95% Intelligent

- Multi-factor analysis (quality, valuation, growth, technicals, risk)
- AI-generated investment thesis (bull/bear cases, catalysts)
- Risk assessment with scoring
- Stock comparison engine
- Conversational AI
- Investment recommendations with conviction
- Market commentary generation
- Thesis monitoring over time

## Quick Start Sequence

| Day | Phase | Duration | Result |
|-----|-------|----------|--------|
| 1 | Phase 1: Install Ollama + SGLang | 2-3 hours | Local AI brain running |
| 2-3 | Phase 2: Backend Intelligence Service | 4-6 hours | `/api/intelligence/*` endpoints |
| 3-4 | Phase 3: Frontend Components | 3-4 hours | AI Intelligence section in UI |
| 4 | Phase 4: Environment Setup | 1 hour | Config + startup scripts |
| 5 | Phase 5: Testing & Deploy | 2-3 hours | Live in production |

## Key Concepts

| Concept | What it is | Why it matters |
|---------|------------|----------------|
| **Ollama** | Local LLM runtime | Runs Mistral 7B on your machine, free |
| **SGLang** | Structured generation server | Enforces JSON output from LLM |
| **IntelligenceService** | Higher-level analysis orchestrator | Coordinates analysis, thesis, recommendations |
| **Multi-factor scoring** | 5-dimension stock analysis | Quality, Valuation, Growth, Technicals, Risk |

## Prerequisites Checklist

- [ ] Node.js 22+
- [ ] Python 3.9+
- [ ] 8GB+ RAM (4GB minimum)
- [ ] 10GB+ free disk space
- [ ] macOS / Linux (Windows via WSL)

## Read Next

Open `SGLANG_INTELLIGENCE_AUDIT.md` for architecture deep-dive.
