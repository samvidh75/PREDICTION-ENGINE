# Part F: Frontend Intelligence Depth and Conversion Readiness

## Baseline Commit
`e9e35926` — Add tests, audit utilities, and remaining product intelligence polish

## Baseline Verification Results
| Check | Result |
|-------|--------|
| typecheck:all | PASS |
| lint | PASS |
| test:unit | PASS (99 files, 1025 tests) |
| validate:hygiene | PASS |
| build:frontend | PASS |
| build:backend | PASS |
| audit:visual-layout | PASS |
| smoke:production | PASS |
| verify:data:production | PASS (4 warnings, non-critical) |

## Frontend-Only Confirmation
- No backend routes, schema, migrations, provider, broker, or scoring changes
- All modifications in `src/pages/`, `src/components/`, `src/lib/`, `tests/`, `reports/ui/`

## Master Blueprint Alignment
- Discover: Scanner intelligence depth
- Research: Company page decision depth
- Compare: Compare workflow depth
- Decide: Dashboard conversion, Invest handoff
- Execute: Broker handoff (gated)
- Track: Watchlist thesis workflow, Portfolio thesis monitor, Alerts/What Changed

## Scope
- Deepen scanner, company page, compare, watchlist, portfolio, alerts, invest flow
- Dashboard conversion upgrade
- Empty state system standardization
- Onboarding/first-run quality
- Mobile/Desktop polish
- Command palette depth
- Compliance/audit test expansion
- Visual/responsive audit updates

## Non-Goals
- No backend modifications
- No fake data
- No fake broker integrations
- No fake alert delivery
- No new API endpoints
- No provider/broker credentials

## Acceptance Criteria
- [ ] Scanner feels like flagship entry point with presets, filters, results
- [ ] Company page has Thesis/Fundamentals/Risk/Peers/History tabs
- [ ] Compare answers "which company deserves more research"
- [ ] Watchlist is a daily thesis workflow
- [ ] Portfolio is a thesis monitor (no fake P&L)
- [ ] Alerts/What Changed is credible product surface
- [ ] Invest handoff has clear stages and no fake broker list
- [ ] Dashboard is product command centre
- [ ] Empty states answer "what this is, why empty, what to do"
- [ ] Mobile/Desktop layouts are correct
- [ ] Command palette has product commands only
- [ ] Compliance tests use shared audit utility
- [ ] No backend vocabulary in user-facing routes
- [ ] No fake data states
- [ ] All tests pass
- [ ] Builds pass

## No-Backend-Leakage Rule
All user-facing pages audited for backend vocabulary. Shared `forbiddenCopyAudit.ts` utility used.

## No-Fake-Data Rule
No fake rankings, signals, predictions, company facts, broker integrations, alerts, portfolio holdings, P&L, or order status.

## Compliance-Safe Invest/Broker Rules
- Invest = review-first broker handoff
- No credentials stored
- No fake broker list
- "Broker handoff is being prepared" for non-configured accounts
