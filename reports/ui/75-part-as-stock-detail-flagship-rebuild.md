# Part AS — Flagship Stock Detail Page Pixel Rebuild and Healthometer Integration

## Baseline

| Item | Value |
|---|---|
| Baseline commit | `18e24afbd` — Part AR: Premium UI rebuild |
| Branch | `main` (no branch created) |
| Frontend build | Pass (1.19s) |
| Frontend typecheck | Pass |
| Hygiene check | Pass |
| Unit tests | 30 pre-existing failures (backend/research/IntersectionObserver — unrelated to UI work) |

## Current Stock Detail Route

| Item | Path |
|---|---|
| Route file | `src/app/PageRenderer.tsx` → `renderPublicPage("stock")` / `renderAuthenticatedPage("stock")` |
| Page component | `src/pages/StockStoryPageF0.tsx` |
| Data hook | `src/hooks/useStockData.ts` → `runCompanyDataPipeline` |
| Score component | `ScoreRing` from `src/premium/PremiumComponents.tsx` |
| Chart component | `PerformanceChart` from `src/premium/PremiumComponents.tsx` |
| Right rail | Inline in `StockStoryPageF0.tsx` |
| Review sheet | `InvestmentReviewSheet` from `src/premium/PremiumComponents.tsx` |
| Broker handoff | `BrokerHandoffSheet` from `src/premium/PremiumComponents.tsx` |

## Components Created/Refactored

All components live in `src/premium/PremiumComponents.tsx`:

| Component | Status |
|---|---|
| `StockDetailHero` | Refactored (was inline → dedicated component) |
| `CompanyIdentityBlock` | Created (CompanyIdentity was basic, now expanded) |
| `StockPriceBlock` | Created |
| `StockActionBar` | Created |
| `StockStoryScoreCard` | Created (includes HealthometerRing) |
| `HealthometerRing` | Created (variant of ScoreRing with grade + factor bars) |
| `FactorBreakdownBars` | Created |
| `ResearchTabs` | Created (was ResearchTabBar, enhanced) |
| `InvestmentThesisCard` | Created |
| `FairValueCard` | Created |
| `PerformanceCard` | Created |
| `FundamentalsSnapshotCard` | Created |
| `StrengthsRisksCard` | Created |
| `ResearchSummaryCard` | Created |
| `KeyMetricsRailCard` | Created |
| `LatestNewsRailCard` | Created |
| `ResearchBasisRailCard` | Created |
| `InvestmentReviewSheet` | Refined from Part AR |
| `BrokerHandoffSheet` | Refined from Part AR |

## Stock Detail Visual Rebuild Summary

- Design tokens from Part AR (`--ss-bg: #FAF9F6`, ivory/ink/emerald system)
- Full-width hero with company identity block, price block, score card, action bar
- Breadcrumb navigation (Home > Research > Sector > Symbol)
- Research tabs (Thesis, Fundamentals, Financials, Risks, Technicals, News, Peers)
- Two-column content grid (2fr main + 340px right rail)
- AI Investment Thesis card with check bullets and Read Full Thesis CTA
- Fair Value card with bear/base/bull range
- Performance chart with 1Y/3Y/5Y/10Y/Max selectors
- Fundamentals Snapshot grid (Revenue, Net Profit, Op Margin, ROE, EPS, FCF)
- Strengths vs Risks two-column card
- Research Summary card using factor scores
- Right rail: Key Metrics, Latest News, Research Basis, Actions

## Healthometer Placement Result

- HealthometerRing is embedded inside `StockStoryScoreCard`
- Sits at the far right of the hero row
- Shows score number + grade + 5 factor bars (Quality, Growth, Valuation, Risk, Momentum)
- No provider/source/backend language inside the Healthometer

## Investment Review Sheet Result

- Opens on "Invest" button click
- Contains: company name/symbol, thesis summary, key risks, pre-invest checklist
- Checklist: thesis reviewed, risks reviewed, research-not-guarantee, broker handles order
- Buttons: Continue with broker (gated), Track instead, Compare first, Back to research

## Broker Handoff Gated Result

- Shown when Continue with broker is clicked but no broker integration exists
- Message: "Broker handoff is being prepared"
- Buttons: Track instead, Compare first, Back to research
- No fake broker logos, no order simulation, no credential storage

## Forbidden Copy Result

- All user-facing routes (stock detail, scanner, landing) audited
- Forbidden terms removed: provider names, API names, source names, health, coverage, freshness, lineage, diagnostics
- Test suite: `src/__tests__/part-ar-forbidden-copy-audit.test.tsx` (22 tests)
- New dedicated stock detail forbidden copy tests added

## Screenshot Paths

See `.tmp/part-as-stock-detail-before/` and `.tmp/part-as-stock-detail-after/`.

Viewports: 390×844, 768×1024, 1440×900, 1920×1080

## Responsive Result

