# StockStory India — Security & Hardening Reports

Master index of all security, reliability, and operational hardening reports.

## Part 12: Public Launch Hardening

| # | Report | Description |
|---|--------|-------------|
| 1 | [Main Report](12-public-launch-hardening.md) | Full hardening scope, baseline, and verification summary |
| 2 | [Route Surface Audit](12-route-surface-audit.md) | All ~32 API routes catalogued with auth enforcement status |
| 3 | [Secrets Audit](12-secrets-audit.md) | Secret leakage scan including `.env.prod` leak mitigation |
| 4 | [Security Headers](12-security-headers.md) | X-Content-Type-Options, X-Frame-Options, Permissions-Policy, etc. |
| 5 | [Auth Audit](12-auth-audit.md) | JWT decode gap and `extractUidWithSignature` fix |
| 6 | [API Access Control](12-api-access-control.md) | `requireAuth` preHandler, write-route gating |
| 7 | [Rate Limiting](12-rate-limiting.md) | UsageLimits wired as Fastify preHandler, 429 responses |
| 8 | [AI Cost Protection](12-ai-cost-protection.md) | Cost guardrails, deterministic fallback, spend tracking |
| 9 | [CORS & Headers](12-security-headers.md) | CORS origin whitelist, CSP deferral rationale |
| 10 | [Privacy & Data Audit](12-privacy-data-audit.md) | No PII stored, no income/identity docs collected |
| 11 | [Payment & Billing Safety](12-payment-billing-safety.md) | PAYMENTS_ENABLED=false, no checkout active |
| 12 | [Broker Handoff Safety](12-broker-handoff-safety.md) | SEBI-compliant, no credentials stored |
| 13 | [Admin/Diag Gating](12-admin-diag-gating.md) | No admin routes exposed, health endpoints safe |
| 14 | [Observability](12-observability.md) | Pino logging, auth diagnostics |
| 15 | [Backup & Restore Plan](12-backup-plan.md) | Database backup strategy and restore procedures |
| 16 | [DB Performance](12-db-performance.md) | Index recommendations, query analysis |
| 17 | [Cache Strategy](12-cache-strategy.md) | In-memory LRU fallback, Redis optional |
| 18 | [Frontend Performance](12-frontend-performance.md) | Bundle size, lazy loading, render optimization |
| 19 | [Accessibility](12-accessibility.md) | a11y review, contrast ratios, ARIA compliance |
| 20 | [Production Verification](12-production-verification.md) | Pre-launch live checks |
| 21 | [Launch Runbook](12-launch-runbook.md) | Deployment checklist and rollback steps |
| 22 | [Safety Grep](12-safety-grep.md) | No backend terminology in frontend UI |
