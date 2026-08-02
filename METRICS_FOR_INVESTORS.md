# StockStory India — Investor Metrics

*Last updated: June 2026*

## Operations

| Metric | Value |
|--------|-------|
| Symbol Universe | 142 NSE stocks |
| Daily Predictions | 372 (124 × 3 horizons) |
| Outcomes Validated | 97,080 |
| Pipeline Frequency | Daily (05:00–06:45 IST) |
| Temporal Violations | 0 |
| Historical Hit Rate (30d) | 64.2% |
| Historical Hit Rate (90d) | 61.8% |
| Historical Hit Rate (365d) | 58.3% |
| TypeScript Errors | 0 |
| Build Status | Green |

## Product

| Metric | Value |
|--------|-------|
| Public Pages | 7 (predictions, rankings, leaderboard, validation-dashboard, trust, methodology, validation) |
| Auth-Required Pages | 16 |
| Onboarding Steps | 4 |
| Alert Types | 4 (prediction change, confidence change, health change, target reached) |
| Sharing Channels | URL + social preview cards |
| Email Digest Frequency | Daily |

## Traction (Targets)

| Metric | Current | Target |
|--------|---------|--------|
| Users | 0 | 50 |
| Activation Rate | — | >40% |
| Watchlist Adoption | — | >50% |
| Alert Adoption | — | >30% |
| Day-1 Retention | — | >35% |
| Day-7 Retention | — | >15% |
| Paid Users | 0 | 1+ |

## Revenue Model

| Tier | Price | Includes |
|------|-------|----------|
| Free | ₹0 | Public predictions, rankings, leaderboard, trust centre |
| Investor | ₹99/mo | Full factor breakdowns, watchlist alerts, daily digest |
| Pro | ₹299/mo | Unlimited analysis, portfolio doctor, priority support |
| Professional | ₹999/mo | API access, custom reports, dedicated analyst |

## Architecture

- **Frontend**: React 18 + Vite 5 + TypeScript (Vercel)
- **Backend**: Fastify + TypeScript + PostgreSQL/SQLite fallback (Render, Singapore)
- **Pipeline**: GitHub Actions daily workflow (7 scripts)
- **Prediction Engine**: 6-factor model (quality, growth, value, momentum, risk, sector)
- **Trust Guard**: TemporalGuard prevents look-ahead bias; PredictionRegistry is append-only
- **Alerting**: Slack/Discord/Email + local log fallback
