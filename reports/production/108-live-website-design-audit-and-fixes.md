# Part DY — Live Website Design Audit and Fixes

## Baseline

- **Current commit:** `bf4961020`
- **Live domain:** `https://www.stockstory-india.com`
- **Part DW confirmed:** yes — `1485a30ec`
- **Part DX confirmed:** yes — `5ab15ddb8`

## Live Flaws Found and Fixed

| Route | Flaw | Severity | Fix |
|-------|------|----------|-----|
| All | "Source:" label visible on stock page price context | P1 - public copy leakage | Removed line entirely |
| Stock page | "Quote timestamp unavailable" when no quote | P2 - poor UX copy | Changed to "Price context being refreshed" |
| Stock page | "Source: verified daily close / live market feed" visible | P1 - public copy leakage | Removed provider-adjacent wording |
| Scanner | Scanner cards use `bg-white` (light theme on dark graphite background) | P1 - visual inconsistency | Changed to `bg-[var(--color-surface)]` |
| Scanner | Score badge uses `bg-slate-50` | P2 - visual inconsistency | Changed to `bg-[var(--color-surface-2)]` |
| Scanner | Sector badge uses `bg-slate-100` | P2 - visual inconsistency | Changed to `bg-[var(--color-surface-2)]` |
| Stock page | Section nav uses `bg-white/95` | P1 - visual inconsistency | Changed to `bg-[var(--color-surface)]/95` |
| Stock page | Nav hover uses `hover:bg-slate-50` | P2 - visual inconsistency | Changed to `hover:bg-[var(--color-surface-2)]` |
| Stock page | "Market data may be delayed" banner uses amber light | P2 - visual inconsistency | Changed to graphite surface with muted text |

## Code Changes

- `src/pages/StockStoryPageF0.tsx`: Removed `Source:` line, fixed "Quote unavailable" text, fixed nav/section colors, fixed market data banner
- `src/components/scanner/ScannerPage.tsx`: Fixed card background, score badge, sector badge to use surface tokens

## Verification

| Gate | Result |
|------|--------|
| typecheck:frontend | PASS |
| build:frontend | PASS (3.78s) |
| public-copy audit | PASS (0 issues) |
| Production smoke | PASS (9/9 routes 200) |
| Scanner | 5 results, 0 dupes, 0 nulls |
| Search | RELIANCE → Reliance Industries Ltd (#1) |

## Production Screenshots

Before: `.tmp/part-dy-live-before/home-1440x900.png`
After: `.tmp/part-dy-live-after-production/stock-reliance-1440x900.png`

## Remaining non-blockers

- Minor polish items: stock page right rail could be cleaner, scanner card density could be improved on tablet
- No critical compliance or UX issues remain
