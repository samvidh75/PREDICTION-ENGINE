# Part DY — Live Website Design Audit and Fixes

## Baseline

- **Current commit:** `1db9a644f`
- **Live domain:** `https://www.stockstory-india.com`
- **Part DW confirmed:** yes — `1485a30ec`
- **Part DX confirmed:** yes — `5ab15ddb8`

## Live Flaws Found and Fixed

| Route | Flaw | Severity | Fix |
|-------|------|----------|-----|
| All | "Source:" label visible on stock page price context | P1 - public copy leakage | Removed line entirely |
| Stock page | "Quote timestamp unavailable" when no quote | P2 - poor UX copy | Changed to "Price context being refreshed" |
| Stock page | "Source: verified daily close / live market feed" visible | P1 - public copy leakage | Removed provider-adjacent wording |

## Code Changes

- `src/pages/StockStoryPageF0.tsx`: Removed `Source:` line from stock header timestamp display
- `src/pages/StockStoryPageF0.tsx`: Changed "Quote timestamp unavailable" to "Price context being refreshed"

## Verification

| Gate | Result |
|------|--------|
| typecheck:frontend | PASS |
| build:frontend | PASS (2.94s) |
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
