# Part H: Production Release Candidate and Founder-Demo Hardening

## Baseline Commit
`df258b6bc` — Complete launch readiness and trust polish (Part G)

## Part G Completion Summary
- Landing rewritten with 5-step product flow
- Onboarding guide added/refined
- Route metadata / SEO descriptions improved
- Product analytics event constants added
- Accessibility/CTA audit fixes completed
- Responsive audit expanded with backend vocabulary checks
- Public routes audited for backend vocabulary

## Baseline Verification Results
| Check | Result |
|-------|--------|
| typecheck:all | PASS |
| lint | PASS |
| test:unit | PASS (99 files, 1040 tests) |
| validate:hygiene | PASS, 0 secrets |
| build:frontend | PASS |
| build:backend | PASS |
| audit:visual-layout | PASS |

## Frontend-Only Confirmation
No backend routes, schema, migrations, providers, broker APIs, alert delivery, or scoring changes.

## Master Blueprint Alignment
- Full product loop hardening: Discover → Research → Compare → Decide → Execute → Track
- All routes, CTAs, copy, states, and journeys polished for founder demo

## Scope
- End-to-end journey audit (5 journeys)
- Founder-demo route polish (13 routes)
- CTA/navigation final audit
- Copy finalization sweep
- Empty/loading/error-state audit
- Accessibility release-candidate audit
- Mobile and desktop release-candidate audit
- Visual consistency pass
- Production-like route smoke
- Test expansion
- Audit script hardening

## Non-Goals
- No new product features
- No backend modifications
- No fake data
- No fake broker integrations
- No analytics provider wiring

## Release-Candidate Acceptance Criteria
- [ ] All 5 journeys verified end-to-end
- [ ] 13 founder-demo routes polished and ready
- [ ] No dead CTAs anywhere
- [ ] Copy is premium, calm, investor-grade
- [ ] Empty/loading/error states are product-facing
- [ ] Accessibility: focus rings, keyboard, labels, Escape, contrast
- [ ] Mobile: no overflow, 44-48px targets, usable
- [ ] Desktop: dense content, 1280-1440px width
- [ ] Visual: consistent dark theme, restrained blue, no legacy glass
- [ ] Route smoke passes locally
- [ ] All tests pass (1040+)
- [ ] Builds pass
- [ ] No backend vocabulary in user-facing routes
- [ ] No fake data states

## No-Backend-Leakage Rule
All user-facing pages audited. Shared forbiddenCopyAudit.ts utility used by tests.

## No-Fake-Data Rule
No fake rankings, signals, predictions, company facts, broker integrations, alerts, portfolio holdings, P&L, or order status.

## Compliance-Safe Invest/Broker Rules
- Invest = review-first broker handoff
- No credentials stored
- No fake broker list
- "Broker handoff is being prepared" for non-configured accounts
