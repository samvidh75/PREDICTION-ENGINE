# Part CS — StockEdge Session Wrapper, Premium Scanner, Stock Detail Rebuild

## Baseline commit
`a6c63447` — "Add premium scanner, stock detail rebuild, scan catalogue, pricing page"

## StockEdge wrapper result
- Cookie-based session auth (no access token, no bearer token, no API token)
- HTTP form login strategy (`StockEdgeAuth.attemptHttpFormLogin`)
- Playwright browser login strategy as fallback (`StockEdgePlaywrightAuth`)
- Auto-detects MFA/OTP/CAPTCHA and returns `STOCKEDGE_MFA_REQUIRED`
- Fails closed on missing config

## Login/session result
- `StockEdgeSessionStore` — in-memory, TTL-based expiry, cookie header storage
- `StockEdgeAuth.login()` — two strategies: http_form first, playwright fallback (env-gated)
- Never exposes credentials or cookies in errors/config summary

## Discovery result
- `StockEdgeEndpointDiscovery.discover()` — probes 14 candidate URL templates against live API
- `StockEdgeEndpointDiscovery.discoverWithPlaywright()` — uses Playwright to navigate stock page, capture real XHR/fetch JSON responses
- Classifies endpoints into layers: profile, price, technicals, fundamentals, financial_tables, ownership, corporate_actions, screener_signals
- Writes discovery results to `.tmp/stockedge-discovery.json` (not committed)

## Extractor result
- `StockEdgeExtractor` orchestrates full extraction plan per symbol
- `StockEdgeIngestionJob.runForSymbol()` — lightweight per-symbol ingestion
- Records extraction runs and canonical snapshots in `StockEdgeExtractionRunStore`
- Never stores raw payloads after mapping

## Canonical mapping result
- `StockEdgeMapper` — maps raw JSON to typed canonical snapshots (8 layers)
- `StockEdgePredictionBridge` — bridges canonical data into Prediction Engine V2 input format
- Missing data stays null/undefined (no zero-filling, no NaN)
- Financial row key normalization (Sales→revenue, PAT→net_profit, etc.)

## Premium scanner result
- `scanCatalogue.ts` — 5 free scans + 15 premium scans across 10 categories
- ScannerPage updated with Free/Premium tab bar
- Premium scans show lock icon, navigate to pricing page

## Pricing result
- `PricingPage.tsx` — ₹0/₹99/month/₹999/year cards
- Premium coming soon / Join waitlist (no fake payment)
- Compliance-safe copy

## Stock detail rebuild result
- `StockStoryPageF0.tsx` — 8-section layout:
  1. Stock identity
  2. Price block
  3. Price chart
  4. Healthometer
  5. Analysis meters
  6. Financial histogram
  7. News intelligence
  8. Thesis/review/peers
- Type errors fixed, all typechecks pass

## Healthometer result
- `HealthometerPanel.tsx` — dimension scores 0–100, handles partial state
- No NaN/null/undefined rendering
- Loading and empty states handled

## Financial histogram result
- `FinancialHistogram.tsx` — 7 metric tabs (Revenue, PAT, EBITDA, Operating Profit, EPS, Margins)
- SVG bar chart with gradient fills
- Handles partial data gracefully

## News TTL result
- `StockNewsService.ts` — 12-hour cache TTL, returns empty safe shell
- `StockNewsPanel.tsx` — news list with empty state, time-ago labels
- No fake news

## Mobile polish result
- Compact dimension bars in Healthometer
- Financial tabs horizontally scrollable on mobile
- Tap targets ≥44px
- No horizontal scroll

## Tests added
- `StockEdgePlaywrightAuth.test.ts` — config, credential validation, endpoint classification
- `StockEdgeExtractionRunStore.test.ts` — run recording, snapshot TTL, limits, clear
- All existing StockEdge tests preserved

## Screenshots captured
Screenshots stored in `.tmp/part-cs-stockedge-wrapper-product-finish/` (not committed)

## Verification results
- `typecheck:all` — PASS
- `lint` — PASS
- `test:unit` — 1542 passed (164 test files)
- `validate:hygiene` — PASS
- `build:frontend` — PASS
- `build:backend` — PASS
- `test:e2e` — 46 passed, 4 failed (pre-existing signup/routing failures, unrelated)

## Blockers
- StockEdge HTTP form login requires real StockEdge account credentials in Railway env vars to work
- Playwright login requires `STOCKEDGE_PLAYWRIGHT_ENABLED=true` and Playwright browsers installed
- Playwright endpoint discovery requires same prerequisites

## Compliance
- No fake data
- No secrets committed
- No raw payloads committed
- No DNS changes
- No branch/PR
- No public Buy/Sell/Hold/price target language
- No StockEdge/provider wording in public UI
- No backend diagnostics exposed to normal users
- No cookies/sessions exposed to frontend
