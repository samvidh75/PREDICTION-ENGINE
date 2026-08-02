# Part AE: Visual Clarity, Rankings Dedupe, Typography and Contrast Rebuild

## Baseline

**Baseline Commit:** 7f22336e4
**Current HEAD:** 7f22336e4

**Frontend-Only Scope:** Yes — no backend touched.

**Backend Untouched Rule:** Strictly observed.

## Screenshot Defects (from live UI)

1. **Rankings page repeats same stock symbols** — ITC, MARUTI, ADANIPORTS, ASIANPAINT appear multiple times.
2. **Symbol and Company columns duplicate** — same text in both columns when `companyName` matches `symbol`.
3. **Cramped layout** — action buttons packed into one line, row height too tight.
4. **Harsh borders/shadows** — neon glow, strong shadows on panels.
5. **Font sizing/contrast** — text too small, low-contrast muted text.
6. **Excessive uppercase tracking** — cramped all-caps labels.
7. **Cluttered mobile cards** — too many similarly styled buttons.

## Routes/Components Audited

- `src/pages/PublicRankingsPage.tsx` — rankings main component
- `src/components/scanner/ScannerPage.tsx` — scanner result cards
- `src/pages/StockStoryPageF0.tsx` — stock detail identity
- `src/components/company/StockWorkspaceBar.tsx` — workspace bar
- `src/components/company/CompanyMethodologyAndRegistry.tsx` — methodology panel
- `src/pages/StockStoryPage.tsx` — stock detail research panels
- `src/pages/ComparePage.tsx` — compare route
- `src/pages/WatchlistPage.tsx` — watchlist route
- `src/pages/PortfolioPage.tsx` — portfolio route
- `src/pages/AlertsPage.tsx` — alerts route
- `src/components/dashboard/DashboardHub.tsx` — dashboard

## Dedupe Strategy

1. Normalize symbol by `trim().toUpperCase()`.
2. Use a Map to collapse duplicates.
3. Among duplicates, keep the row with the highest real (finite) score.
4. If no row has a real score, keep the first occurrence.
5. After dedupe, reassign display rank (1-indexed).
6. The deduped set is passed to the rankings page renderer.

No backend changes, no fake data, no invented company names.

## Typography/Contrast Strategy

- Remove harsh shadows, neon glows, overly bright borders.
- Use subtle surface elevation via borders instead of shadows.
- Standardize primary text at 14px, secondary at 12px.
- Use tabular numerals for all financial metrics.
- Avoid excessive uppercase tracking outside table headers.
- Standardize button height at 32px for secondary, 40px for primary.
- Fix low-contrast muted text by bumping opacity from 40% to 60-70%.

## Acceptance Criteria

1. Rankings never show the same normalized symbol more than once.
2. Duplicate Symbol/Company text is not rendered twice in same identity row.
3. Rankings row height is comfortable (60-72px).
4. Action buttons do not look cramped.
5. No harsh neon/glow/shadow effects on user-facing product pages.
6. Text contrast is readable (secondary text at least #64748B).
7. No bare "N/A" in user-facing product routes.
8. No "Pending" dominating table rows.
9. Stock detail primary header does not duplicate company name.
10. All tests pass, including new dedupe tests.
