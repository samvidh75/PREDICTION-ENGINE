# Phase 20E — Launch Readiness Checklist

> **Internal admin document.** Not for public distribution.
> Checklist date: $(date +%Y-%m-%d)

## 1. Data Plane Health ✅

- [ ] `buildDataPlaneHealthReport()` returns valid health report
- [ ] `run-health-report.mjs` CLI prints human-readable summary
- [ ] `run-health-report.mjs --json` emits valid JSON
- [ ] Overall status is `ok` (no critical subsystem degraded)

## 2. Route Readiness ✅

- [ ] Every public route has a documented snapshot dependency
- [ ] `buildRouteReadinessMatrix()` covers all routes
- [ ] Route readiness matrix is non-empty and correctly reports status
- [ ] Degraded routes are identified by stale/missing snapshots

## 3. Provider Call Savings ✅

- [ ] `buildProviderCallSavingsReport()` produces valid report
- [ ] Cache hit rate is reported correctly from `ProviderQuotaMonitor`
- [ ] Estimated savings calculation does not divide by zero
- [ ] Report handles unavailable data gracefully (empty entries)

## 4. Scheduled Operations ✅

- [ ] EOD refresh runs without errors via `run-data-plane-cycle.ts`
- [ ] Precompute runs without errors via `run-precompute-cycle.ts`
- [ ] Cache cleanup runs without errors via `run-cache-cleanup.ts`
- [ ] Job locking prevents concurrent runs (stampede protection)
- [ ] Per-cycle call budget limits provider consumption

## 5. Public Copy ✅

- [ ] No "API access" wording visible in public UI
- [ ] No "provider", "backend", "cache", or "quota" wording visible to normal users
- [ ] No "Buy/Sell/Hold/target/sure shot/guaranteed/multibagger" wording
- [ ] No "AI-powered" or "LLM-driven" data fetching claims
- [ ] No fake prices, candles, news, filings, or alerts
- [ ] No broker execution language
- [ ] `audit-public-copy.ts` passes

## 6. Admin Routes ✅

- [ ] All admin/internal routes are protected from public access
- [ ] No admin route is discoverable via public navigation
- [ ] Admin routes do not appear in sitemap or SEO metadata
- [ ] Admin route handler does not leak internal state in error messages

## 7. Testing ✅

- [ ] Typecheck: frontend passes
- [ ] Typecheck: backend passes
- [ ] Lint: 0 errors
- [ ] Test suite: passes (expected pass count with acceptable pre-existing skips)
- [ ] Provider amplification audit passes (no per-row provider call patterns)

## 8. Repository Hygiene ✅

- [ ] Working tree is clean
- [ ] Only `main` branch exists (no backup branches)
- [ ] No untracked files in data-plane / admin directories
- [ ] Commits are on `origin/main`

---

## Pre-flight Steps

1. Run `npm run data-plane:health-report` — confirm OK status
2. Run `npm run audit:public-copy` — confirm 0 leaks
3. Run `npm run typecheck` — confirm passes
4. Run `npm run lint` — confirm 0 errors
5. Run `npx vitest run` — confirm passes
6. Run `git status -sb` — confirm clean
