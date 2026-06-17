# Perfect App Aesthetic and Interface Polish

## Baseline commit
`b50e5d19a5a79731d828ffb39cec0dfb3a91fe45`

## Active route map (PageRenderer + router.ts)

| Route (page param) | Component | Layout | Status |
|---|---|---|---|
| landing (default) | PublicLandingPage | None | ✅ Active |
| about | PublicAboutPage | None | ✅ Active |
| login | LoginPage | None | ✅ Active |
| signup | SignupPage | None | ✅ Active |
| trust / methodology / validation | TrustCentrePage | None or AppLayout | ✅ Active |
| predictions | PublicPredictionsPage | None or AppLayout | ✅ Active |
| rankings | PublicRankingsPage | None or AppLayout | ✅ Active |
| dashboard / market (default authed) | DashboardHub | AppLayout | ✅ Active |
| search | SearchPage | AppLayout | ✅ Active |
| company / stock (+id) | StockStoryPageF0 → StockStoryPage | AppLayout | ✅ Active |
| portfolio | PortfolioPage | AppLayout | ✅ Active |
| watchlist | WatchlistPage | AppLayout | ✅ Active |
| settings | SettingsPage | AppLayout | ✅ Active |

## Inactive legacy files found and removed (staged for commit)
- `src/pages/Landing.tsx` — dead route, replaced by `PublicLandingPage.tsx`
- `src/pages/WorkspacePage.tsx` — not referenced in PageRenderer or router
- `src/components/Navigation.tsx` — dead, replaced by `AppLayout` sidebar

All three deletions confirmed safe — no imports, no test references, no route entries.

## Copy and UX refinements

### DashboardHub (`src/views/DashboardHub.tsx`)
- Metric cards relabelled:
  - "Indexed companies / Registry symbols" → **"Companies covered / Indexed on exchange"**
  - "Prediction registry / Scored companies" → **"Scored companies / Prediction records"**
  - "Financial snapshots / Fundamental data" → **"Fundamental data / Financial records"**
  - "Price coverage / Daily price rows" → **"Price data / Daily market records"**
- Dashboard subtitle shortened for clarity
- "Pending registry sync" → **"Registry pending"**
- "No predictions yet" → **"No scored records yet"** (and similar for other empty states)
- Signals section subtitle: "Appears when verified score changes are available." → **"Verified score changes from the latest prediction cycle."**
- Empty state: "Score changes not ready yet" → **"Score changes pending"**
- "Signals freshness / Latest score changes" → **"Prediction cycle / Latest update"**
- "Saved workspace / Your watchlist tickers" → **"Watchlist / Saved tickers"**
- "Recently explored / Last opened companies" → **"Recently explored / Previously opened"**

### PublicPredictionsPage (`src/pages/PublicPredictionsPage.tsx`)
- "Prediction signals" → **"Score changes"**
- Subtitle refined
- Loading: "Checking prediction registry for verified signals." → **"Checking for recent score changes…"**
- Empty state: "Verified prediction signals are being prepared" → **"Score changes pending"**
- Coverage section: "Data Coverage Context" → **"Data coverage"**, labels cleaned up
- "Signal generation requires active deltas..." → **"Score changes require verified data updates…"**

### PublicRankingsPage (`src/pages/PublicRankingsPage.tsx`)
- Subtitle: backend jargon → **"Verified company rankings from the latest scoring cycle."**
- Empty state: "Verified rankings are being prepared" → **"Rankings pending"**
- Coverage section: same cleanup as PredictionsPage

### TrustCentrePage (`src/pages/TrustCentrePage.tsx`)
- Subtitle shortened
- State labels: "evidence sources are not yet connected" → **"data sources not yet connected"**
- "Scoring Database" → **"Scoring database"** (sentence case)
- "Connected (Live)" → **"Connected"**
- "Ready (Syncing)" → **"Syncing"**
- "Evidence Completeness" → **"Evidence completeness"**
- "As of Date" → **"As of date"**
- "Indexed symbols" → **"Companies covered"**
- "Financial snapshots" → **"Financial records"**
- "Prediction rows" → **"Scored records"**
- Data system description shortened

### StockStoryPage (`src/pages/StockStoryPage.tsx`)
- "Awaiting Ingestion Inputs" → **"Data sources pending"**
- "Why scores are unavailable" → **"Why scoring is unavailable"** (copy refined)
- Disclaimer: "StockStory provides research intelligence..." → **"Research signals are for informational purposes only."**
- Composite score footnote simplified

## Test updates
- `RealDataIntegration.test.tsx`: Updated DashboardHub metric label assertions and PredictionsPage empty state assertion to match new copy
- `f2-navigation.spec.ts`: Updated stale Playwright assertion text

## Verification results
- **Typecheck frontend**: ✅ Passed
- **Typecheck backend**: ✅ Passed
- **Lint**: ✅ Passed (quiet)
- **Unit tests**: ✅ **830/830 passed** (77 test files)
- **Hygiene validation**: ✅ Passed (0 secrets, 0 hazards)
- **Frontend build**: ✅ Passed (1877 modules, 1.18s)
- **Backend build**: ✅ Passed

## Design language compliance
- ✅ No neon/cyber/brutalist/dark/glass tokens remain
- ✅ Single font family: Inter
- ✅ Warm-neutral palette (#f8f7f4 base, #1a4a3a accent)
- ✅ Premium, calm, finance-grade copy across all routes
- ✅ No fabricated data added
- ✅ No backend/scoring/provider/data-plane changes
- ✅ No secrets touched
- ✅ No branches or PRs created

## Remaining UI blockers
- None identified. All active routes are visually coherent within the unified design system.
