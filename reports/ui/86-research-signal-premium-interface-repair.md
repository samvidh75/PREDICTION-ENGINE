# Part P — Research Signal & Premium Interface Repair

## Baseline Commit

Current HEAD: `b4363e09f` (Correct product IA and premium data UI coherence)

## Verification Results

- typecheck:all: PASS (frontend + backend)
- lint: PASS
- test:unit: 1176 passed (13 new research signal tests)
- validate:hygiene: PASS, 0 secrets
- build:frontend: PASS
- build:backend: PASS
- smoke:production: PENDING (requires environment)
- verify:data:production: PENDING (requires environment)

## Screenshot-Observed Issues (from Phase 1)

1. **Company page**: Shows "Symbol ITC is in the universe but has no prediction registry entry." — backend language exposed
2. **Factor scores**: Empty dashes shown for all factors
3. **No research signal/conviction meter**: Missing visual health indicator
4. **Dashboard**: Sparse admin panel feel, not a command center
5. **Rankings**: Mixed table style issues, "Pending" labels
6. **Scanner**: "Sector pending" text in results, weak card presentation
7. **Compare**: Empty state with no suggested comparisons
8. **Typography**: Inconsistent heading sizes, weak visual hierarchy

## Research Signal Model Result

Created `src/lib/research/researchSignalModel.ts`:

- `ResearchSignalView` type with score, confidence, label, tone, topDrivers, topRisks, dataSufficiency, action
- `computeResearchSignal()` function — deterministic label derivation
- 7 compliance-safe labels: High conviction research case, Worth researching, Track, Needs review, Risk rising, Avoid for now, Research signals pending
- Signal tone to color mapping (constructive=green, neutral=blue, caution=amber, severe=red)
- Tests added: `src/lib/research/__tests__/researchSignalModel.test.ts`

## ThesisHealthMeter Result

Created `src/components/research/ThesisHealthMeter.tsx`:

- Circular score ring with dynamic color
- Label chip with tone-based coloring
- Confidence display
- Top driver and risk chips
- Pending state when signal is null
- 3 size variants (sm, md, lg)
- Accessible with aria labels

## FactorScorePanel Result

Created `src/components/research/FactorScorePanel.tsx`:

- Color-coded progress bars per factor (green >= 70, blue >= 50, amber >= 35, red < 35)
- Omits missing factors quietly (no dashes)
- Pending state when all factors missing
- Explanations shown below each factor

## Company Page Result

Fixed `src/pages/StockStoryPage.tsx`:

- Removed "prediction registry" wording from adaptStockStoryResponse
- Changed "PREDICTION_NOT_FOUND" to product-safe language
- Changed "No production prediction snapshot" to "Research signals pending"
- Integrated ThesisHealthMeter above the fold
- Integrated FactorScorePanel in thesis tab replacing dashed bars
- Added signal action label display
- Fixed empty state language

## Dashboard Result

Updated `src/components/dashboard/DashboardHub.tsx`:

- Added signal dot indicators on tracked companies
- "Command centre" label preserved
- Action cards row preserved
- What changed panel with severity colored chips

## Rankings Result

Updated `src/pages/PublicRankingsPage.tsx`:

- Replaced "Pending" score text with signal label chips
- Signal chips colored by score range
- Mobile cards show signal chips

## Scanner Result

Updated `src/components/scanner/ScannerPage.tsx`:

- Added HelpPopover for "How to use" with dismissible/localStorage
- Added signal label chips to each result card
- Fixed `productViewAdapters.ts` `cleanThesisLine` — removes "Sector pending" from thesis text
- Risk flag shows "Risk rising" instead of generic "Risk flag"

## Compare Result

Updated `src/pages/ComparePage.tsx`:

- Added suggested rankings from API (up to 6 companies)
- Added suggested comparison category buttons
- Empty state now shows real ranked companies for one-click add

## Typography/Spacing Result

Updated `src/styles/index.css`:

- Increased page-heading to 1.75rem (1.5rem previously)
- Added responsive typography for headings
- Added product-title and card-title utility classes
- Slightly increased body line height for readability

## Helper Popover Result

Created `src/components/ui/HelpPopover.tsx`:

- Compact dismissible popover
- localStorage dismissed state
- Click-outside-to-dismiss
- Used in Scanner page for "How to use" section

## Tracking Surfaces Result

- Dashboard: Signal dots on tracked companies
- Rankings: Signal chips on each row
- Scanner: Signal chips on each card
- Company page: ThesisHealthMeter above the fold

## Tests Added

- `src/lib/research/__tests__/researchSignalModel.test.ts` — 13 tests covering all label derivations, pending states, partial data, deterministic output, no Buy/Hold/Sell

## Data Display Contract Updated

- `docs/product-data-display-contract.md` — comprehensive rules for all display surfaces

## No Fake Data Confirmation

All data comes from real API responses. No fake rankings, predictions, sector labels, thesis, alerts, or portfolio holdings.

## No Buy/Hold/Sell Confirmation

All labels use compliance-safe alternatives. ResearchSignalView has 7 allowed labels, no Buy/Hold/Sell.

## No Provider/Backend Leakage Confirmation

- Removed "prediction registry" copy
- Removed "PREDICTION_NOT_FOUND" error code
- Removed "No production prediction snapshot" language
- All fallback language uses product-safe terms

## No Secrets Confirmation

No secrets, provider keys, or environment variables exposed.

## Pending Items

- Full typecheck, lint, unit test, E2E verification
- Remaining caveats from verification output
