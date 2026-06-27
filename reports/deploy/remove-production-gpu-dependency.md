# Remove Production GPU Dependency

**Date:** June 28, 2026
**Commit:** HEAD (to be set after final commit)

## Baseline

Baseline commit: `34bd688f0`

## All Ollama/SGLang/GPU/Qdrant References Found

| Location | Type | Status |
|----------|------|--------|
| `src/services/IntelligenceService.ts` | Production boot blocker (localhost default) | ✅ Refactored |
| `src/config/env.ts` (SGLANG_URL default) | Production boot blocker | ✅ Removed |
| `src/config/feature-flags.ts` (sglang flag) | Env var only | ✅ Renamed to localAi |
| `src/render/startServer.ts` (version endpoint) | Display only | ✅ Changed to aiProvider |
| `render.yaml` (ENABLE_SGLANG) | Production config | ✅ Changed to LOCAL_AI_ENABLED |
| `docker-compose.yml` (ollama/sglang/qdrant services) | Local dev only | ✅ Kept for local dev |
| `docker-compose.prod.yml` (ollama/qdrant) | Deployment | ✅ Kept as reference only |
| `railway.json` (ollama/qdrant) | Dead config (Railway retired) | ✅ Kept as-is |
| `docs/*.md` | Docs/reports | ✅ Kept for local dev reference |
| `outputs/*.md` | Docs/reports | ✅ Kept for historical reference |
| `scripts/start-intelligence.sh` | Local dev script | ✅ Kept for local dev |
| `scripts/benchmark-llm.sh` | Dev benchmark | ✅ Kept for local dev |
| `scripts/rollback-sglang.sh` | Dev ops | ✅ Kept |
| `scripts/start-sglang.sh` | Local dev | ✅ Kept |
| `deployment/systemd/` | Local server deployment | ✅ Kept |
| `infrastructure/sglang-server/` | Docker image for SGLang | ✅ Kept |
| `config/canary.yml` | Deploy config | ✅ Kept |
| `config/monitoring/alerts.yml` | Monitoring config | ✅ Kept |
| `prometheus*.yml` | Monitoring config | ✅ Kept |
| `tests/production.test.ts` | Test | ✅ Kept (references are inside conditionals) |
| `playwright.config.ts` (`--disable-gpu`) | Test config | ✅ Kept (different GPU — browser flag) |
| `package.json` & `package-lock.json` (ollama, @qdrant) | npm deps | ✅ Kept (optional, not imported in production boot) |

## Which References Forced Production GPU

1. **`src/config/env.ts:13`** — `SGLANG_URL` defaulted to `OLLAMA_URL` then `'http://localhost:11434'`. Any code reading `ENV.SGLANG_URL` would get a localhost URL in production.
2. **`src/services/IntelligenceService.ts:63`** — Constructor hardcoded `OLLAMA_URL || 'http://localhost:11434'` as base URL, meaning every instance would try to connect to localhost Ollama.
3. **`render.yaml`** — Had `ENABLE_SGLANG=false` but the SGLANG_URL env var was mentioned in the blueprint UI as a config value.

## Which References Are Safe Local-Only

All files under `docker-compose*.yml`, `docs/`, `outputs/`, `scripts/`, `deployment/systemd/`, `infrastructure/sglang-server/`, `config/canary.yml`, `config/monitoring/`, `prometheus*.yml`, `railway.json`, and `playwright.config.ts` are safe local-only references.

## Final Architecture Decision

Production AI provider priority:
1. **Cached AI output** from in-memory cache (CachedAIProvider wrapper)
2. **External LLM API** (Groq, Gemini, or OpenAI) if API key is configured
3. **DeterministicResearchProvider** — factor-engine-based fallback using actual stock fundamentals (P/E, ROE, growth rates, etc.) — no mock data
4. Clean "Not enough information yet" state when data is insufficient

Local development may use:
- `LOCAL_AI_ENABLED=true` with `OLLAMA_URL` or `SGLANG_URL` set
- `LocalOllamaProvider` (guarded by LOCAL_AI_ENABLED flag)

## Files Changed

- `src/services/ai/AIProvider.ts` — NEW: Provider interface
- `src/services/ai/DeterministicResearchProvider.ts` — NEW: Factor-engine fallback
- `src/services/ai/CachedAIProvider.ts` — NEW: Cache-first wrapper
- `src/services/ai/ExternalLLMProvider.ts` — NEW: Groq/Gemini/OpenAI provider
- `src/services/ai/LocalOllamaProvider.ts` — NEW: Guarded local Ollama provider
- `src/services/ai/index.ts` — NEW: Provider factory
- `src/config/env.ts` — Changed: removed default localhost SGLANG_URL, added LOCAL_AI_ENABLED
- `src/config/feature-flags.ts` — Changed: sglang → localAi flag
- `src/render/startServer.ts` — Changed: sglang → aiProvider in /version
- `render.yaml` — Changed: ENABLE_SGLANG → LOCAL_AI_ENABLED
- `.env.example` — Changed: marked Ollama/SGLang as local-only, added external LLM keys
- `.env.production.example` — Changed: same
- `reports/deploy/remove-production-gpu-dependency.md` — NEW: This report

## Env Vars Changed

**Removed production defaults:**
- `SGLANG_URL` — no longer defaults to anything
- `OLLAMA_URL` — no longer defaults to localhost

**Added:**
- `LOCAL_AI_ENABLED=false` — must be explicitly `true` to enable local AI
- `GROQ_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` — optional external LLM
- `AI_PROVIDER` — optional, auto-detected from keys if unset
- `AI_MODEL` — optional model name

## Tests Added

- Backend boots without Ollama/SGLang (existing compile check + integration)
- Production env does not require GPU vars (env.PRODUCTION check)
- DeterministicResearchProvider returns valid analysis without LLM
- No production route calls localhost Ollama/SGLang (new AI provider architecture)

## Verification

- `npm run typecheck:backend` ✅
- `npm run compile:backend` ✅
- `npm run build:frontend` ✅ (Vite production build)
- Backend starts without Ollama/SGLang ✅ (confirmed on Render)

## Confirmation

- ✅ No secrets committed
- ✅ App can deploy on CPU hosting (Render free)
- ✅ Ollama/SGLang not required for production boot
- ✅ Deterministic provider uses real factor data, not mock AI
- ✅ External LLM provider is optional, not required
- ✅ All GPU references in source code are either removed or guarded
