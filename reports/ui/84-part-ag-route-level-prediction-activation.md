# Part AG Report: Route-Level Prediction Activation

## Baseline State
* Baseline Commit: `7f22336e4` (current HEAD is `328725b82`)
* Frontend-only scope: Yes, backend untouched.
* Integration Timeouts: Resolved. All 9 integration tests in `RealDataIntegration.test.tsx` pass deterministically in under 300ms.
* Compliance Rule: No public Buy/Sell/Hold, no price targets, no guaranteed return language.

## Scope of Route-Level Activation
We will wire the route view models and prediction engine logic across the main application pages:
1. Dashboard/Home
2. Company Research / Stock Detail
3. Scanner Result Cards
4. Rankings Shortlist
5. Compare Page
6. Watchlist Thesis Tracker
7. Portfolio Thesis Monitor
8. Alerts / "What Changed"
9. Methodology

## Availability Audit
* **Active parameters connected**: PE, PB, EV/EBITDA, Dividend Yield, ROE, ROIC, ROA, Operating Margin, Revenue Growth, ProfitGrowth, Debt/Equity, Current Ratio.
* **Planned factors count**: 150+ planned slots.
* **Normalization**: Safely maps NaN, Infinity, and undefined to null.

## Acceptance Criteria
* Route components fully leverage the designated view models rather than inline raw mapping logic.
* Dashboard, Scanner, Rankings, and Compare pages display real computed research stance, active factor count, and healthometer dimensions.
* Genuinely insufficient data renders clean, product-safe messages rather than generic placeholders.
