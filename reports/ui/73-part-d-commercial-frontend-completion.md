# Part D — Commercial-Grade Frontend Product Completion

## Baseline

- **Commit:** `d66c55ad` (Part C complete)
- **Part C completion:** Trust Centre → Methodology, Scanner UX, company decision page, invest handoff shell, thesis watchlist, thesis portfolio monitor, alerts scaffold, product command palette. Backend/provider vocabulary removed from normal user-facing frontend.
- **Frontend-only scope:** No backend routes, schema, migrations, providers, ingestion, scoring, engine math, Railway config, env vars, auth backend, payment backend, broker APIs, order APIs, alert delivery backend.
- **Frontend consumes existing APIs only.** Missing backend features get clean frontend shells, disabled states, or quiet absence — no fake active integration.

## Master Blueprint Alignment

StockStory is the AI research layer between Indian investors and brokers.
Core loop: Discover → Research → Compare → Decide → Execute through broker → Track thesis

Part D advances all product zones:
- Scanner (discovery depth)
- Company research (decision-grade depth)
- Invest/Broker handoff (commercial credibility)
- Alerts/What changed (proactive thesis monitoring)
- Watchlist (thesis tracking)
- Portfolio (thesis monitoring)
- Compare (decision-grade matrix)
- Dashboard (command centre)
- Mobile-first usability
- Desktop research-terminal density
- PWA/offline shell
- Performance
- Visual consistency

## Acceptance Criteria

1. Scanner feels like a flagship product (natural language prompt, preset chips, advanced filters, compact results, keyboard-friendly, mobile filter drawer, desktop filter rail)
2. Company page is flagship-grade (thesis, fundamentals, risk, peers, history tabs; decision rail; research basis; investment checklist)
3. Invest handoff is 3-stage credible flow (review → broker → confirmation; no fake brokers; clean gated state)
4. Alerts/What changed has credible product surface (categories, shell, local UI selection, empty state)
5. Watchlist is thesis tracker (needs review, improving, risk rising, unchanged sections)
6. Portfolio is honest manual thesis monitor (no fake P&L, no fake broker sync)
7. Compare is decision-grade (factor matrix, thesis comparison, peer suggestions)
8. Dashboard is command centre (search bar, action row, scanner shortcut, what changed, presets)
9. Mobile has no overflow, no hidden content, 44-48px touch targets, usable filter drawer
10. Desktop is dense/premium (1280-1440px content width, main + rail, full-width matrix)
11. PWA readiness (manifest, icons, offline fallback)
12. Performance (code splitting, lazy loading, no unnecessary re-renders)
13. Premium visual consistency (dark graphite, restrained blue, no card soup, correct sizing)
14. Copy/CTA audit (all CTAs working, product-aligned, no forbidden language)
15. Tests expanded (scanner, company, invest, alerts, watchlist, portfolio, compare, dashboard, PWA, leakage, vocabulary, overflow)
16. Audits updated (backend leakage, fake data, mobile nav, scanner mobile fallback, desktop width, error/debug strings)

## No-Backend-Leakage Rule

Normal users must not see:
- API/provider names, health, status, coverage diagnostics, source labels, lineage, migrations, backfills, production diagnostics, symbol gaps, maintenance jobs, manual CSV, raw errors, database wording, internal verification wording.

Allowed product language: Research, Thesis, Conviction, Risk, Compare, Track, Review, Invest, Methodology, Research Standards, What changed, Why it matters, Before you invest, Continue with broker, Track instead, Compare first.

## No-Fake-Data Rule

- No fake data, rankings, signals, predictions, company facts, broker integrations, broker logos as active, alerts, portfolio holdings, P&L, order status.
- No guaranteed returns, no "sure shot", no "multibagger", no public Buy/Hold/Sell recommendations.
- "Invest" only as review-first broker handoff, not direct order placement.
- Never store broker credentials. Never imply a broker connection unless real.

## Broker Handoff Constraints

- Only show active broker choices if real and configured.
- If no real brokers: polished gated state ("Broker handoff is being prepared").
- No fake broker login, no fake connected states, no fake order status.
- Confirmation stage: if external broker URL exists, user continues outside StockStory; otherwise return to research.

## Verification Results (Baseline)

| Check | Result |
|-------|--------|
| typecheck:all | PASS |
| lint | PASS |
| test:unit | 997/997 PASS |
| validate:hygiene | PASS |
| build:frontend | PASS (344.76 kB gzip: 79.75 kB) |
| build:backend | PASS |
| test:e2e | 36/36 PASS |
| audit:responsive-ui | TIMEOUT (pre-existing; dev server/Playwright spawn issue) |
| audit:visual-layout | PASS |
| smoke:production | PASS |
| verify:data:production | PASS (4 non-critical warnings) |

## Phase Completion Tracking

| Phase | Status |
|-------|--------|
| 1. Baseline | ✅ |
| 2. Report created | ✅ |
| 3. Scanner depth upgrade | ⬜ |
| 4. Company page depth upgrade | ⬜ |
| 5. Invest handoff refinement | ⬜ |
| 6. Alerts/What changed | ⬜ |
| 7. Watchlist refinement | ⬜ |
| 8. Portfolio refinement | ⬜ |
| 9. Compare refinement | ⬜ |
| 10. Dashboard command centre | ⬜ |
| 11. Mobile-first audit | ⬜ |
| 12. Desktop refinement | ⬜ |
| 13. PWA/offline | ⬜ |
| 14. Performance | ⬜ |
| 15. Visual consistency | ⬜ |
| 16. Copy/CTA audit | ⬜ |
| 17. Test expansion | ⬜ |
| 18. Audit updates | ⬜ |
| 19. Screenshots | ⬜ |
| 20. Full verification | ⬜ |
| 21. Report update | ⬜ |
| 22. Commit/push | ⬜ |
| 23. Final response | ⬜ |
