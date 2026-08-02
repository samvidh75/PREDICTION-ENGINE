# Phase 17: AI-Native Intelligence Layer & Premium Modal System

## Baseline commit
`683adedc` — Normalize active pages to institutional design tokens

## Why previous UI was average
- Landing page was a generic hero with basic coverage stats and card grid
- Dashboard was a functional card layout without research command centre feel
- Rankings were a plain data table with no explanation workflow
- Signals/Predictions page had no prediction intelligence header or model context
- Company page had no "Open explanation" modal
- Trust Centre used inline styles and lacked Data Intelligence Centre framing
- No prediction insight cards, confidence bars, or factor driver previews
- No 3D rounded modal/sheet system for explanations, factor evidence, or source audit
- No research workflow rail or command search

## Intelligence layer added
New components in `src/components/intelligence/`:
- **IntelligencePanel** — container for prediction intelligence sections
- **PredictionInsightCard** — score, confidence, freshness, factor drivers, explanation CTA
- **PredictionConfidenceBar** — visual confidence indicator with level labels
- **ModelRunBadge** — model version + run timestamp display
- **FactorDriverCard** — individual factor score with progress bar
- **DataFreshnessLine** — per-domain freshness indicator
- **EvidenceStack** — evidence field list with availability status
- **SourceTracePill** — provider/domain health pill
- **UncertaintyNotice** — uncertainty/disclaimer messaging
- **DataGapNotice** — missing data explanation
- **MethodologyLink** — link to Trust Centre methodology
- **RoundedDepthPanel** — reusable 3D depth panel
- **PremiumCommandButton** — command palette search trigger
- **CompareCompaniesPanel** — side-by-side company comparison
- **ResearchWorkflowRail** — search/inspect/compare/track/audit workflow
- Barrel export via `index.ts`

## Prediction UX added
- Rankings page: "Explain" button per row opens IntelligenceModal with score, confidence, factor context
- Company page: "Open full explanation" button opens IntelligenceModal with factor scores, data coverage, methodology
- Watchlist page: "Explain" button per saved company opens explanation modal
- Prediction explanation uses real `ranking_score`, `confidence_score`, factor scores from API
- When data unavailable: "Model output available; explanation layer pending" shown
- Factor context labelled as "Factor context, not causal attribution"
- Research-only disclaimer throughout

## Modal/sheet system added
- **IntelligenceModal** — 3D rounded modal (28-32px radius), dark theme, backdrop blur, focus trap, escape/click-outside close, aria labels
- **FactorEvidenceSheet** — factor breakdown in IntelligenceModal wrapper
- **SourceAuditSheet** — provider/source audit in IntelligenceModal wrapper
- Desktop: centered modal, max-w-2xl
- Mobile: bottom sheet, rounded-t-[32px]
- Deep shadow (shadow-depth equivalent) for tactile depth

## Route changes
| Page | File | Changes |
|---|---|---|
| Landing | `src/pages/PublicLandingPage.tsx` | Complete rebuild: AI-native headline, model intelligence card, freshness strip, source audit pills, removed generic SaaS copy |
| Dashboard | `src/views/DashboardHub.tsx` | Complete rebuild: Research Home command centre, PremiumCommandButton, IntelligencePanel for predictions, ranked research section, research workflow rail, saved research panel |
| Rankings | `src/pages/PublicRankingsPage.tsx` | Added: "Explain" button per row, rank explanation panel, IntelligenceModal for explanation, factor context section |
| Signals | `src/pages/PublicPredictionsPage.tsx` | Added: IntelligencePanel header with model run status, premium empty state "No new signal movement", signal cards with dark theme |
| Company | `src/pages/StockStoryPage.tsx` | Added: "Open full explanation" button, IntelligenceModal with factor scores, data coverage, methodology link |
| Trust Centre | `src/pages/TrustCentrePage.tsx` | Complete rebuild: "Data Intelligence Centre" branding, RoundedDepthPanel sections, provider detail IntelligenceModal, removed all inline styles, converted to dark theme with PremiumPage wrapper |
| Watchlist | `src/pages/WatchlistPage.tsx` | Rebuild: "Saved research" branding, "Explain" button per ticker, IntelligenceModal for explanation, dark theme |
| Portfolio | `src/pages/PortfolioPage.tsx` | No structural changes (already functional) |

## Data correctness notes
- All visible values come from real API endpoints: `/api/predictions/leaderboard`, `/api/predictions/signals`, `/api/ops/data-coverage`, `/api/ops/health`, stockstory API
- Missing values shown as "Unavailable", "Pending", or "—" — never fabricated
- Factor context labelled as "Factor context, not causal attribution"
- Provider status from real health endpoint
- No fake predictions, scores, confidence, or signals

## Provider truth notes
- Yahoo: Blocked/unavailable, not load-bearing (correct)
- NSELib: Archived/unusable (correct)
- Jugaad Data: Configured off for most domains (correct)
- NSE Python: Configured off (correct)
- Indian API: Active for quotes when configured (correct)
- Fundamentals: Partial via DB snapshots + CSV/manual import (correct)
- No Dhan/Upstox/Finnhub active references preserved

## Tests
- Unit: 971/971 pass
- E2E: 36/36 pass
- Updated tests for new page text: WatchlistPage.test.tsx ("Saved research"), RealDataIntegration.test.tsx ("No new signal movement")
- Responsive audit: 88/88 pass (all routes, all viewports)

## Production verification
- `npm run typecheck:all` — pass
- `npm run lint` — pass
- `npm run test:unit` — 971/971 pass
- `npm run validate:hygiene` — pass (0 secrets)
- `npm run build:frontend` — pass
- `npm run build:backend` — pass
- `npm run test:e2e` — 36/36 pass
- `npm run audit:responsive-ui` — pass
- `npm run check:market-providers` — pass
- `npm run smoke:production` — pass

## Remaining blockers
- Fundamentals coverage is partial (awaiting completed real coverage)
- Prediction input lineage is not yet surfaced per-symbol in the explanation modals (requires DB integration)
- Factor-per-symbol trend/change explanation requires the ranking explanation engine to be connected
- CompareCompaniesPanel is built but not yet integrated into any page route

## Verification summary
- No fake data introduced
- No trading/pro fake UI present
- No secrets exposed
- All data is real API/DB/provider data or explicitly marked unavailable
- UI is visibly more premium and AI-native
- Prediction explanation exists where data supports it
- Modal/sheet system works on company and rankings pages
