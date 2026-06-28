# Part 17 — Safety Grep Results

Generated: 2026-06-28

## GPU / Ollama / Qdrant

| Match | Classification |
|-------|----------------|
| `.env.example`, `.env.production.example` | **local-only optional** — documents optional local AI |
| `DEPLOYMENT.md`, `FREE_SERVICES_CHECKLIST.md` | **doc/report** — explicitly states not required in production |
| `config/canary.yml`, `config/monitoring/alerts.yml` | **allowed internal** — monitoring for optional local stack |
| `deployment/systemd/stockstory-ollama-setup.sh` | **local-only optional** — not used in production path |
| `__tests__/validation/IntelligenceValidation.test.ts` | **test assertion** — validates forbidden term detection |
| Analyst desk code | **No matches** — no GPU/Ollama production requirement |

## localhost

| Match in `src/frontend`, `src/components`, `src/pages` | **None** |

## Forbidden investment language

| Match | Classification |
|-------|----------------|
| `src/pages/PricingPage.tsx` — comment "No Buy now" | **safe analyst-policy reference** — compliance comment |
| Analyst module / workspace | **None in user-facing copy** |

## Frontend plumbing terms

| Match | Classification |
|-------|----------------|
| `src/pages/Trust.tsx` — "market data providers" | **allowed** — investor-facing trust copy, not backend diagnostics |

## Analyst module

- No `Buy now`, `Strong Buy`, `multibagger`, `guaranteed return` in analyst generators
- `ForbiddenLanguageValidator` blocks forbidden terms in output validation
- Public serializer strips internal fields

## Fake content markers

- No `fake filing`, `fake earnings`, `fake analyst` in production analyst code
- Validator explicitly blocks fake content markers in output

## Confirmation

- No secrets in analyst payloads (tested via `containsSecrets`)
- No backend/provider wording in analyst public serializer output
- No undefined/null/NaN in public text fields (validator checks string fields only)
