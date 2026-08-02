# Part 17 — Production Analyst Verification

## Local verification (pre-deploy)

| Check | Result |
|-------|--------|
| `npm run typecheck:active` | PASS |
| `npm run build:frontend` | PASS |
| `npm run build:backend` | PASS |
| `npm run analyst:validate` | PASS (2/2 samples) |
| Analyst unit tests (57) | PASS |
| Analyst dry-run scripts | PASS |
| `npm run validate:hygiene` | PASS (0 secrets) |

## Production API checks

Production verification script updated with analyst route checks:

- `GET /api/analyst/company/:symbol/deep-dive`
- `GET /api/analyst/company/:symbol/earnings-note`
- `GET /api/analyst/company/:symbol/filing-briefs`
- `GET /api/analyst/sector/:sector/brief`
- `POST /api/analyst/qa` (research question)
- `POST /api/analyst/qa` (advice redirect)

Run after deploy:

```bash
npm run intelligence:verify -- --url https://stockstory-api.onrender.com
```

## Safety checks in verifier

- No forbidden language in responses
- No provider/backend/GPU wording
- No undefined/null/NaN in response text
- Advice questions safely redirected

## Note

Analyst routes are registered in `apiRouter.ts` via `registerAnalystRoutes`. Production endpoints become active after next deploy to Render.
