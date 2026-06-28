# Phase 22 — Launch Runbook

## Pre-Launch Checklist

### 1. Environment Configuration
- [ ] `.env.prod` NOT in git tracking — add `.env.prod` to `.gitignore` if not already
- [ ] Verify all secrets in production environment (Neon dashboard or platform env vars)
- [ ] Set `NODE_ENV=production` in production environment
- [ ] Set `PAYMENTS_ENABLED=false` or configure Stripe keys if enabled
- [ ] Set `REDIS_URL` if using Upstash/serverless Redis

### 2. Security Verification
- [ ] Run `npx tsc --noEmit` — fix any TypeScript errors before deploy
- [ ] Run `npm test` — all 1447 tests should pass
- [ ] Run `npm run lint` — no lint errors
- [ ] Security headers verified via curl (see Phase 21 report)
- [ ] Error handler verified — no stack traces in responses

### 3. Database
- [ ] Run all migrations: `npm run migrate`
- [ ] Verify indexes are created
- [ ] Test query performance on representative queries

### 4. Build & Deploy
```bash
# Build
npm run build:all

# Verify build output
ls -la dist/

# Start (for Docker/Node deploy)
npm start

# Health check
curl http://localhost:4001/healthz
curl http://localhost:4001/readyz
```

### 5. Smoke Test Checklist
- [ ] Homepage loads (no errors)
- [ ] Stock search returns results
- [ ] Stock detail page renders
- [ ] Watchlist add/remove works
- [ ] News section loads
- [ ] Comparison tool works
- [ ] Predictions/thesis loads
- [ ] Auth login/logout works (already functional: Supabase)

## Rollback Procedure

### Quick Rollback
```bash
# Revert to previous deployment
git checkout <last-known-good-commit>
npm run build:all
# Restart server
```

### Database Rollback
Neon provides point-in-time recovery. Steps:
1. Go to Neon dashboard → Branches → Create branch from timestamp
2. Update DATABASE_URL to new branch
3. Restart server

## Monitoring
- Application logs: Pino (JSON-structured, logged to stdout)
- LLM call logging: `llm_call_logs` table in PostgreSQL
- Use platform logging (Render/Railway/Neon dashboard)
