# Compliance-Safe Output Policy

## Core Policy

StockStory output is **research-only intelligence**, not investment advice.

## Compliance Rules

1. **No personalized advice** — Never tell a user what to do with their money.
2. **No guarantees** — Never claim guaranteed returns, risk-free profits, or sure outcomes.
3. **No Buy/Sell/Hold** — Do not use direct recommendation language unless a compliance-supported framework exists.
4. **No target prices** — Do not publish target prices unless sourced from a compliant third party.
5. **No suitability claims** — Do not claim any stock is "suitable for" any type of investor.

## Allowed Language

StockStory's allowed stance labels:

| Label | Meaning |
|-------|---------|
| High conviction | Strong research signals across multiple factors |
| Watch | Interesting but needs monitoring |
| Risk rising | Deteriorating risk metrics |
| Thesis improving | Improving fundamentals or sentiment |
| Needs review | Mixed signals requiring closer look |
| Avoid for now | Caution warranted based on available data |
| Insufficient information | Not enough data for a meaningful assessment |

## Forbidden Language

### Investment Advice
- Buy now, Strong Buy
- Sell immediately, Must sell
- Guaranteed return, Profit assured
- Risk-free, Cannot lose
- Multibagger, Sure shot
- Target guaranteed

### Backend/Plumbing (in user-facing output)
- Provider, API, Backend
- Ingestion, Refresh job, Cache miss/hit
- Database, Redis, Postgres
- Qdrant, Ollama, SGLang
- GPU, CUDA, Model server
- Source pending/verified, Coverage/freshness unavailable
- Diagnostics

## Invest CTA Policy

Any "Invest" call-to-action must flow through a broker handoff or review workflow — never a direct purchase link without user review.

## Enforcement

- All output passes through `ComplianceTextGuard` before reaching frontend
- `ForbiddenLanguageValidator` scans for banned terms
- Violations are logged but not shown to users
- Non-compliant output is sanitized or blocked
