# Part G: Launch Readiness, Trust, Onboarding, Accessibility, and Production Polish

## Baseline Commit
`2a12e8995` — Update Part F completion report

## Part F Completion Summary
- Scanner: 10 presets, scrollable row, client-side sorting, grouped filters, micro-guide, compact cards
- Compare: decision helper, 7 comparison sections
- Watchlist: daily thesis workflow with smart categorization
- Portfolio: manual thesis monitor with thesis status labels
- Alerts: 5 categories with honest "No email/push yet" disclaimer
- Invest handoff: strengthened broker disclaimer, no credentials stored
- Dashboard: command centre with action buttons
- Command palette: 13 commands with shortcuts

## Baseline Verification Results
| Check | Result |
|-------|--------|
| typecheck:all | PASS |
| lint | PASS |
| test:unit | PASS (98/99 files, 1025/1026 tests; 1 expected release-gate env failure) |
| validate:hygiene | PASS, 0 secrets |
| build:frontend | PASS |
| build:backend | PASS |
| audit:visual-layout | PASS |
| smoke:production | PASS |

## Frontend-Only Confirmation
No backend routes, schema, migrations, providers, broker APIs, alert delivery, or scoring changes.

## Master Blueprint Alignment
- Discover: Public landing conversion, Onboarding
- Research: Methodology trust, Company page polish
- Compare: Route integrity
- Decide: Dashboard, CTA audit
- Track: Watchlist/Portfolio polish
- All: Loading/error/empty states, SEO, accessibility, analytics

## Scope
- Public landing conversion polish
- Onboarding activation flow
- Methodology trust polish
- Loading/error/empty-state standardization
- SEO metadata
- Frontend analytics event map
- Accessibility audit
- Mobile/Desktop polish
- Route/CTA integrity audit
- Product QA tests

## Non-Goals
- No backend modifications
- No fake data
- No fake broker integrations
- No analytics provider setup
- No new API endpoints

## Acceptance Criteria
- [ ] Landing converts visitors in 10 seconds
- [ ] Onboarding guides first-time users through core loop
- [ ] Methodology builds trust without backend plumbing
- [ ] Loading/error/empty states use product language
- [ ] SEO metadata for all public routes
- [ ] Analytics event map exists (no external wiring)
- [ ] Accessibility: focus rings, keyboard, labels, contrast
- [ ] Mobile: no overflow, 44-48px targets, usable sheets
- [ ] Desktop: dense content, 1280-1440px width
- [ ] All CTAs work or are clearly disabled
- [ ] Product QA tests pass with shared audit utility
- [ ] No backend vocabulary in user-facing routes
- [ ] No fake data states

## No-Backend-Leakage Rule
All user-facing pages audited. Shared forbiddenCopyAudit.ts utility used.

## No-Fake-Data Rule
No fake rankings, signals, predictions, company facts, broker integrations, alerts, portfolio holdings, P&L, or order status.

## Compliance-Safe Invest/Broker Rules
- Invest = review-first broker handoff
- No credentials stored
- No fake broker list
- "Broker handoff is being prepared" for non-configured accounts
