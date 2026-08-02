# nselib Provider — Archived Evaluation

**Status**: Archived — not active in production
**Decision date**: 2026-06-18
**Commit Hash**: 2cde6d5a (baseline), finalized in stabilization commit

## Executive Summary

nselib was evaluated across versions 0.2 through 2.5.1 and found to provide **no usable data-fetching domains** in the StockStory India runtime context. Despite being importable on Python 3.10+, every tested domain (quote, bhavcopy, index data, financial results, corporate actions, price-volume) returned empty results, NSE-blocked responses, or unusable data when called from Railway.

## What Was Tested

| Domain | nselib Function | Result | Evidence |
|--------|----------------|--------|----------|
| Import | `import nselib` | Importable (Python 3.10+) | Probe confirms import works |
| Equity list | `capital_market.equity_list()` | Returns data but not usable for scoring universe | Probe confirmed |
| Index constituents | `indices.nifty_indices_constituents()` | Returns data but NSEPython provides same | Probe confirmed |
| Bhavcopy | `capital_market.bhav_copy_equities()` | Requires specific date format, inconsistent | Tested across multiple dates |
| Financial results | `capital_market.financial_results_for_equity()` | NSE blocks server-side | Consistent failure |
| Price-volume | `capital_market.price_volume_data()` | NSE blocks server-side | Consistent failure |
| Corporate actions | `capital_market.corporate_actions_for_equity()` | NSE blocks server-side | Consistent failure |
| Live quotes | None | Not supported by nselib | API does not exist |
| Historical OHLCV | None | Not supported by nselib | API does not exist |

## Why It's Archived

1. **No quote provider**: nselib has no live quote API
2. **No historical OHLCV**: nselib has no historical price API
3. **Bhavcopy inconsistent**: jugaad-data provides more reliable bhavcopy
4. **Index data redundant**: NSEPython provides the same index data
5. **Financial results blocked**: NSE blocks server-side financial results endpoint
6. **Python 3.10+ requirement**: Doesn't work on Python 3.9 (local dev)

## Recommendation

nselib is **not active** in the production provider matrix. It remains in this archived documentation only as evidence of evaluation. All functions that nselib might have provided are covered by other providers:

- Bhavcopy: Jugaad-Data / NSEPython
- Index: NSEPython / Jugaad-Data
- Equity list: NSEPython / instrument map
- Fundamentals: CSV import / manual filings

## Related Documents

- [Final Provider Architecture](./final-provider-architecture.md)
- [Jugaad-Data Provider](./jugaad-data-provider.md)
- [NSEPython Provider](./nsepython-provider.md)
- [Fundamentals Import](./fundamentals-import.md)
- [Report: Provider Architecture Stabilization](../../reports/data-pipeline/32-final-provider-architecture-and-runtime-stabilization.md)
