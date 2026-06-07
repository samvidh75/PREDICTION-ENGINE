# TRACK-34 AGENT-4: Fundamental Data Backfill
**Generated:** 2026-06-06T18:39:26.581Z

## Target
Populate `financial_snapshots` with fundamental ratios for all symbols.

## Fields Required

| Field | Source (Tier 1) | Source (Fallback) |
|-------|-----------------|-------------------|
| PE Ratio | Upstox | Yahoo |
| PB Ratio | Upstox | Yahoo |
| ROE | Upstox | Screener |
| ROIC | Upstox | - |
| ROA | Upstox | - |
| Revenue Growth | Screener | Finnhub |
| EPS Growth | Screener | Finnhub |
| Debt to Equity | Upstox | Screener |
| Market Cap | Screener | Yahoo |
| Operating Margin | Screener | Yahoo |
| Current Ratio | Screener | - |
| Dividend Yield | Screener | Yahoo |

## Provider Merge Architecture

The `ProviderCoordinator.invokeFinancialsMerge()` method implements a tiered merge:
1. Upstox populates primary ratios FIRST
2. Screener enriches missing growth/margin fields
3. Finnhub/Yahoo fill remaining gaps
4. **No provider can overwrite a value set by a higher-tier provider**

## Verdict

**INSUFFICIENT EVIDENCE** — Requires Upstox API token, Finnhub API key, and running PostgreSQL. The merge pipeline is fully coded but cannot execute.

## Required Actions
1. Configure `UPSTOX_ACCESS_TOKEN` in `.env`
2. Configure `FINNHUB_API_KEY` in `.env`
3. Start PostgreSQL
4. Run `npx tsx src/scripts/populate-real-universe.ts`
