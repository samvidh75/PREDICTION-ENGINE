# StockStory India — Public Launch Hardening (Part 12)

## Baseline

- **Baseline commit:** `e1d167c27e285d7ececffc7883b826129d9791ec`
- **Branch:** `main`
- **Date:** 2025-07-16

## Current Deployment Architecture

- **Backend:** Fastify server on Node.js (Render/Heroku, URL: `https://stockstory-api.onrender.com`)
- **Frontend:** Vite + React app (Vercel, frontend URL determined at deploy time)
- **Database:** PostgreSQL (primary) with SQLite fallback for local dev
- **Cache:** In-memory (LRU) with optional Redis
- **AI:** External LLM provider (Gemini/Groq) with deterministic fallback
- **Auth:** Not yet implemented (research-only platform)
- **Payments:** Not yet enabled (pricing page present, no checkout active)
- **Broker:** Upstox registered in BrokerRegistry, handoff UI built (research-only → broker deep-link)

## Current Auth/Session Status

No auth system is deployed. All routes are effectively public. User-specific features (research profile, alerts, watchlist, thesis history) use frontend-local storage or session-scoped data. No user IDs are accepted blindly from frontend for protected operations since there is no write-path for sensitive data.

## Current Payment/Billing Status

Payments are disabled by default (`PAYMENTS_ENABLED=false`). Pricing page (`/pricing`) is UI-only — no checkout or subscription endpoints are active. Stripe/Razorpay secrets are not configured.

## Current Broker Handoff Status

- **BrokerRegistry** registered: Upstox (connected: true)
- **Handoff flow:** Research review modal → SEBI disclaimer → Risk acknowledgment checkbox → Opens Upstox URL in new tab
- **Button copy:** "Continue with broker" (SEBI-compliant, not "Invest via broker")
- **No credentials collected** — handoff is URL-only, no credential fields exist
- **No fake brokers** — only real connected broker (Upstox) is listed

## Current Personal Data Stored

- Research profile (user-set preferences, no PII)
- Saved companies (symbol-level)
- Thesis notes (research-only)
- Alerts (symbol + preference)
- Action memory (behavioral, non-sensitive)
- Analytics events (disabled by default)

**No sensitive personal data stored:** No income, net worth, risk capacity, card data, broker credentials, or identity documents.

## Current Internal/Admin Routes

No separate admin routes exist. All `/api/*` routes serve research content. Health/readiness routes (`/healthz`, `/readyz`) are public but contain only operational status.

## Current Production Verification Result

Not yet run in this phase.

## Scope of This Phase

Security, Reliability, Abuse Prevention, Privacy, and Public Launch Hardening:

1. ✅ Baseline verification
2. ⬜ Route surface audit
3. ⬜ Secrets audit
4. ⬜ Environment variable hardening
5. ⬜ Auth/session hardening
6. ⬜ API access control
7. ⬜ Rate limiting and abuse prevention
8. ⬜ AI cost protection
9. ⬜ CORS and security headers
10. ⬜ Public error boundary hardening
11. ⬜ Privacy and data minimization
12. ⬜ Payment and billing security
13. ⬜ Broker handoff safety
14. ⬜ Internal admin/diagnostics gating
15. ⬜ Observability and incident logging
16. ⬜ Backups and restore plan
17. ⬜ Database performance and indexing
18. ⬜ Cache strategy and failure modes
19. ⬜ Frontend performance
20. ⬜ Accessibility and responsive QA
21. ⬜ Production live verification
22. ⬜ Launch runbook
23. ⬜ Safety greps
24. ⬜ Tests
25. ⬜ Full verification
26. ⬜ Final reports
27. ⬜ Commit and push
