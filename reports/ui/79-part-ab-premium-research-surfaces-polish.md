# Part AB: Premium Research Surfaces Polish

## Baseline Information

**Baseline Commit:** 027cb212a (Part AA)
**Current HEAD:** 41458ea9f ("Rebuild premium research workflow interface")

**Frontend-Only Scope:** Yes — no backend routes, providers, schema, or migrations modified.

**Backend Untouched Rule:** Strictly observed.

## Remaining Surfaces from Part AA

Part AA created the foundation but left these surfaces unfinished:
1. Scanner discovery workspace — result card quality, preset chips
2. Rankings shortlist — interface polish
3. Company research workspace — layout hierarchy
4. Compare decision workspace — empty/partial state quality
5. Watchlist thesis tracker — monitoring surface polish
6. Portfolio thesis monitor — review prompt quality
7. Alerts / What Changed shell — monitoring categories
8. Dashboard research cockpit — Prediction Engine / Healthometer polish
9. Typography/font system — consistency
10. Component density/spacing — no card soup
11. Dark theme hardening — no white/off-theme surfaces
12. Duplicate stock/company name rendering
13. N/A states — Prediction Engine, Healthometer

## Visual Defects to Fix

1. White/off-theme surfaces in product routes
2. Duplicate stock/company name rendering
3. N/A or lazy placeholders in Prediction Engine and Healthometer
4. Weak spacing and inconsistent density
5. Card soup and excessive badges
6. Debug-looking tables
7. Broken mobile stacking
8. Inconsistent button styles
9. Low-contrast text
10. Oversized empty panels

## Routes

- dashboard/home
- scanner
- rankings
- company research / stock detail
- compare
- watchlist
- portfolio
- alerts
- methodology

## Compliance Rules

- **No fake data:** No fake market numbers, alert counts, portfolio values, holdings, P&L, broker integrations, or order placement.
- **No backend leakage:** No normal user-facing route may expose backend plumbing, provider wording, API references, source metadata, or diagnostics.
- **No public Buy/Sell/Hold:** No Buy/Sell/Hold recommendations, price targets, guaranteed returns, "sure shot," or "multibagger."

## Acceptance Criteria

1. All product surfaces use dark graphite theme — no white/off-theme cards
2. Company name appears once at top level — no duplicate rendering
3. Prediction Engine and Healthometer never show bare N/A
4. Scanner renders preset chips with premium result cards
5. Rankings uses research-shortlist language
6. Compare handles empty and partial data safely
7. Watchlist shows thesis-tracking language
8. Portfolio avoids fake P&L/holdings/broker sync
9. Alerts shell does not fake active alerts
10. Typography uses consistent spacing and density
11. Mobile view at 390px has no horizontal overflow
12. No forbidden backend/provider copy
13. No Buy/Sell/Hold in user-facing routes
14. No price targets in user-facing routes