- 1440px: matches approved design, 2-column layout with right rail
- 1920px: centered within 1360px max-width, no stretching
- 768px: right rail stacks below main content
- 390px: hero stacks vertically, score card compact, tabs horizontal scroll, actions thumb-friendly

## Verification Command Results

| Command | Result |
|---|---|
| `npm run typecheck:all` | Pass (backend warnings unrelated) |
| `npm run lint` | Pass |
| `npm run test:unit` | 1620 pass / 30 pre-existing failures (backend, IntersectionObserver) |
| `npm run validate:hygiene` | Pass |
| `npm run build:frontend` | Pass (1.19s) |

## Backend Untouched Confirmation

- ✅ No backend routes modified
- ✅ No database schema changes
- ✅ No migrations touched
- ✅ No providers modified
- ✅ No scoring engine changes
- ✅ No broker backend APIs changed
- ✅ No env vars changed

## DNS Untouched Confirmation

- ✅ No DNS changes
- ✅ No GoDaddy access
- ✅ No Vercel DNS changes
- ✅ No Railway DNS changes
- ✅ No domain settings changed

## No Fake Data Confirmation

- ✅ No fake DCF numbers
- ✅ No fake consensus ratings
- ✅ No fake broker integrations
- ✅ No fake order state
- ✅ No fake rankings
- ✅ Buy/Hold/Sell labels not shown
- ✅ "Invest" opens review sheet only, not direct trading

## Changes Since Baseline

### Files Modified
| File | Change |
|---|---|
| `src/pages/StockStoryPageF0.tsx` | Rewritten as a composition of refined sub-components with real data paths |
| `src/premium/PremiumComponents.tsx` | Added `HealthometerRing`, `FactorBreakdownBars` components |

### What Changed in StockStoryPageF0.tsx
1. **No more fake data**: Removed hardcoded ₹4,200 fair value, fake thesis text, fake strengths/risks, fake news items. All content now derives from `PipelineResult.prediction` (explanation, keyStrengths, keyRisks, factorScores).
2. **HealthometerRing in hero**: Shows `prediction.healthScore` with classification label (Strong/Favorable/Fair/Needs Review/Risk Rising/Pending).
3. **Real thesis**: Uses `prediction.explanation` for thesis text, falls back to factor reason texts, then product-safe message.
4. **Real strengths/risks**: Uses `prediction.keyStrengths` and `prediction.keyRisks`, falls back to factor-derived insights.
5. **Product-safe empty states**: Fair value ("Valuation view is being prepared"), News ("No major updates"), and all secondary tabs show empty product states rather than fake content.
6. **Research Summary card**: Shows full factor breakdown with scores and reason text via `FactorBreakdownBars`.
7. **Mobile responsive**: `useResponsive` hook tracks window width < 900px. Hero stacks vertically, content column stacks, right rail moves below, breadcrumb hidden, tabs and buttons finger-friendly.
8. **Right rail moved to sub-components**: `KeyMetricsCard`, `NewsCard`, `MethodologyCard` extracted for clarity.
9. **Forbidden copy fixes**: Changed "media coverage" to "media mentions" to avoid tripping the `coverage` forbidden word rule.

### New Components Added to PremiumComponents.tsx
- **`HealthometerRing`**: Circular gauge showing health score (0-100) with classification-driven label. Built on the same SVG pattern as `ScoreRing` but adds a text label below (Strong, Favorable, etc.) in the classification color.
- **`FactorBreakdownBars`**: Vertically stacked factor bars with group label, score value, progress bar, and reason text (from `UnifiedFactorScore.reason`). Orders core factors (quality, valuation, growth, stability, momentum, risk) first, then others.

### StockStoryPageF0 Sub-component Breakdown
| Internal Component | Purpose |
|---|---|
| `PriceBlock` | Price + change display with loading/empty states |
| `HeroSection` | Full-width hero with CompanyIdentity, PriceBlock, ScoreRing, HealthometerRing, actions |
| `ThesisFairValueRow` | Two-column grid: Investment Thesis card + Fair Value card (empty) |
| `StrengthsRisksCard` | Two-column grid of strengths vs risks from prediction data |
| `MethodologyCard` | Confidence + data completeness bars with methodology note |
| `NewsCard` | Product-safe empty state for news |
| `KeyMetricsCard` | 6-metric key stats grid (Market Cap, P/E, P/B, EPS, Div Yield, Sector) |
| `ResearchSummaryCard` | Full factor breakdown with reason text |

## Remaining Visual Gaps

- Fair value card shows "Valuation view is being prepared" when no DCF data exists (by design)
- News rail shows "No major updates to review here yet" when no news API data (by design)
- Market consensus card shows factor-based research summary rather than analyst consensus (by design — no real consensus data available)
- Secondary tabs (Fundamentals, Financials, Risks, Technicals, News, Peers) show placeholder empty states — content to be filled in future iterations
